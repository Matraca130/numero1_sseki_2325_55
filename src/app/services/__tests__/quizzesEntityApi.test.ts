// ============================================================
// quizzesEntityApi.test.ts — CRUD for /quizzes entity (container)
//
// The `quizzes` table is a container/grouper (title + optional
// time_limit_seconds). Per-block scoping is done at the
// `quiz_questions.block_id` level, NOT here.
//
// Covers:
//   - getQuizzes: URL construction, filters, pagination
//   - createQuiz: POST payload shape
//   - updateQuiz: PUT payload (title, description, is_active,
//     time_limit_seconds)
//   - deleteQuiz (soft) / restoreQuiz
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/app/lib/api', () => ({
  apiCall: vi.fn(),
}));

import { apiCall } from '@/app/lib/api';
import {
  getQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  restoreQuiz,
} from '../quizzesEntityApi';

const mockApiCall = vi.mocked(apiCall);

// ── Fixtures ─────────────────────────────────────────────

const baseListResponse = {
  items: [],
  total: 0,
  limit: 100,
  offset: 0,
};

const sampleQuiz = {
  id: 'quiz-1',
  summary_id: 'sum-1',
  title: 'Sample Quiz',
  description: 'A quiz for testing',
  source: 'manual' as const,
  is_active: true,
  block_id: null,
  time_limit_seconds: 30,
  created_by: 'user-1',
  created_at: '2026-04-18T12:00:00.000Z',
  updated_at: '2026-04-18T12:00:00.000Z',
};

// ── Tests ────────────────────────────────────────────────

