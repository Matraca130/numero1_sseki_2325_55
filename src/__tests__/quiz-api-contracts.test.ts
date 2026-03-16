// ============================================================
// Quiz API Contract Guards — Axon v4.4
//
// PURPOSE: Verify API functions construct correct URLs and
// payloads without making real network requests.
//
// GUARDS AGAINST:
//   - URL construction bugs (query params, paths)
//   - Guidelines Rule 2: flat routes with query params (no REST nesting)
//   - Guidelines Rule 3: difficulty sent as INTEGER to backend
//   - Guidelines Rule 6: student_id/created_by never in payload
//   - Payload shape changes that break backend contract
//
// APPROACH: Mock apiCall() and inspect what URL/options were passed.
//
// RUN: pnpm test
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock apiCall BEFORE importing API modules ────────────
const mockApiCall = vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: any[]) => mockApiCall(...args),
}));

import { getQuizQuestions } from '@/app/services/quizQuestionsApi';
import { getQuizzes } from '@/app/services/quizzesEntityApi';
import { createQuizAttempt } from '@/app/services/quizAttemptsApi';
import { upsertBktState } from '@/app/services/bktApi';
import { DIFFICULTY_TO_INT } from '@/app/services/quizConstants';

beforeEach(() => {
  mockApiCall.mockClear();
});

// ══════════════════════════════════════════════════════════════
// SUITE 1: getQuizQuestions URL construction
// ══════════════════════════════════════════════════════════════

describe('getQuizQuestions — URL construction', () => {
  it('includes summary_id as query param (Rule 2: flat routes)', async () => {
    await getQuizQuestions('sum-123');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('/quiz-questions?');
    expect(url).toContain('summary_id=sum-123');
    expect(url).not.toMatch(/\/summaries\//);
  });

  it('sends difficulty as INTEGER when given string (Rule 3)', async () => {
    await getQuizQuestions('sum-123', { difficulty: 'hard' });
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('difficulty=3');
    expect(url).not.toContain('difficulty=hard');
  });

  it('sends difficulty as INTEGER when given number (Rule 3)', async () => {
    await getQuizQuestions('sum-123', { difficulty: 2 });
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('difficulty=2');
  });

  it('includes keyword_id filter when provided', async () => {
    await getQuizQuestions('sum-123', { keyword_id: 'kw-456' });
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('keyword_id=kw-456');
  });

  it('includes question_type filter when provided', async () => {
    await getQuizQuestions('sum-123', { question_type: 'mcq' });
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('question_type=mcq');
  });

  it('includes pagination params', async () => {
    await getQuizQuestions('sum-123', { limit: 10, offset: 20 });
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('limit=10');
    expect(url).toContain('offset=20');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: getQuizzes URL construction
// ══════════════════════════════════════════════════════════════

describe('getQuizzes — URL construction', () => {
  it('uses flat /quizzes route with summary_id param (Rule 2)', async () => {
    await getQuizzes('sum-789');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('/quizzes?');
    expect(url).toContain('summary_id=sum-789');
    expect(url).not.toMatch(/\/summaries\//);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 3: createQuizAttempt payload shape
// ══════════════════════════════════════════════════════════════

describe('createQuizAttempt — payload contract', () => {
  it('sends POST to /quiz-attempts with correct JSON body', async () => {
    const payload = {
      quiz_question_id: 'qq-001',
      answer: 'Option B',
      is_correct: true,
      session_id: 'sess-001',
      time_taken_ms: 5432,
    };
    await createQuizAttempt(payload);

    expect(mockApiCall).toHaveBeenCalledWith('/quiz-attempts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('does NOT include student_id in payload (Rule 6: auto from token)', async () => {
    const payload = {
      quiz_question_id: 'qq-001',
      answer: 'True',
      is_correct: false,
    };
    await createQuizAttempt(payload);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody).not.toHaveProperty('student_id');
    expect(sentBody).not.toHaveProperty('created_by');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 4: upsertBktState payload shape
// ══════════════════════════════════════════════════════════════

describe('upsertBktState — payload contract', () => {
  it('sends POST to /bkt-states with BKT parameters', async () => {
    const payload = {
      subtopic_id: 'st-001',
      p_know: 0.65,
      p_transit: 0.1,
      p_slip: 0.1,
      p_guess: 0.25,
      delta: 0.15,
      total_attempts: 1,
      correct_attempts: 1,
      last_attempt_at: '2026-03-16T00:00:00.000Z',
    };
    await upsertBktState(payload);

    expect(mockApiCall).toHaveBeenCalledWith('/bkt-states', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('does NOT include student_id (Rule 6: auto from token)', async () => {
    const payload = {
      subtopic_id: 'st-001',
      p_know: 0.5,
      p_transit: 0.1,
      p_slip: 0.1,
      p_guess: 0.25,
      delta: 0.1,
      total_attempts: 1,
      correct_attempts: 0,
      last_attempt_at: '2026-03-16T00:00:00.000Z',
    };
    await upsertBktState(payload);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody).not.toHaveProperty('student_id');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 5: DIFFICULTY_TO_INT completeness (Rule 3 guard)
// ══════════════════════════════════════════════════════════════

describe('DIFFICULTY_TO_INT — backend contract (Rule 3)', () => {
  it('maps easy→1, medium→2, hard→3', () => {
    expect(DIFFICULTY_TO_INT.easy).toBe(1);
    expect(DIFFICULTY_TO_INT.medium).toBe(2);
    expect(DIFFICULTY_TO_INT.hard).toBe(3);
  });

  it('all values are integers (not floats, not strings)', () => {
    for (const val of Object.values(DIFFICULTY_TO_INT)) {
      expect(Number.isInteger(val)).toBe(true);
    }
  });
});
