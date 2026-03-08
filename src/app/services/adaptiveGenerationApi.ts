// ============================================================
// Axon — Adaptive AI Flashcard Batch Generation Service
// Fase 2 del plan "Sesion Adaptativa de Flashcards con IA" (v4.5)
//
// PURPOSE:
//   Orchestrates N concurrent calls to POST /ai/generate-smart
//   to produce a batch of AI-generated flashcards targeting the
//   student's weakest keywords/subtopics (via server-side BKT
//   gap analysis).
//
// BACKEND ENDPOINT USED (verified against generate-smart.ts on GitHub):
//   POST /ai/generate-smart
//     Request:  { action: "flashcard", institution_id?, related? }
//     Response: { ...flashcard_row, _smart: SmartMetadata, _meta: GenerationMeta }
//
//   The backend auto-selects the best keyword to target via RPC
//   get_smart_generate_target() — the client sends NO content IDs.
//   Each call generates ONE flashcard and persists it to the DB.
//
// FLOW:
//   1. Build array of N async tasks (each calls aiService.generateSmart)
//   2. Execute with parallelWithLimit(tasks, MAX_CONCURRENT=3)
//   3. Collect successes → AdaptiveFlashcard[], failures → errors[]
//   4. Report progress via onProgress callback (for UI loading bar)
//   5. Compute aggregate stats (uniqueKeywords, avgPKnow, tokens)
//   6. Return AdaptiveGenerationResult
//
// CONCURRENCY DESIGN:
//   MAX_CONCURRENT = 3 to avoid saturating the Gemini API.
//   Each call takes ~2-5s (Gemini latency), so 15 cards ≈ 10-25s.
//   The backend's 2h dedup window per keyword ensures variety for
//   the first ~5 cards; beyond that, cards may cluster on the
//   weakest keyword (see DEDUP LIMITATION below).
//
// DEDUP LIMITATION (verified in generate-smart.ts:115-135):
//   The RPC returns top 5 candidate keywords. The backend dedup
//   check filters out keywords with AI content generated in the
//   last 2 hours. For batches >5, calls 6+ may fallback to the
//   weakest keyword (targets[0]) since all 5 candidates are
//   already deduped. RECOMMENDED_MAX_BATCH = 10 reflects this.
//   A future backend endpoint (POST /ai/generate-smart-batch)
//   could solve this with server-side batch dedup.
//
// SAFETY:
//   - New file, zero risk of regression
//   - Does NOT modify any existing service
//   - Delegates to aiService.generateSmart() which handles:
//     * Double-token convention (ANON_KEY + JWT)
//     * Rate limit error detection and re-throw
//     * JSON body serialization
//   - Generated cards are already persisted in DB by the backend
//     (no client-side persistence needed)
//
// DEPENDENCIES:
//   - aiService.generateSmart() (existing, aiService.ts:249)
//   - Flashcard type (existing, types/content.ts:14)
// ============================================================

import { generateSmart } from '@/app/services/aiService';
import type { Flashcard } from '@/app/types/content';

// ── Constants ─────────────────────────────────────────────

export const MAX_CONCURRENT_GENERATIONS = 3;
export const RECOMMENDED_MAX_BATCH = 10;

// ── Types ─────────────────────────────────────────────────

export interface SmartMetadata {
  target_keyword: string;
  target_summary: string;
  target_subtopic: string | null;
  p_know: number;
  need_score: number;
  primary_reason:
    | 'new_concept'
    | 'low_mastery'
    | 'needs_review'
    | 'moderate_mastery'
    | 'reinforcement';
  was_deduped: boolean;
  candidates_evaluated: number;
}

export interface GenerationMeta {
  model: string;
  tokens: { input: number; output: number } | number;
  related?: boolean;
}

export interface AdaptiveFlashcard {
  id: string;
  summary_id: string;
  keyword_id: string;
  subtopic_id: string | null;
  front: string;
  back: string;
  source: 'ai';
  created_by: string;
  created_at: string;
  is_active: boolean;
  deleted_at: string | null;
  front_image_url?: string | null;
  back_image_url?: string | null;
  _smart: SmartMetadata;
  _meta: GenerationMeta;
}

export interface AdaptiveGenerationError {
  index: number;
  message: string;
  error: unknown;
}

export interface BatchStats {
  requested: number;
  generated: number;
  failed: number;
  uniqueKeywords: number;
  avgPKnow: number;
  totalTokens: number;
  elapsedMs: number;
}

export interface AdaptiveGenerationResult {
  cards: AdaptiveFlashcard[];
  errors: AdaptiveGenerationError[];
  stats: BatchStats;
}

export type ProgressCallback = (progress: {
  completed: number;
  total: number;
  generated: number;
  failed: number;
  latestCard?: AdaptiveFlashcard;
}) => void;

export interface AdaptiveBatchParams {
  count: number;
  institutionId?: string;
  related?: boolean;
  onProgress?: ProgressCallback;
}

// ── Internal Helpers ──────────────────────────────────────

async function parallelWithLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++;
      try {
        const value = await tasks[idx]();
        results[idx] = { status: 'fulfilled', value };
      } catch (reason: any) {
        results[idx] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => runNext()
  );
  await Promise.all(workers);
  return results;
}

