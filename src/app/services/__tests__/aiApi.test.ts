// ============================================================
// Unit tests for aiApi service (/ai/generate, /ai/generate-smart,
// /ai/pre-generate endpoints + type guards + getReasonLabel utility).
//
// Mocks: @/app/lib/api (apiCall)
//
// RUN: npx vitest run src/app/services/__tests__/aiApi.test.ts
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock apiCall BEFORE importing the service ───────────────
const mockApiCall = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

import {
  aiGenerate,
  aiGenerateSmart,
  aiPreGenerate,
  isAiQuizResult,
  isAiSmartQuizResult,
  isAiFlashcardResult,
  isAiSmartFlashcardResult,
  getReasonLabel,
  type AiGenerateQuizResult,
  type AiGenerateFlashcardResult,
  type AiGenerateSmartQuizResult,
  type AiGenerateSmartFlashcardResult,
  type AiPreGenerateResult,
  type AiSmartInfo,
} from '@/app/services/aiApi';

// ── Fixtures ────────────────────────────────────────────────

const SAMPLE_QUIZ_RESULT: AiGenerateQuizResult = {
  id: 'q-1',
  summary_id: 'sum-1',
  keyword_id: 'kw-1',
  subtopic_id: null,
  question: 'What is foo?',
  options: ['a', 'b', 'c', 'd'],
  correct_answer: 'a',
  explanation: 'because',
  difficulty: 'medium',
  question_type: 'multiple_choice',
  source: 'ai',
  created_by: 'u-1',
  created_at: '2026-04-18T00:00:00Z',
  _meta: {
    model: 'gemini-2.0',
    tokens: { input: 100, output: 50 },
    had_wrong_answer: false,
  },
} as unknown as AiGenerateQuizResult;

const SAMPLE_FC_RESULT: AiGenerateFlashcardResult = {
  id: 'f-1',
  summary_id: 'sum-1',
  keyword_id: 'kw-1',
  subtopic_id: null,
  front: 'front text',
  back: 'back text',
  source: 'ai',
  created_by: 'u-1',
  created_at: '2026-04-18T00:00:00Z',
  _meta: {
    model: 'gemini-2.0',
    tokens: { input: 100, output: 50 },
    related: false,
  },
};

const SAMPLE_SMART_INFO: AiSmartInfo = {
  target_keyword: 'mitosis',
  target_summary: 'Cell Biology',
  target_subtopic: null,
  p_know: 0.35,
  need_score: 0.65,
  primary_reason: 'low_mastery',
  was_deduped: false,
  candidates_evaluated: 5,
};

beforeEach(() => {
  mockApiCall.mockReset();
});

// ══════════════════════════════════════════════════════════════
// aiGenerate — POST /ai/generate
// ══════════════════════════════════════════════════════════════

describe('aiGenerate', () => {
  it('calls POST /ai/generate with correct URL and method', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_QUIZ_RESULT);
    await aiGenerate({ action: 'quiz_question', summary_id: 'sum-1' });
    expect(mockApiCall).toHaveBeenCalledTimes(1);
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/ai/generate');
    expect(opts.method).toBe('POST');
  });

  it('serializes full body including optional fields', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_QUIZ_RESULT);
    await aiGenerate({
      action: 'quiz_question',
      summary_id: 'sum-1',
      keyword_id: 'kw-1',
      subtopic_id: 'sub-1',
      block_id: 'blk-1',
      wrong_answer: 'opt-a',
      related: true,
    });
    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body).toEqual({
      action: 'quiz_question',
      summary_id: 'sum-1',
      keyword_id: 'kw-1',
      subtopic_id: 'sub-1',
      block_id: 'blk-1',
      wrong_answer: 'opt-a',
      related: true,
    });
  });

  it('serializes minimal body with only required fields', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_FC_RESULT);
    await aiGenerate({ action: 'flashcard', summary_id: 'sum-1' });
    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body).toEqual({ action: 'flashcard', summary_id: 'sum-1' });
    expect(body.keyword_id).toBeUndefined();
    expect(body.block_id).toBeUndefined();
  });

  it('returns quiz result when action=quiz_question', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_QUIZ_RESULT);
    const out = await aiGenerate({ action: 'quiz_question', summary_id: 'sum-1' });
    expect(out).toEqual(SAMPLE_QUIZ_RESULT);
  });

  it('returns flashcard result when action=flashcard', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_FC_RESULT);
    const out = await aiGenerate({ action: 'flashcard', summary_id: 'sum-1' });
    expect(out).toEqual(SAMPLE_FC_RESULT);
  });

  it('propagates backend errors', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('HTTP 500: AI generation failed'));
    await expect(
      aiGenerate({ action: 'quiz_question', summary_id: 'sum-1' })
    ).rejects.toThrow('AI generation failed');
  });

  it('propagates rate-limit 429 errors', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('HTTP 429: rate limit'));
    await expect(
      aiGenerate({ action: 'flashcard', summary_id: 'sum-1' })
    ).rejects.toThrow('429');
  });
});

