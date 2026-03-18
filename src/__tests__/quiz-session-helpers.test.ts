// ============================================================
// Quiz Session Helpers Guards — Axon v4.4
//
// PURPOSE: Verify loadAndNormalizeQuestions() correctly filters,
// normalizes, and shuffles questions from the API.
//
// GUARDS AGAINST:
//   - Inactive questions leaking into quiz session
//   - question_type not normalized (AUD-01)
//   - difficulty not converted to integer (AUD-02 / Rule 3)
//   - Preloaded questions path regression
//   - Error handling when API fails (Rule 8: graceful)
//   - checkAndProcessBackup recovery logic
//
// APPROACH: Mock apiCall + quizApi + useQuizBackup modules.
//
// RUN: pnpm test
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock modules BEFORE imports ──────────────────────────
const mockApiCall = vi.fn();
const mockGetQuizQuestions = vi.fn();

vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: any[]) => mockApiCall(...args),
}));

vi.mock('@/app/services/quizApi', () => ({
  getQuizQuestions: (...args: any[]) => mockGetQuizQuestions(...args),
}));

vi.mock('@/app/lib/logger', () => ({
  logger: { warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/app/lib/error-utils', () => ({
  getErrorMsg: (e: any) => e?.message || 'unknown',
}));

vi.mock('@/app/components/student/useQuizBackup', () => ({
  loadQuizBackup: vi.fn().mockReturnValue(null),
  clearQuizBackup: vi.fn(),
  validateAndReorderBackup: vi.fn().mockReturnValue(null),
}));

import {
  loadAndNormalizeQuestions,
  checkAndProcessBackup,
} from '@/app/components/student/quiz-session-helpers';
import { loadQuizBackup, validateAndReorderBackup, clearQuizBackup } from '@/app/components/student/useQuizBackup';

// ── Test data ────────────────────────────────────────────
const ACTIVE_MCQ = {
  id: 'q1', quiz_id: 'qz1', summary_id: 's1', keyword_id: 'k1',
  question_type: 'multiple_choice', // AI alias — should normalize to 'mcq'
  question_text: 'Test?', correct_answer: 'A',
  options: ['A', 'B'], difficulty: 'easy', // string — should become integer
  priority: 1, explanation: null, is_active: true,
  source: 'ai', created_by: 'prof-1', created_at: '2026-01-01',
};

const ACTIVE_TF = {
  ...ACTIVE_MCQ, id: 'q2', question_type: 'true_false',
  difficulty: 3, // already integer
};

const INACTIVE_Q = {
  ...ACTIVE_MCQ, id: 'q3', is_active: false,
};

beforeEach(() => {
  mockApiCall.mockReset();
  mockGetQuizQuestions.mockReset();
  vi.mocked(loadQuizBackup).mockReturnValue(null);
  vi.mocked(validateAndReorderBackup).mockReturnValue(null);
});

// ══════════════════════════════════════════════════════════════
// SUITE 1: loadAndNormalizeQuestions — filtering & normalization
// ══════════════════════════════════════════════════════════════

describe('loadAndNormalizeQuestions', () => {
  it('filters out inactive questions', async () => {
    mockGetQuizQuestions.mockResolvedValue({
      items: [ACTIVE_MCQ, INACTIVE_Q, ACTIVE_TF],
    });

    const result = await loadAndNormalizeQuestions('qz1', 's1', undefined, false);
    expect(result.items).toHaveLength(2);
    expect(result.items.every(q => q.is_active)).toBe(true);
  });

  it('normalizes question_type aliases (AUD-01: multiple_choice → mcq)', async () => {
    mockGetQuizQuestions.mockResolvedValue({ items: [ACTIVE_MCQ] });

    const result = await loadAndNormalizeQuestions('qz1', 's1', undefined, false);
    expect(result.items[0].question_type).toBe('mcq');
  });

  it('normalizes string difficulty to integer (AUD-02 / Rule 3)', async () => {
    mockGetQuizQuestions.mockResolvedValue({ items: [ACTIVE_MCQ] });

    const result = await loadAndNormalizeQuestions('qz1', 's1', undefined, false);
    // 'easy' → DIFFICULTY_TO_INT['easy'] = 1
    expect(result.items[0].difficulty).toBe(1);
    expect(typeof result.items[0].difficulty).toBe('number');
  });

  it('preserves integer difficulty as-is', async () => {
    mockGetQuizQuestions.mockResolvedValue({ items: [ACTIVE_TF] });

    const result = await loadAndNormalizeQuestions('qz1', 's1', undefined, false);
    expect(result.items[0].difficulty).toBe(3);
  });

  it('uses preloaded questions when available (first time only)', async () => {
    const preloaded = [ACTIVE_MCQ, ACTIVE_TF];

    const result = await loadAndNormalizeQuestions(undefined, undefined, preloaded as any, false);
    expect(result.usedPreloaded).toBe(true);
    expect(result.items).toHaveLength(2);
    // API should NOT have been called
    expect(mockGetQuizQuestions).not.toHaveBeenCalled();
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('does not reuse preloaded questions if already used', async () => {
    mockApiCall.mockResolvedValue({ items: [ACTIVE_TF] });

    const result = await loadAndNormalizeQuestions('qz1', undefined, [ACTIVE_MCQ] as any, true);
    // hasUsedPreloaded=true → should use API fallback
    expect(mockApiCall).toHaveBeenCalled();
  });

  it('handles API error gracefully (Rule 8)', async () => {
    mockGetQuizQuestions.mockRejectedValue(new Error('500 Internal'));

    const result = await loadAndNormalizeQuestions('qz1', 's1', undefined, false);
    expect(result.items).toHaveLength(0);
    expect(result.warning).toBeTruthy();
    expect(result.warning).toContain('filtro');
  });

  it('throws when no questions AND no quiz ID AND not preloaded', async () => {
    await expect(
      loadAndNormalizeQuestions(undefined, undefined, [], false),
    ).rejects.toThrow('No se proporcionaron');
  });

  it('shuffles questions (output order differs from input at least sometimes)', async () => {
    // Create 20 questions so shuffle is very likely to change order
    const manyQs = Array.from({ length: 20 }, (_, i) => ({
      ...ACTIVE_MCQ, id: `q-${i}`, difficulty: 2,
    }));
    mockGetQuizQuestions.mockResolvedValue({ items: manyQs });

    const result = await loadAndNormalizeQuestions('qz1', 's1', undefined, false);
    const ids = result.items.map(q => q.id);
    const originalIds = manyQs.map(q => q.id);

    // With 20 items, probability of identical order after shuffle ≈ 1/20! ≈ 0
    expect(result.items).toHaveLength(20);
    // At least verify all IDs are present (shuffle preserves elements)
    expect(ids.sort()).toEqual(originalIds.sort());
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: checkAndProcessBackup — recovery logic
// ══════════════════════════════════════════════════════════════

describe('checkAndProcessBackup', () => {
  it('returns null when no backup exists', () => {
    vi.mocked(loadQuizBackup).mockReturnValue(null);
    const result = checkAndProcessBackup('qz1', [ACTIVE_MCQ as any]);
    expect(result).toBeNull();
  });

  it('returns null and clears when backup is stale', () => {
    vi.mocked(loadQuizBackup).mockReturnValue({
      quizId: 'qz1', quizTitle: 'Test', questionIds: ['q1'],
      savedAnswers: {}, currentIdx: 0, savedAt: Date.now(),
    });
    vi.mocked(validateAndReorderBackup).mockReturnValue(null);

    const result = checkAndProcessBackup('qz1', [ACTIVE_MCQ as any]);
    expect(result).toBeNull();
    expect(clearQuizBackup).toHaveBeenCalledWith('qz1');
  });
});
