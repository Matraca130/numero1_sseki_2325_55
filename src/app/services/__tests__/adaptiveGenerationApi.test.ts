/**
 * adaptiveGenerationApi.test.ts — Tests for adaptive AI flashcard batch generation (Fase 2)
 *
 * Coverage:
 *   - generateAdaptiveBatch (count=0, happy path, failures, aborted signal,
 *     progress callback, summaryIds rotation, stats computation)
 *   - mapToFlashcard / mapBatchToFlashcards (field mapping, image urls)
 *   - getReasonText (all primary_reason values, p_know→pct rounding)
 *
 * NOTE (MASTERY-SYSTEMS.md): getReasonText's `p_know` belongs to Sistema A
 * (rating INPUT / BKT target score). We test it as a pure formatter —
 * no threshold classification lives here.
 *
 * Mocks: @/app/services/aiService (generateSmart)
 *
 * Run: npx vitest run src/app/services/__tests__/adaptiveGenerationApi.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (must be declared before import of SUT) ─────────

const mockGenerateSmart = vi.fn();

vi.mock('@/app/services/aiService', () => ({
  generateSmart: (...args: unknown[]) => mockGenerateSmart(...args),
}));

// ── SUT ───────────────────────────────────────────────────

import {
  generateAdaptiveBatch,
  mapToFlashcard,
  mapBatchToFlashcards,
  getReasonText,
  type AdaptiveFlashcard,
  type AdaptiveGenerationResult,
} from '../adaptiveGenerationApi';

// ── Helpers ───────────────────────────────────────────────

function makeAdaptiveCard(id: string, overrides: Partial<AdaptiveFlashcard> = {}): AdaptiveFlashcard {
  return {
    id,
    summary_id: `sum-${id}`,
    keyword_id: `kw-${id}`,
    subtopic_id: `sub-${id}`,
    front: `Q-${id}`,
    back: `A-${id}`,
    source: 'ai',
    created_by: 'user-1',
    created_at: '2026-04-18T10:00:00Z',
    is_active: true,
    deleted_at: null,
    front_image_url: null,
    back_image_url: null,
    _smart: {
      target_keyword: `kw-${id}`,
      target_summary: `sum-${id}`,
      target_subtopic: `sub-${id}`,
      p_know: 0.35,
      need_score: 0.7,
      primary_reason: 'low_mastery',
    },
    _meta: {
      model: 'gemini-2.0-flash',
      tokens: { input: 100, output: 50 },
    },
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────

describe('adaptiveGenerationApi', () => {
  beforeEach(() => {
    // mockReset drains mockResolvedValueOnce queues — clearAllMocks only clears call history.
    mockGenerateSmart.mockReset();
  });

  // ── generateAdaptiveBatch ──

  describe('generateAdaptiveBatch', () => {
    it('returns empty batch immediately when count=0 (no calls made)', async () => {
      const result = await generateAdaptiveBatch({ count: 0 });
      expect(mockGenerateSmart).not.toHaveBeenCalled();
      expect(result.cards).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.stats).toEqual({
        requested: 0,
        generated: 0,
        failed: 0,
        uniqueKeywords: 0,
        avgPKnow: 0,
        totalTokens: 0,
        elapsedMs: 0,
      });
    });

    it('returns empty batch for negative count without calling generateSmart', async () => {
      const result = await generateAdaptiveBatch({ count: -3 });
      expect(mockGenerateSmart).not.toHaveBeenCalled();
      expect(result.cards).toHaveLength(0);
    });

    it('generates the requested number of cards (happy path)', async () => {
      mockGenerateSmart.mockImplementation(async () => makeAdaptiveCard(`c-${Math.random()}`));
      const result = await generateAdaptiveBatch({ count: 3 });
      expect(mockGenerateSmart).toHaveBeenCalledTimes(3);
      expect(result.cards).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.requested).toBe(3);
      expect(result.stats.generated).toBe(3);
      expect(result.stats.failed).toBe(0);
    });

    it('forwards institutionId and related flag to generateSmart', async () => {
      mockGenerateSmart.mockResolvedValue(makeAdaptiveCard('c-1'));
      await generateAdaptiveBatch({ count: 1, institutionId: 'inst-1', related: false });
      expect(mockGenerateSmart).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'flashcard',
          institutionId: 'inst-1',
          related: false,
        })
      );
    });

    it('defaults related to true when not provided', async () => {
      mockGenerateSmart.mockResolvedValue(makeAdaptiveCard('c-1'));
      await generateAdaptiveBatch({ count: 1 });
      const args = mockGenerateSmart.mock.calls[0][0];
      expect(args.related).toBe(true);
    });

    it('rotates through summaryIds using index % length', async () => {
      const seen: (string | undefined)[] = [];
      mockGenerateSmart.mockImplementation(async (args: any) => {
        seen.push(args.summaryId);
        return makeAdaptiveCard(`c-${seen.length}`);
      });
      await generateAdaptiveBatch({ count: 5, summaryIds: ['A', 'B'] });
      // parallelWithLimit runs tasks in order by `nextIndex`, and since
      // generateSmart resolves synchronously here, the order equals 0..4.
      expect(seen).toEqual(['A', 'B', 'A', 'B', 'A']);
    });

    it('uses summaryId=undefined when summaryIds is empty array', async () => {
      mockGenerateSmart.mockResolvedValue(makeAdaptiveCard('c-1'));
      await generateAdaptiveBatch({ count: 1, summaryIds: [] });
      const args = mockGenerateSmart.mock.calls[0][0];
      expect(args.summaryId).toBeUndefined();
    });

    it('captures errors from generateSmart and continues others', async () => {
      mockGenerateSmart
        .mockResolvedValueOnce(makeAdaptiveCard('c-1'))
        .mockRejectedValueOnce(new Error('429 rate limit'))
        .mockResolvedValueOnce(makeAdaptiveCard('c-3'));
      const result = await generateAdaptiveBatch({ count: 3 });
      expect(result.cards).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].index).toBe(1);
      expect(result.errors[0].message).toBe('429 rate limit');
      expect(result.errors[0].error).toBeInstanceOf(Error);
      expect(result.stats.generated).toBe(2);
      expect(result.stats.failed).toBe(1);
    });

    it('rejects response missing id/front/back as invalid (captured as error)', async () => {
      mockGenerateSmart.mockResolvedValueOnce({ id: 'x', front: '' });
      const result = await generateAdaptiveBatch({ count: 1 });
      expect(result.cards).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Invalid generate-smart response');
    });

    it('handles non-Error thrown values by stringifying (fallback message)', async () => {
      mockGenerateSmart.mockRejectedValueOnce('boom-as-string');
      const result = await generateAdaptiveBatch({ count: 1 });
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('boom-as-string');
    });

    it('invokes onProgress after each completion with cumulative counters', async () => {
      mockGenerateSmart
        .mockResolvedValueOnce(makeAdaptiveCard('c-1'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(makeAdaptiveCard('c-3'));

      const progressCalls: Array<{ completed: number; generated: number; failed: number }> = [];
      await generateAdaptiveBatch({
        count: 3,
        onProgress: (p) => progressCalls.push({
          completed: p.completed,
          generated: p.generated,
          failed: p.failed,
        }),
      });

      // 3 callbacks (one per completion), last should be terminal
      expect(progressCalls.length).toBe(3);
      const last = progressCalls[progressCalls.length - 1];
      expect(last.completed).toBe(3);
      expect(last.generated).toBe(2);
      expect(last.failed).toBe(1);
    });

    it('respects already-aborted signal: skips all generateSmart calls', async () => {
      const controller = new AbortController();
      controller.abort();
      const result = await generateAdaptiveBatch({ count: 4, signal: controller.signal });
      expect(mockGenerateSmart).not.toHaveBeenCalled();
      expect(result.cards).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.generated).toBe(0);
    });

    it('computes stats.uniqueKeywords correctly when multiple cards share a keyword', async () => {
      mockGenerateSmart
        .mockResolvedValueOnce(makeAdaptiveCard('c-1', { keyword_id: 'kwA' }))
        .mockResolvedValueOnce(makeAdaptiveCard('c-2', { keyword_id: 'kwA' }))
        .mockResolvedValueOnce(makeAdaptiveCard('c-3', { keyword_id: 'kwB' }));
      const result = await generateAdaptiveBatch({ count: 3 });
      expect(result.stats.uniqueKeywords).toBe(2);
    });

    it('computes avgPKnow as mean of _smart.p_know across generated cards', async () => {
      const c1 = makeAdaptiveCard('1', { _smart: { ...makeAdaptiveCard('1')._smart, p_know: 0.2 } });
      const c2 = makeAdaptiveCard('2', { _smart: { ...makeAdaptiveCard('2')._smart, p_know: 0.8 } });
      mockGenerateSmart.mockResolvedValueOnce(c1).mockResolvedValueOnce(c2);
      const result = await generateAdaptiveBatch({ count: 2 });
      expect(result.stats.avgPKnow).toBeCloseTo(0.5, 5);
    });

    it('computes totalTokens from object {input,output} and numeric tokens shapes', async () => {
      const c1 = makeAdaptiveCard('1', { _meta: { model: 'm', tokens: { input: 10, output: 20 } } });
      const c2 = makeAdaptiveCard('2', { _meta: { model: 'm', tokens: 50 as unknown as number } });
      mockGenerateSmart.mockResolvedValueOnce(c1).mockResolvedValueOnce(c2);
      const result = await generateAdaptiveBatch({ count: 2 });
      expect(result.stats.totalTokens).toBe(30 + 50);
    });

    it('handles missing/partial token shapes as 0 contribution', async () => {
      const c1 = makeAdaptiveCard('1', { _meta: { model: 'm', tokens: {} as unknown as { input: number; output: number } } });
      mockGenerateSmart.mockResolvedValueOnce(c1);
      const result = await generateAdaptiveBatch({ count: 1 });
      expect(result.stats.totalTokens).toBe(0);
    });
  });

  // ── mapToFlashcard ──

  describe('mapToFlashcard', () => {
    it('maps core fields and sets mastery=0 / fsrs_state=new', () => {
      const card = makeAdaptiveCard('c-1');
      const fc = mapToFlashcard(card);
      expect(fc.id).toBe('c-1');
      expect(fc.front).toBe('Q-c-1');
      expect(fc.back).toBe('A-c-1');
      expect(fc.question).toBe('Q-c-1');
      expect(fc.answer).toBe('A-c-1');
      expect(fc.mastery).toBe(0);
      expect(fc.summary_id).toBe('sum-c-1');
      expect(fc.keyword_id).toBe('kw-c-1');
      expect(fc.subtopic_id).toBe('sub-c-1');
      expect(fc.source).toBe('ai');
      expect(fc.fsrs_state).toBe('new');
    });

    it('maps image URLs when present', () => {
      const card = makeAdaptiveCard('c-1', {
        front_image_url: 'https://img.test/f.png',
        back_image_url: 'https://img.test/b.png',
      });
      const fc = mapToFlashcard(card);
      expect(fc.frontImageUrl).toBe('https://img.test/f.png');
      expect(fc.backImageUrl).toBe('https://img.test/b.png');
    });

    it('coerces undefined image URLs to null', () => {
      const card = makeAdaptiveCard('c-1');
      delete (card as any).front_image_url;
      delete (card as any).back_image_url;
      const fc = mapToFlashcard(card);
      expect(fc.frontImageUrl).toBeNull();
      expect(fc.backImageUrl).toBeNull();
    });

    it('preserves null subtopic_id', () => {
      const card = makeAdaptiveCard('c-1', { subtopic_id: null });
      const fc = mapToFlashcard(card);
      expect(fc.subtopic_id).toBeNull();
    });
  });

  // ── mapBatchToFlashcards ──

  describe('mapBatchToFlashcards', () => {
    it('returns empty array for empty cards list', () => {
      const result: AdaptiveGenerationResult = {
        cards: [],
        errors: [],
        stats: { requested: 0, generated: 0, failed: 0, uniqueKeywords: 0, avgPKnow: 0, totalTokens: 0, elapsedMs: 0 },
      };
      expect(mapBatchToFlashcards(result)).toEqual([]);
    });

    it('maps each card in the batch preserving order', () => {
      const cards = [makeAdaptiveCard('a'), makeAdaptiveCard('b'), makeAdaptiveCard('c')];
      const result: AdaptiveGenerationResult = {
        cards,
        errors: [],
        stats: { requested: 3, generated: 3, failed: 0, uniqueKeywords: 3, avgPKnow: 0.35, totalTokens: 450, elapsedMs: 1200 },
      };
      const mapped = mapBatchToFlashcards(result);
      expect(mapped.map((f) => f.id)).toEqual(['a', 'b', 'c']);
    });
  });

  // ── getReasonText ──

  describe('getReasonText', () => {
    // Sistema A (rating INPUT): p_know used only to format user-facing %
    it('returns new_concept message ignoring p_know', () => {
      expect(getReasonText('new_concept', 0.0)).toBe('Es un concepto nuevo que aun no has estudiado.');
      expect(getReasonText('new_concept', 0.9)).toBe('Es un concepto nuevo que aun no has estudiado.');
    });

    it('formats low_mastery with rounded percentage', () => {
      expect(getReasonText('low_mastery', 0.23)).toBe('Tu dominio es bajo (23%). Necesitas reforzar este concepto.');
    });

    it('formats needs_review with rounded percentage', () => {
      expect(getReasonText('needs_review', 0.456)).toContain('46%');
      expect(getReasonText('needs_review', 0.456)).toMatch(/moderado-bajo/);
    });

    it('formats moderate_mastery', () => {
      expect(getReasonText('moderate_mastery', 0.6)).toBe('Tu dominio es intermedio (60%). Puedes profundizar con ejercicios más desafiantes.');
    });

    it('formats reinforcement for high p_know', () => {
      expect(getReasonText('reinforcement', 0.95)).toBe('Tu dominio es alto (95%). Este ejercicio te ayudará a mantener el conocimiento.');
    });

    it('returns default message for unknown reason', () => {
      // Cast since TS would normally block unknown literals — we test runtime default.
      const result = getReasonText('unknown_reason' as any, 0.5);
      expect(result).toBe('Concepto seleccionado para estudio (dominio: 50%).');
    });

    it('rounds p_know=0.995 up to 100% (Math.round edge)', () => {
      expect(getReasonText('reinforcement', 0.995)).toContain('100%');
    });

    it('handles p_know=0 as 0%', () => {
      expect(getReasonText('low_mastery', 0)).toContain('(0%)');
    });
  });
});