// ══════════════════════════════════════════════════════════════
// aiGenerateSmart — POST /ai/generate-smart
// ══════════════════════════════════════════════════════════════

describe('aiGenerateSmart', () => {
  it('calls POST /ai/generate-smart with correct URL and method', async () => {
    const smartQuiz: AiGenerateSmartQuizResult = {
      ...SAMPLE_QUIZ_RESULT,
      _smart: SAMPLE_SMART_INFO,
    } as unknown as AiGenerateSmartQuizResult;
    mockApiCall.mockResolvedValueOnce(smartQuiz);
    await aiGenerateSmart({ action: 'quiz_question' });
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/ai/generate-smart');
    expect(opts.method).toBe('POST');
  });

  it('serializes body with institution_id and related flag', async () => {
    mockApiCall.mockResolvedValueOnce({} as any);
    await aiGenerateSmart({
      action: 'flashcard',
      institution_id: 'inst-1',
      related: true,
    });
    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body).toEqual({
      action: 'flashcard',
      institution_id: 'inst-1',
      related: true,
    });
  });

  it('serializes minimal body with only action', async () => {
    mockApiCall.mockResolvedValueOnce({} as any);
    await aiGenerateSmart({ action: 'quiz_question' });
    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body).toEqual({ action: 'quiz_question' });
  });

  it('returns smart quiz result with _smart metadata', async () => {
    const smartQuiz: AiGenerateSmartQuizResult = {
      ...SAMPLE_QUIZ_RESULT,
      _smart: SAMPLE_SMART_INFO,
    } as unknown as AiGenerateSmartQuizResult;
    mockApiCall.mockResolvedValueOnce(smartQuiz);
    const out = await aiGenerateSmart({ action: 'quiz_question' });
    expect((out as AiGenerateSmartQuizResult)._smart).toEqual(SAMPLE_SMART_INFO);
  });

  it('returns smart flashcard result with _smart metadata', async () => {
    const smartFc: AiGenerateSmartFlashcardResult = {
      ...SAMPLE_FC_RESULT,
      _smart: SAMPLE_SMART_INFO,
    };
    mockApiCall.mockResolvedValueOnce(smartFc);
    const out = await aiGenerateSmart({ action: 'flashcard' });
    expect((out as AiGenerateSmartFlashcardResult)._smart).toEqual(SAMPLE_SMART_INFO);
  });

  it('propagates errors (no candidates available)', async () => {
    mockApiCall.mockRejectedValueOnce(
      new Error('HTTP 400: No keywords available for smart generation')
    );
    await expect(aiGenerateSmart({ action: 'flashcard' })).rejects.toThrow(
      'No keywords available'
    );
  });
});

// ══════════════════════════════════════════════════════════════
// aiPreGenerate — POST /ai/pre-generate
// ══════════════════════════════════════════════════════════════

describe('aiPreGenerate', () => {
  const SAMPLE_PRE: AiPreGenerateResult = {
    generated: [
      { type: 'quiz_question', id: 'q-1', keyword_id: 'kw-1', keyword_name: 'mitosis' },
      { type: 'quiz_question', id: 'q-2', keyword_id: 'kw-2', keyword_name: 'meiosis' },
    ],
    errors: [],
    _meta: {
      model: 'gemini-2.0',
      summary_id: 'sum-1',
      summary_title: 'Cell Biology',
      action: 'quiz_question',
      total_attempted: 2,
      total_generated: 2,
      total_failed: 0,
      total_keywords_in_summary: 10,
      tokens: { input: 200, output: 100 },
    },
  };

  it('calls POST /ai/pre-generate with correct URL', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_PRE);
    await aiPreGenerate({ summary_id: 'sum-1', action: 'quiz_question' });
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/ai/pre-generate');
    expect(opts.method).toBe('POST');
  });

  it('serializes body including count when provided', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_PRE);
    await aiPreGenerate({ summary_id: 'sum-1', action: 'flashcard', count: 5 });
    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body).toEqual({ summary_id: 'sum-1', action: 'flashcard', count: 5 });
  });

  it('serializes body without count when not provided', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_PRE);
    await aiPreGenerate({ summary_id: 'sum-1', action: 'quiz_question' });
    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body).toEqual({ summary_id: 'sum-1', action: 'quiz_question' });
    expect(body.count).toBeUndefined();
  });

  it('returns generated items + empty errors when all succeed', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_PRE);
    const out = await aiPreGenerate({ summary_id: 'sum-1', action: 'quiz_question' });
    expect(out.generated).toHaveLength(2);
    expect(out.errors).toHaveLength(0);
    expect(out._meta.total_generated).toBe(2);
  });

  it('returns partial success with errors array populated', async () => {
    const partial: AiPreGenerateResult = {
      ...SAMPLE_PRE,
      generated: [SAMPLE_PRE.generated[0]],
      errors: [{ keyword_id: 'kw-2', keyword_name: 'meiosis', error: 'timeout' }],
      _meta: { ...SAMPLE_PRE._meta, total_generated: 1, total_failed: 1 },
    };
    mockApiCall.mockResolvedValueOnce(partial);
    const out = await aiPreGenerate({ summary_id: 'sum-1', action: 'quiz_question' });
    expect(out.generated).toHaveLength(1);
    expect(out.errors[0].error).toBe('timeout');
    expect(out._meta.total_failed).toBe(1);
  });

  it('propagates a network/server error', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Network timeout'));
    await expect(
      aiPreGenerate({ summary_id: 'sum-1', action: 'quiz_question' })
    ).rejects.toThrow('Network timeout');
  });
});