describe('quizzesEntityApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════
  // getQuizzes
  // ══════════════════════════════════════════════════════

  describe('getQuizzes', () => {
    it('builds a flat /quizzes URL with summary_id query param', async () => {
      mockApiCall.mockResolvedValueOnce(baseListResponse);
      await getQuizzes('sum-1');

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toMatch(/^\/quizzes\?/);
      expect(url).toContain('summary_id=sum-1');
      expect(url).not.toMatch(/\/summaries\//);
    });

    it('does NOT expose block_id at the quiz entity level (table map)', async () => {
      // The `quizzes` table has no block_id column. Even if a caller
      // tried to pass one, the API signature should not accept it.
      mockApiCall.mockResolvedValueOnce(baseListResponse);
      await getQuizzes('sum-1', { source: 'manual' });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).not.toContain('block_id=');
    });

    it('appends source filter when provided', async () => {
      mockApiCall.mockResolvedValueOnce(baseListResponse);
      await getQuizzes('sum-1', { source: 'ai' });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('source=ai');
    });

    it('appends is_active=true when provided', async () => {
      mockApiCall.mockResolvedValueOnce(baseListResponse);
      await getQuizzes('sum-1', { is_active: true });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('is_active=true');
    });

    it('appends is_active=false when provided (distinguishes from undefined)', async () => {
      mockApiCall.mockResolvedValueOnce(baseListResponse);
      await getQuizzes('sum-1', { is_active: false });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('is_active=false');
    });

    it('does NOT append is_active when filter is undefined', async () => {
      mockApiCall.mockResolvedValueOnce(baseListResponse);
      await getQuizzes('sum-1', { source: 'manual' });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).not.toContain('is_active=');
    });

    it('appends limit/offset for pagination', async () => {
      mockApiCall.mockResolvedValueOnce({ ...baseListResponse, limit: 5, offset: 10 });
      await getQuizzes('sum-1', { limit: 5, offset: 10 });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('limit=5');
      expect(url).toContain('offset=10');
    });

    it('returns the list response from apiCall', async () => {
      const full = {
        items: [sampleQuiz],
        total: 1,
        limit: 100,
        offset: 0,
      };
      mockApiCall.mockResolvedValueOnce(full);

      const out = await getQuizzes('sum-1');
      expect(out).toEqual(full);
    });

    it('propagates errors from apiCall', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('Timeout'));
      await expect(getQuizzes('sum-1')).rejects.toThrow('Timeout');
    });
  });

  // ══════════════════════════════════════════════════════
  // createQuiz
  // ══════════════════════════════════════════════════════

  describe('createQuiz', () => {
    it('POSTs to /quizzes with JSON body', async () => {
      const payload = {
        summary_id: 'sum-1',
        title: 'My Quiz',
        source: 'manual' as const,
      };
      mockApiCall.mockResolvedValueOnce({ ...sampleQuiz, ...payload });

      await createQuiz(payload);

      expect(mockApiCall).toHaveBeenCalledWith('/quizzes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    });

    it('supports description and time_limit_seconds', async () => {
      const payload = {
        summary_id: 'sum-1',
        title: 'Timed Quiz',
        description: 'With a per-question time limit',
        source: 'manual' as const,
        time_limit_seconds: 60,
      };
      mockApiCall.mockResolvedValueOnce({ ...sampleQuiz, ...payload });

      await createQuiz(payload);

      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body.description).toBe('With a per-question time limit');
      expect(body.time_limit_seconds).toBe(60);
    });

    it('accepts source: "ai"', async () => {
      const payload = {
        summary_id: 'sum-1',
        title: 'AI Quiz',
        source: 'ai' as const,
      };
      mockApiCall.mockResolvedValueOnce({ ...sampleQuiz, ...payload });

      await createQuiz(payload);

      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body.source).toBe('ai');
    });

    it('allows null time_limit_seconds (no limit)', async () => {
      const payload = {
        summary_id: 'sum-1',
        title: 'Unlimited Quiz',
        source: 'manual' as const,
        time_limit_seconds: null,
      };
      mockApiCall.mockResolvedValueOnce({ ...sampleQuiz, ...payload, time_limit_seconds: null });

      await createQuiz(payload);

      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body.time_limit_seconds).toBeNull();
    });

    it('does NOT inject created_by (server derives from token)', async () => {
      mockApiCall.mockResolvedValueOnce(sampleQuiz);
      await createQuiz({
        summary_id: 'sum-1',
        title: 'Q',
        source: 'manual',
      });

      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body).not.toHaveProperty('created_by');
      expect(body).not.toHaveProperty('student_id');
    });

    it('propagates validation errors', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('400 Missing title'));
      await expect(
        createQuiz({ summary_id: 'sum-1', title: '', source: 'manual' })
      ).rejects.toThrow('400 Missing title');
    });
  });

  // ══════════════════════════════════════════════════════
  // updateQuiz
  // ══════════════════════════════════════════════════════

  describe('updateQuiz', () => {
    it('PUTs to /quizzes/:id with partial JSON body', async () => {
      mockApiCall.mockResolvedValueOnce(sampleQuiz);
      await updateQuiz('quiz-1', { title: 'Renamed' });

      expect(mockApiCall).toHaveBeenCalledWith('/quizzes/quiz-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Renamed' }),
      });
    });

    it('supports toggling is_active', async () => {
      mockApiCall.mockResolvedValueOnce({ ...sampleQuiz, is_active: false });
      await updateQuiz('quiz-1', { is_active: false });

      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body.is_active).toBe(false);
    });

    it('supports updating time_limit_seconds', async () => {
      mockApiCall.mockResolvedValueOnce({ ...sampleQuiz, time_limit_seconds: 120 });
      await updateQuiz('quiz-1', { time_limit_seconds: 120 });

      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body.time_limit_seconds).toBe(120);
    });

    it('supports clearing description to null', async () => {
      mockApiCall.mockResolvedValueOnce({ ...sampleQuiz, description: null });
      await updateQuiz('quiz-1', { description: null });

      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body.description).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════
  // deleteQuiz
  // ══════════════════════════════════════════════════════

  describe('deleteQuiz', () => {
    it('issues DELETE /quizzes/:id', async () => {
      mockApiCall.mockResolvedValueOnce(undefined);
      await deleteQuiz('quiz-1');

      expect(mockApiCall).toHaveBeenCalledWith('/quizzes/quiz-1', { method: 'DELETE' });
    });

    it('resolves to undefined (soft-delete)', async () => {
      mockApiCall.mockResolvedValueOnce(undefined);
      const out = await deleteQuiz('quiz-1');
      expect(out).toBeUndefined();
    });
  });

  // ══════════════════════════════════════════════════════
  // restoreQuiz
  // ══════════════════════════════════════════════════════

  describe('restoreQuiz', () => {
    it('issues PUT /quizzes/:id/restore', async () => {
      mockApiCall.mockResolvedValueOnce(sampleQuiz);
      await restoreQuiz('quiz-1');

      expect(mockApiCall).toHaveBeenCalledWith('/quizzes/quiz-1/restore', {
        method: 'PUT',
      });
    });

    it('returns the restored quiz', async () => {
      mockApiCall.mockResolvedValueOnce(sampleQuiz);
      const out = await restoreQuiz('quiz-1');
      expect(out).toEqual(sampleQuiz);
    });
  });
});
