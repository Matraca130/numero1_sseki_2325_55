// ============================================================
// quizQuestionsApi.test.ts — CRUD for /quiz-questions
//
// Covers:
//   - getQuizQuestions: URL construction, filters, difficulty
//     normalization, pagination
//   - getQuizQuestion: single fetch
//   - createQuizQuestion, updateQuizQuestion: POST/PUT payloads
//   - deleteQuizQuestion (soft), restoreQuizQuestion
//
// Table map reminder:
//   quiz_questions is the ONLY quiz table with block_id. Per-block
//   filtering MUST go through quiz_questions.block_id. The quizzes
//   entity table does not expose block_id.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/app/lib/api', () => ({
  apiCall: vi.fn(),
}));

import { apiCall } from '@/app/lib/api';
import {
  getQuizQuestions,
  getQuizQuestion,
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
  restoreQuizQuestion,
} from '../quizQuestionsApi';

const mockApiCall = vi.mocked(apiCall);

// ── Fixtures ─────────────────────────────────────────────

const baseListResponse = {
  items: [],
  total: 0,
  limit: 100,
  offset: 0,
};

const sampleQuestion = {
  id: 'qq-1',
  summary_id: 'sum-1',
  keyword_id: 'kw-1',
  block_id: 'blk-1',
  subtopic_id: null,
  question_type: 'mcq' as const,
  question: 'What is 2+2?',
  options: ['3', '4', '5', '6'],
  correct_answer: '4',
  explanation: 'basic arithmetic',
  difficulty: 1,
  source: 'manual' as const,
  is_active: true,
  created_by: 'user-1',
  created_at: '2026-04-18T12:00:00.000Z',
  updated_at: '2026-04-18T12:00:00.000Z',
};

// ── Tests ────────────────────────────────────────────────