// ══════════════════════════════════════════════════════════════
// Type Guards
// ══════════════════════════════════════════════════════════════

describe('isAiQuizResult', () => {
  it('returns true for quiz result (has question + correct_answer)', () => {
    expect(isAiQuizResult(SAMPLE_QUIZ_RESULT)).toBe(true);
  });

  it('returns false for flashcard result', () => {
    expect(isAiQuizResult(SAMPLE_FC_RESULT as unknown as AiGenerateQuizResult)).toBe(false);
  });
});

describe('isAiFlashcardResult', () => {
  it('returns true for flashcard result (has front + back)', () => {
    expect(isAiFlashcardResult(SAMPLE_FC_RESULT)).toBe(true);
  });

  it('returns false for quiz result', () => {
    expect(isAiFlashcardResult(SAMPLE_QUIZ_RESULT as unknown as AiGenerateFlashcardResult)).toBe(false);
  });
});

describe('isAiSmartQuizResult', () => {
  it('returns true for smart quiz result', () => {
    const smartQuiz = { ...SAMPLE_QUIZ_RESULT, _smart: SAMPLE_SMART_INFO } as AiGenerateSmartQuizResult;
    expect(isAiSmartQuizResult(smartQuiz)).toBe(true);
  });

  it('returns false for smart flashcard result', () => {
    const smartFc = { ...SAMPLE_FC_RESULT, _smart: SAMPLE_SMART_INFO } as AiGenerateSmartFlashcardResult;
    expect(isAiSmartQuizResult(smartFc as unknown as AiGenerateSmartQuizResult)).toBe(false);
  });
});

describe('isAiSmartFlashcardResult', () => {
  it('returns true for smart flashcard result', () => {
    const smartFc = { ...SAMPLE_FC_RESULT, _smart: SAMPLE_SMART_INFO } as AiGenerateSmartFlashcardResult;
    expect(isAiSmartFlashcardResult(smartFc)).toBe(true);
  });

  it('returns false for smart quiz result', () => {
    const smartQuiz = { ...SAMPLE_QUIZ_RESULT, _smart: SAMPLE_SMART_INFO } as AiGenerateSmartQuizResult;
    expect(isAiSmartFlashcardResult(smartQuiz as unknown as AiGenerateSmartFlashcardResult)).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// getReasonLabel — Utility for Spanish labels
// ══════════════════════════════════════════════════════════════

describe('getReasonLabel', () => {
  it('returns Spanish label for new_concept', () => {
    const label = getReasonLabel('new_concept');
    expect(label).toContain('Concepto nuevo');
  });

  it('returns Spanish label for low_mastery', () => {
    expect(getReasonLabel('low_mastery')).toContain('Dominio bajo');
  });

  it('returns Spanish label for needs_review', () => {
    expect(getReasonLabel('needs_review')).toContain('Dominio moderado-bajo');
  });

  it('returns Spanish label for moderate_mastery', () => {
    expect(getReasonLabel('moderate_mastery')).toContain('Dominio intermedio');
  });

  it('returns Spanish label for reinforcement', () => {
    expect(getReasonLabel('reinforcement')).toContain('Dominio alto');
  });

  it('appends rounded percentage when pKnow provided', () => {
    expect(getReasonLabel('low_mastery', 0.35)).toContain('(35%)');
    expect(getReasonLabel('moderate_mastery', 0.67)).toContain('(67%)');
  });

  it('rounds 0 pKnow correctly (edge case, not skipped by != null)', () => {
    // 0 is not null → should be appended
    expect(getReasonLabel('new_concept', 0)).toContain('(0%)');
  });

  it('omits percentage when pKnow is undefined', () => {
    const label = getReasonLabel('reinforcement');
    expect(label).not.toMatch(/\(\d+%\)/);
  });

  it('rounds to nearest integer for fractional pKnow', () => {
    // 0.456 * 100 = 45.6 → 46
    expect(getReasonLabel('low_mastery', 0.456)).toContain('(46%)');
    // 0.444 * 100 = 44.4 → 44
    expect(getReasonLabel('low_mastery', 0.444)).toContain('(44%)');
  });

  it('falls back to generic label for unknown reason (defensive)', () => {
    // Cast to bypass TS check — we simulate a future/unknown primary_reason
    const label = getReasonLabel('unknown_reason' as AiSmartInfo['primary_reason']);
    expect(label).toBe('Concepto seleccionado para estudio');
  });
});
