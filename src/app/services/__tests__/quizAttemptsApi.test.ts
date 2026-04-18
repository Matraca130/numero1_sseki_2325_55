// ============================================================
// quizAttemptsApi.test.ts — POST/GET /quiz-attempts
//
// Covers:
//   - createQuizAttempt: POST with JSON body, optional fields
//   - getQuizAttempts: URL query construction, filters, edge cases
//
// Mocks @/app/lib/api apiCall; checks URL, method, body.
//
// Table map reminder:
//   quiz_attempts stores each student answer. It references
//   quiz_question_id and study_sessions.session_id. It does NOT
//   hold block_id — block_id only lives on quiz_questions.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/app/lib/api', () => ({
  apiCall: vi.fn(),
}));

import { apiCall } from '@/app/lib/api';
import { createQuizAttempt, getQuizAttempts } from '../quizAttemptsApi';

const mockApiCall = vi.mocked(apiCall);

// ── Fixtures ─────────────────────────────────────────────

const baseAttempt = {
  quiz_question_id: 'qq-100',
  answer: 'B',
  is_correct: true,
};

const fullAttempt = {
  ...baseAttempt,
  session_id: 'sess-42',
  time_taken_ms: 1234,
};

const attemptFromServer = {
  id: 'qa-001',
  quiz_question_id: 'qq-100',
  student_id: 'stu-1',
  answer: 'B',
  is_correct: true,
  session_id: 'sess-42',
  time_taken_ms: 1234,
  created_at: '2026-04-18T12:00:00.000Z',
};

// ── Tests ────────────────────────────────────────────────

describe('quizAttemptsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createQuizAttempt', () => {
    it('POSTs to /quiz-attempts with stringified body', async () => {
      mockApiCall.mockResolvedValueOnce(attemptFromServer);
      await createQuizAttempt(fullAttempt);

      expect(mockApiCall).toHaveBeenCalledWith('/quiz-attempts', {
        method: 'POST',
        body: JSON.stringify(fullAttempt),
      });
    });

    it('includes is_correct: true when provided', async () => {
      mockApiCall.mockResolvedValueOnce(attemptFromServer);
      await createQuizAttempt({ ...baseAttempt, is_correct: true });

      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body.is_correct).toBe(true);
    });

    it('includes is_correct: false when provided', async () => {
      mockApiCall.mockResolvedValueOnce({ ...attemptFromServer, is_correct: false });
      await createQuizAttempt({ ...baseAttempt, is_correct: false });

      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body.is_correct).toBe(false);
    });

    it('omits session_id/time_taken_ms when not provided', async () => {
      mockApiCall.mockResolvedValueOnce(attemptFromServer);
      await createQuizAttempt(baseAttempt);

      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body).not.toHaveProperty('session_id');
      expect(body).not.toHaveProperty('time_taken_ms');
    });

    it('does NOT include student_id in the payload (server derives it from the token)', async () => {
      mockApiCall.mockResolvedValueOnce(attemptFromServer);
      await createQuizAttempt(fullAttempt);

      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body).not.toHaveProperty('student_id');
      expect(body).not.toHaveProperty('created_by');
    });

    it('returns the attempt from the server', async () => {
      mockApiCall.mockResolvedValueOnce(attemptFromServer);
      const out = await createQuizAttempt(fullAttempt);
      expect(out).toEqual(attemptFromServer);
    });

    it('propagates errors from apiCall', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('400 Bad Request'));
      await expect(createQuizAttempt(baseAttempt)).rejects.toThrow('400 Bad Request');
    });

    it('supports time_taken_ms = 0 (instant answer)', async () => {
      mockApiCall.mockResolvedValueOnce(attemptFromServer);
      await createQuizAttempt({ ...baseAttempt, time_taken_ms: 0 });

      const body = JSON.parse((mockApiCall.mock.calls[0][1] as RequestInit).body as string);
      expect(body.time_taken_ms).toBe(0);
    });
  });

  describe('getQuizAttempts', () => {
    it('GETs /quiz-attempts with empty query string when no filters set', async () => {
      mockApiCall.mockResolvedValueOnce([]);
      await getQuizAttempts({});

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toBe('/quiz-attempts?');
      // No method specified → defaults to GET in apiCall
      expect(mockApiCall.mock.calls[0][1]).toBeUndefined();
    });

    it('includes session_id filter when provided', async () => {
      mockApiCall.mockResolvedValueOnce([attemptFromServer]);
      await getQuizAttempts({ session_id: 'sess-42' });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('session_id=sess-42');
    });

    it('includes quiz_question_id filter when provided', async () => {
      mockApiCall.mockResolvedValueOnce([attemptFromServer]);
      await getQuizAttempts({ quiz_question_id: 'qq-100' });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('quiz_question_id=qq-100');
    });

    it('combines both filters when provided', async () => {
      mockApiCall.mockResolvedValueOnce([attemptFromServer]);
      await getQuizAttempts({ session_id: 'sess-42', quiz_question_id: 'qq-100' });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('session_id=sess-42');
      expect(url).toContain('quiz_question_id=qq-100');
    });

    it('returns the flat array from apiCall', async () => {
      const arr = [attemptFromServer, { ...attemptFromServer, id: 'qa-002' }];
      mockApiCall.mockResolvedValueOnce(arr);

      const out = await getQuizAttempts({ session_id: 'sess-42' });
      expect(out).toEqual(arr);
      expect(Array.isArray(out)).toBe(true);
    });

    it('propagates errors from apiCall', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('Network error'));
      await expect(getQuizAttempts({ session_id: 'sess-1' })).rejects.toThrow('Network error');
    });

    it('URL-encodes special characters in filter values', async () => {
      mockApiCall.mockResolvedValueOnce([]);
      await getQuizAttempts({ session_id: 'sess with spaces' });

      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('session_id=sess+with+spaces');
    });
  });
});