describe('quizQuestionsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════
  // getQuizQuestions
  // ══════════════════════════════════════════════════════

  describe('getQuizQuestions', () => {
    it('builds a flat /quiz-questions URL with summary_id query param', async () => {
      mockApiCall.mockResolvedValueOnce(baseListResponse);
      await getQuizQuestions('sum-1');

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toMatch(/^\/quiz-questions\?/);
      expect(url).toContain('summary_id=sum-1');
      expect(url).not.toMatch(/\/summaries\//);
    });

    it('appends keyword_id filter when provided', async () => {
      mockApiCall.mockResolvedValueOnce(baseListResponse);
      await getQuizQuestions('sum-1', { keyword_id: 'kw-9' });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('keyword_id=kw-9');
    });

    it('appends block_id filter for per-block quiz scoping (ADR-001)', async () => {
      mockApiCall.mockResolvedValueOnce(baseListResponse);
      await getQuizQuestions('sum-1', { block_id: 'blk-42' });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('block_id=blk-42');
    });

    it('appends question_type filter when provided', async () => {
      mockApiCall.mockResolvedValueOnce(baseListResponse);
      await getQuizQuestions('sum-1', { question_type: 'true_false' });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('question_type=true_false');
    });

    it('appends quiz_id filter when provided', async () => {
      mockApiCall.mockResolvedValueOnce(baseListResponse);
      await getQuizQuestions('sum-1', { quiz_id: 'quiz-xyz' });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('quiz_id=quiz-xyz');
    });

    it('normalizes string difficulty → integer (easy → 1)', async () => {
      mockApiCall.mockResolvedValueOnce(baseListResponse);
      await getQuizQuestions('sum-1', { difficulty: 'easy' });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('difficulty=1');
      expect(url).not.toContain('difficulty=easy');
    });

    it('normalizes string difficulty → integer (medium → 2)', async () => {
      mockApiCall.mockResolvedValueOnce(baseListResponse);
      await getQuizQuestions('sum-1', { difficulty: 'medium' });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('difficulty=2');
    });

    it('normalizes string difficulty → integer (hard → 3)', async () => {
      mockApiCall.mockResolvedValueOnce(baseListResponse);
      await getQuizQuestions('sum-1', { difficulty: 'hard' });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('difficulty=3');
    });

    it('passes integer difficulty through as-is', async () => {
      mockApiCall.mockResolvedValueOnce(baseListResponse);
      await getQuizQuestions('sum-1', { difficulty: 2 });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('difficulty=2');
    });

    it('appends limit/offset for pagination', async () => {
      mockApiCall.mockResolvedValueOnce({ ...baseListResponse, limit: 25, offset: 50 });
      await getQuizQuestions('sum-1', { limit: 25, offset: 50 });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('limit=25');
      expect(url).toContain('offset=50');
    });

    it('combines multiple filters in one request', async () => {
      mockApiCall.mockResolvedValueOnce(baseListResponse);
      await getQuizQuestions('sum-1', {
        keyword_id: 'kw-1',
        block_id: 'blk-1',
        question_type: 'mcq',
        difficulty: 3,
        quiz_id: 'quiz-1',
        limit: 10,
        offset: 0,
      });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('summary_id=sum-1');
      expect(url).toContain('keyword_id=kw-1');
      expect(url).toContain('block_id=blk-1');
      expect(url).toContain('question_type=mcq');
      expect(url).toContain('difficulty=3');
      expect(url).toContain('quiz_id=quiz-1');
      expect(url).toContain('limit=10');
      // offset=0 is falsy and is intentionally NOT appended by the
      // current implementation. This is the observed behaviour.
      expect(url).not.toContain('offset=0');
    });

    it('returns the list response from apiCall', async () => {
      const full = {
        items: [sampleQuestion],
        total: 1,
        limit: 100,
        offset: 0,
      };
      mockApiCall.mockResolvedValueOnce(full);

      const out = await getQuizQuestions('sum-1');
      expect(out).toEqual(full);
    });

    it('propagates errors from apiCall', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('500 Server Error'));
      await expect(getQuizQuestions('sum-1')).rejects.toThrow('500 Server Error');
    });
  });

  // ══════════════════════════════════════════════════════
  // getQuizQuestion
  // ══════════════════════════════════════════════════════

  describe('getQuizQuestion', () => {
    it('fetches by id at /quiz-questions/:id', async () => {
      mockApiCall.mockResolvedValueOnce(sampleQuestion);
      await getQuizQuestion('qq-1');

      expect(mockApiCall).toHaveBeenCalledWith('/quiz-questions/qq-1');
    });

    it('returns the question from the server', async () => {
      mockApiCall.mockResolvedValueOnce(sampleQuestion);
      const out = await getQuizQuestion('qq-1');
      expect(out).toEqual(sampleQuestion);
    });
  });

  // ══════════════════════════════════════════════════════
  // createQuizQuestion
  // ══════════════════════════════════════════════════════

  describe('createQuizQuestion', () => {
    it('POSTs to /quiz-questions with a JSON body', async () => {
      const payload = {
        summary_id: 'sum-1',
        keyword_id: 'kw-1',
        question_type: 'mcq' as const,
        question: 'What?',
        correct_answer: 'A',
        options: ['A', 'B'],
      };
      mockApiCall.mockResolvedValueOnce({ ...sampleQuestion, ...payload });

      await createQuizQuestion(payload);

      expect(mockApiCall).toHaveBeenCalledWith('/quiz-questions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    });

    it('includes block_id in the payload when provided (per-block link)', async () => {
      const payload = {
        summary_id: 'sum-1',
        block_id: 'blk-99',
        question_type: 'mcq' as const,
        question: 'Q',
        correct_answer: 'A',
        options: ['A', 'B', 'C', 'D'],
      };
      mockApiCall.mockResolvedValueOnce({ ...sampleQuestion, ...payload });

      await createQuizQuestion(payload);

      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body.block_id).toBe('blk-99');
    });

    it('supports AI-source questions', async () => {
      const payload = {
        summary_id: 'sum-1',
        keyword_id: 'kw-1',
        question_type: 'open' as const,
        question: 'Describe X',
        correct_answer: 'answer',
        source: 'ai' as const,
      };
      mockApiCall.mockResolvedValueOnce({ ...sampleQuestion, ...payload });

      await createQuizQuestion(payload);

      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body.source).toBe('ai');
    });

    it('does NOT inject student_id or created_by (server derives them)', async () => {
      const payload = {
        summary_id: 'sum-1',
        question_type: 'mcq' as const,
        question: 'Q',
        correct_answer: 'A',
      };
      mockApiCall.mockResolvedValueOnce({ ...sampleQuestion, ...payload });

      await createQuizQuestion(payload);

      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body).not.toHaveProperty('student_id');
      expect(body).not.toHaveProperty('created_by');
    });

    it('propagates API errors', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('422 Unprocessable'));
      await expect(
        createQuizQuestion({
          summary_id: 'sum-1',
          question_type: 'mcq',
          question: 'Q',
          correct_answer: 'A',
        })
      ).rejects.toThrow('422 Unprocessable');
    });
  });

  // ══════════════════════════════════════════════════════
  // updateQuizQuestion
  // ══════════════════════════════════════════════════════

  describe('updateQuizQuestion', () => {
    it('PUTs to /quiz-questions/:id with a JSON body', async () => {
      mockApiCall.mockResolvedValueOnce(sampleQuestion);
      await updateQuizQuestion('qq-1', { question: 'Edited?' });

      expect(mockApiCall).toHaveBeenCalledWith('/quiz-questions/qq-1', {
        method: 'PUT',
        body: JSON.stringify({ question: 'Edited?' }),
      });
    });

    it('can toggle is_active', async () => {
      mockApiCall.mockResolvedValueOnce({ ...sampleQuestion, is_active: false });
      await updateQuizQuestion('qq-1', { is_active: false });

      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body.is_active).toBe(false);
    });

    it('accepts quiz_id and subtopic_id (BA-05 update fields)', async () => {
      mockApiCall.mockResolvedValueOnce(sampleQuestion);
      await updateQuizQuestion('qq-1', { quiz_id: 'new-quiz', subtopic_id: 'sub-1' });

      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body.quiz_id).toBe('new-quiz');
      expect(body.subtopic_id).toBe('sub-1');
    });

    it('accepts options: null to clear MCQ options', async () => {
      mockApiCall.mockResolvedValueOnce({ ...sampleQuestion, options: null });
      await updateQuizQuestion('qq-1', { options: null });

      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body.options).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════
  // deleteQuizQuestion
  // ══════════════════════════════════════════════════════

  describe('deleteQuizQuestion', () => {
    it('issues DELETE /quiz-questions/:id', async () => {
      mockApiCall.mockResolvedValueOnce(undefined);
      await deleteQuizQuestion('qq-1');

      expect(mockApiCall).toHaveBeenCalledWith('/quiz-questions/qq-1', { method: 'DELETE' });
    });

    it('resolves to undefined (soft-delete, no body returned)', async () => {
      mockApiCall.mockResolvedValueOnce(undefined);
      const out = await deleteQuizQuestion('qq-1');
      expect(out).toBeUndefined();
    });

    it('propagates 404 errors', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('404 Not Found'));
      await expect(deleteQuizQuestion('missing')).rejects.toThrow('404 Not Found');
    });
  });

  // ══════════════════════════════════════════════════════
  // restoreQuizQuestion
  // ══════════════════════════════════════════════════════

  describe('restoreQuizQuestion', () => {
    it('issues PUT /quiz-questions/:id/restore', async () => {
      mockApiCall.mockResolvedValueOnce(sampleQuestion);
      await restoreQuizQuestion('qq-1');

      expect(mockApiCall).toHaveBeenCalledWith('/quiz-questions/qq-1/restore', {
        method: 'PUT',
      });
    });

    it('returns the restored question', async () => {
      mockApiCall.mockResolvedValueOnce(sampleQuestion);
      const out = await restoreQuizQuestion('qq-1');
      expect(out).toEqual(sampleQuestion);
    });
  });
});