function extractTokenCount(tokens: GenerationMeta['tokens']): number {
  if (typeof tokens === 'number') return tokens;
  if (tokens && typeof tokens === 'object') {
    return (tokens.input || 0) + (tokens.output || 0);
  }
  return 0;
}

function computeBatchStats(
  cards: AdaptiveFlashcard[],
  errors: AdaptiveGenerationError[],
  requested: number,
  elapsedMs: number
): BatchStats {
  const keywordIds = new Set(cards.map((c) => c.keyword_id));
  const avgPKnow =
    cards.length > 0
      ? cards.reduce((sum, c) => sum + (c._smart?.p_know ?? 0), 0) / cards.length
      : 0;
  const totalTokens = cards.reduce(
    (sum, c) => sum + extractTokenCount(c._meta?.tokens ?? 0),
    0
  );

  return {
    requested,
    generated: cards.length,
    failed: errors.length,
    uniqueKeywords: keywordIds.size,
    avgPKnow,
    totalTokens,
    elapsedMs,
  };
}

// ── Public API ────────────────────────────────────────────

export async function generateAdaptiveBatch(
  params: AdaptiveBatchParams
): Promise<AdaptiveGenerationResult> {
  const { count, institutionId, related, onProgress } = params;

  if (count <= 0) {
    return {
      cards: [],
      errors: [],
      stats: {
        requested: 0,
        generated: 0,
        failed: 0,
        uniqueKeywords: 0,
        avgPKnow: 0,
        totalTokens: 0,
        elapsedMs: 0,
      },
    };
  }

  const startTime = performance.now();
  const cards: AdaptiveFlashcard[] = [];
  const errors: AdaptiveGenerationError[] = [];
  let completedCount = 0;

  const tasks = Array.from({ length: count }, (_, index) => {
    return async (): Promise<void> => {
      try {
        const response = await generateSmart({
          action: 'flashcard',
          institutionId,
          related: related ?? true,
        }) as AdaptiveFlashcard;

        if (!response?.id || !response?.front || !response?.back) {
          throw new Error(
            'Invalid generate-smart response: missing id, front, or back'
          );
        }

        cards.push(response);
        completedCount++;
        onProgress?.({
          completed: completedCount,
          total: count,
          generated: cards.length,
          failed: errors.length,
          latestCard: response,
        });
      } catch (err: any) {
        const genError: AdaptiveGenerationError = {
          index,
          message: err?.message || 'Unknown generation error',
          error: err,
        };
        errors.push(genError);

        if (import.meta.env.DEV) {
          console.warn(
            `[AdaptiveGeneration] Card ${index + 1}/${count} failed:`,
            err?.message || err
          );
        }

        completedCount++;
        onProgress?.({
          completed: completedCount,
          total: count,
          generated: cards.length,
          failed: errors.length,
        });
      }
    };
  });

  await parallelWithLimit(tasks, MAX_CONCURRENT_GENERATIONS);

  const elapsedMs = Math.round(performance.now() - startTime);
  const stats = computeBatchStats(cards, errors, count, elapsedMs);

  if (import.meta.env.DEV) {
    console.log(
      `[AdaptiveGeneration] Batch complete: ${stats.generated}/${stats.requested} generated, ` +
        `${stats.failed} failed, ${stats.uniqueKeywords} unique keywords, ` +
        `${stats.elapsedMs}ms elapsed`
    );
  }

  return { cards, errors, stats };
}

// ── Mapping: AdaptiveFlashcard → Flashcard (UI type) ──────

export function mapToFlashcard(card: AdaptiveFlashcard): Flashcard {
  return {
    id: card.id,
    front: card.front,
    back: card.back,
    question: card.front,
    answer: card.back,
    mastery: 0,
    summary_id: card.summary_id,
    keyword_id: card.keyword_id,
    subtopic_id: card.subtopic_id,
    source: 'ai',
    fsrs_state: 'new',
    frontImageUrl: card.front_image_url ?? null,
    backImageUrl: card.back_image_url ?? null,
  };
}

export function mapBatchToFlashcards(
  result: AdaptiveGenerationResult
): Flashcard[] {
  return result.cards.map(mapToFlashcard);
}

// ── Utility: Human-readable reason text ─────────────────

export function getReasonText(reason: SmartMetadata['primary_reason'], pKnow: number): string {
  const pct = Math.round(pKnow * 100);
  switch (reason) {
    case 'new_concept':
      return 'Es un concepto nuevo que aun no has estudiado.';
    case 'low_mastery':
      return `Tu dominio es bajo (${pct}%). Necesitas reforzar este concepto.`;
    case 'needs_review':
      return `Tu dominio es moderado-bajo (${pct}%). Un repaso te ayudara a consolidar.`;
    case 'moderate_mastery':
      return `Tu dominio es intermedio (${pct}%). Puedes profundizar con ejercicios mas desafiantes.`;
    case 'reinforcement':
      return `Tu dominio es alto (${pct}%). Este ejercicio te ayudara a mantener el conocimiento.`;
    default:
      return `Concepto seleccionado para estudio (dominio: ${pct}%).`;
  }
}
