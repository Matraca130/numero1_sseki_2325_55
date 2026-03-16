// ============================================================
// Axon — Adaptive AI Flashcard Batch Generation Service
// Fase 2 del plan "Sesion Adaptativa de Flashcards con IA" (v4.5)
// ============================================================

import { generateSmart } from '@/app/services/aiService';
import type { SmartTargetMeta } from '@/app/services/aiService';
import type { Flashcard } from '@/app/types/content';
import { parallelWithLimit } from '@/app/lib/concurrency';

export const MAX_CONCURRENT_GENERATIONS = 3;
export const RECOMMENDED_MAX_BATCH = 10;

export type SmartMetadata = Required<SmartTargetMeta>;

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
  summaryIds?: string[];
  related?: boolean;
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
}

function extractTokenCount(tokens: GenerationMeta['tokens']): number {
  if (typeof tokens === 'number') return tokens;
  if (tokens && typeof tokens === 'object') return (tokens.input || 0) + (tokens.output || 0);
  return 0;
}

function computeBatchStats(cards: AdaptiveFlashcard[], errors: AdaptiveGenerationError[], requested: number, elapsedMs: number): BatchStats {
  const keywordIds = new Set(cards.map((c) => c.keyword_id));
  const avgPKnow = cards.length > 0 ? cards.reduce((sum, c) => sum + (c._smart?.p_know ?? 0), 0) / cards.length : 0;
  const totalTokens = cards.reduce((sum, c) => sum + extractTokenCount(c._meta?.tokens ?? 0), 0);
  return { requested, generated: cards.length, failed: errors.length, uniqueKeywords: keywordIds.size, avgPKnow, totalTokens, elapsedMs };
}

export async function generateAdaptiveBatch(params: AdaptiveBatchParams): Promise<AdaptiveGenerationResult> {
  const { count, institutionId, summaryIds, related, onProgress, signal } = params;
  if (count <= 0) return { cards: [], errors: [], stats: { requested: 0, generated: 0, failed: 0, uniqueKeywords: 0, avgPKnow: 0, totalTokens: 0, elapsedMs: 0 } };

  const startTime = performance.now();
  const cards: AdaptiveFlashcard[] = [];
  const errors: AdaptiveGenerationError[] = [];
  let completedCount = 0;

  const tasks = Array.from({ length: count }, (_, index) => {
    return async (): Promise<void> => {
      if (signal?.aborted) { completedCount++; onProgress?.({ completed: completedCount, total: count, generated: cards.length, failed: errors.length }); return; }
      try {
        const response = await generateSmart({
          action: 'flashcard',
          institutionId,
          summaryId: summaryIds && summaryIds.length > 0 ? summaryIds[index % summaryIds.length] : undefined,
          related: related ?? true,
        }) as AdaptiveFlashcard;
        if (!response?.id || !response?.front || !response?.back) throw new Error('Invalid generate-smart response');
        cards.push(response);
        completedCount++;
        onProgress?.({ completed: completedCount, total: count, generated: cards.length, failed: errors.length, latestCard: response });
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : String(err);
        errors.push({ index, message: errMessage || 'Unknown generation error', error: err });
        if (import.meta.env.DEV) console.warn(`[AdaptiveGeneration] Card ${index + 1}/${count} failed:`, errMessage || err);
        completedCount++;
        onProgress?.({ completed: completedCount, total: count, generated: cards.length, failed: errors.length });
      }
    };
  });

  await parallelWithLimit(tasks, MAX_CONCURRENT_GENERATIONS);
  const elapsedMs = Math.round(performance.now() - startTime);
  const stats = computeBatchStats(cards, errors, count, elapsedMs);
  if (import.meta.env.DEV) console.log(`[AdaptiveGeneration] Batch complete: ${stats.generated}/${stats.requested} generated, ${stats.failed} failed, ${stats.uniqueKeywords} unique keywords, ${stats.elapsedMs}ms`);
  return { cards, errors, stats };
}

export function mapToFlashcard(card: AdaptiveFlashcard): Flashcard {
  return {
    id: card.id, front: card.front, back: card.back, question: card.front, answer: card.back,
    mastery: 0, summary_id: card.summary_id, keyword_id: card.keyword_id, subtopic_id: card.subtopic_id,
    source: 'ai', fsrs_state: 'new', frontImageUrl: card.front_image_url ?? null, backImageUrl: card.back_image_url ?? null,
  };
}

export function mapBatchToFlashcards(result: AdaptiveGenerationResult): Flashcard[] {
  return result.cards.map(mapToFlashcard);
}

export function getReasonText(reason: SmartMetadata['primary_reason'], pKnow: number): string {
  const pct = Math.round(pKnow * 100);
  switch (reason) {
    case 'new_concept': return 'Es un concepto nuevo que aun no has estudiado.';
    case 'low_mastery': return `Tu dominio es bajo (${pct}%). Necesitas reforzar este concepto.`;
    case 'needs_review': return `Tu dominio es moderado-bajo (${pct}%). Un repaso te ayudar\u00E1 a consolidar.`;
    case 'moderate_mastery': return `Tu dominio es intermedio (${pct}%). Puedes profundizar con ejercicios m\u00E1s desafiantes.`;
    case 'reinforcement': return `Tu dominio es alto (${pct}%). Este ejercicio te ayudar\u00E1 a mantener el conocimiento.`;
    default: return `Concepto seleccionado para estudio (dominio: ${pct}%).`;
  }
}
