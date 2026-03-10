// ============================================================
// Axon — useSmartGeneration Hook (v4.5)
//
// Unified hook for smart AI generation of flashcards AND quiz
// questions. Uses POST /ai/generate-smart with subtopic-level
// granularity via the backend's BKT-based targeting system.
// ============================================================

import { useState, useCallback, useRef } from 'react';
import {
  generateSmart,
  type SmartTargetMeta,
  type SmartBulkResponse,
  type GeneratedFlashcard,
  type GeneratedQuestion,
} from '@/app/services/aiService';

// ── Types ─────────────────────────────────────────────────

export type SmartGenerationAction = 'flashcard' | 'quiz_question';

export type SmartGenerationPhase =
  | 'idle'
  | 'generating'
  | 'done'
  | 'error';

/** A generated item with its smart metadata */
export interface SmartGeneratedItem {
  id: string;
  type: SmartGenerationAction;
  /** For flashcards */
  front?: string;
  back?: string;
  /** For quiz questions */
  question?: string;
  options?: string[];
  correct_answer?: string;
  explanation?: string;
  difficulty?: string;
  /** Content hierarchy IDs */
  summary_id?: string;
  keyword_id: string;
  keyword_name: string;
  subtopic_id?: string | null;
  /** Smart targeting metadata */
  _smart: SmartTargetMeta;
}

export interface SmartGenerationProgress {
  completed: number;
  total: number;
  generated: number;
  failed: number;
  /** Current latest item (for streaming UI) */
  latestItem?: SmartGeneratedItem;
}

export interface SmartGenerationResult {
  items: SmartGeneratedItem[];
  errors: Array<{ keyword_id: string; keyword_name: string; error: string }>;
  stats: {
    requested: number;
    generated: number;
    failed: number;
    uniqueKeywords: number;
    uniqueSubtopics: number;
    avgPKnow: number;
    totalTokens: number;
    elapsedMs: number;
  };
}

export interface SmartGenerationParams {
  action: SmartGenerationAction;
  count: number;
  /** Scope to a specific summary (subtopic-level targeting) */
  summaryId?: string;
  /** Scope to institution */
  institutionId?: string;
  /** Auto-link quiz_questions to a quiz entity */
  quizId?: string;
  /** For flashcards: generate related to keyword or general */
  related?: boolean;
}

// ── Hook ──────────────────────────────────────────────────

export function useSmartGeneration() {
  const [phase, setPhase] = useState<SmartGenerationPhase>('idle');
  const [progress, setProgress] = useState<SmartGenerationProgress | null>(null);
  const [result, setResult] = useState<SmartGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const generate = useCallback(async (params: SmartGenerationParams) => {
    const { action, count, summaryId, institutionId, quizId, related } = params;

    if (count <= 0) return;

    setPhase('generating');
    setError(null);
    setResult(null);
    abortRef.current = false;

    setProgress({
      completed: 0,
      total: count,
      generated: 0,
      failed: 0,
    });

    const startTime = performance.now();

    try {
      const allItems: SmartGeneratedItem[] = [];
      const allErrors: Array<{ keyword_id: string; keyword_name: string; error: string }> = [];

      const chunks: number[] = [];
      let remaining = count;
      while (remaining > 0) {
        const chunkSize = Math.min(remaining, 10);
        chunks.push(chunkSize);
        remaining -= chunkSize;
      }

      for (const chunkSize of chunks) {
        if (abortRef.current) break;

        try {
          if (chunkSize === 1) {
            // Single item: returns the item directly (not wrapped in items[])
            const singleResult = await generateSmart({
              action,
              summaryId,
              institutionId,
              quizId,
              related,
            });

            if (singleResult?.id) {
              const item = mapSingleToItem(singleResult, action);
              allItems.push(item);
            }
          } else {
            // Bulk: returns { items[], errors[], _meta }
            const bulkResult = await generateSmart({
              action,
              summaryId,
              institutionId,
              quizId,
              related,
              count: chunkSize,
            }) as SmartBulkResponse;

            if (bulkResult?.items) {
              for (const bi of bulkResult.items) {
                allItems.push({
                  id: bi.id,
                  type: bi.type as SmartGenerationAction,
                  keyword_id: bi.keyword_id,
                  keyword_name: bi.keyword_name,
                  summary_id: bi.summary_id,
                  _smart: bi._smart,
                });
              }
            }
            if (bulkResult?.errors) {
              allErrors.push(...bulkResult.errors);
            }
          }
        } catch (err: any) {
          allErrors.push({
            keyword_id: 'unknown',
            keyword_name: 'Error de generacion',
            error: err?.message || 'Error desconocido',
          });
        }

        // Update progress after each chunk
        setProgress({
          completed: allItems.length + allErrors.length,
          total: count,
          generated: allItems.length,
          failed: allErrors.length,
          latestItem: allItems[allItems.length - 1],
        });
      }

      const elapsedMs = performance.now() - startTime;

      // Compute stats
      const keywordIds = new Set(allItems.map(i => i.keyword_id));
      const subtopicIds = new Set(
        allItems.map(i => i.subtopic_id || i._smart?.target_subtopic).filter(Boolean)
      );
      const avgPKnow = allItems.length > 0
        ? allItems.reduce((sum, i) => sum + (i._smart?.p_know ?? 0), 0) / allItems.length
        : 0;

      const genResult: SmartGenerationResult = {
        items: allItems,
        errors: allErrors,
        stats: {
          requested: count,
          generated: allItems.length,
          failed: allErrors.length,
          uniqueKeywords: keywordIds.size,
          uniqueSubtopics: subtopicIds.size,
          avgPKnow,
          totalTokens: 0, // tokens not available in bulk response items
          elapsedMs,
        },
      };

      setResult(genResult);
      setPhase('done');
      return genResult;

    } catch (err: any) {
      setError(err?.message || 'Error en generacion AI');
      setPhase('error');
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setProgress(null);
    setResult(null);
    setError(null);
    abortRef.current = false;
  }, []);

  return {
    phase,
    progress,
    result,
    error,
    generate,
    abort,
    reset,
  };
}

// ── Helpers ───────────────────────────────────────────────

/** Map a single generate-smart response to SmartGeneratedItem */
function mapSingleToItem(
  raw: any,
  action: SmartGenerationAction
): SmartGeneratedItem {
  return {
    id: raw.id,
    type: action,
    front: raw.front,
    back: raw.back,
    question: raw.question,
    options: raw.options,
    correct_answer: raw.correct_answer,
    explanation: raw.explanation,
    difficulty: raw.difficulty,
    summary_id: raw.summary_id,
    keyword_id: raw.keyword_id || raw._smart?.target_keyword || '',
    keyword_name: raw._smart?.target_keyword || '',
    subtopic_id: raw.subtopic_id,
    _smart: raw._smart || {
      target_keyword: '',
      target_summary: '',
      target_subtopic: null,
      p_know: 0,
      need_score: 0,
      primary_reason: 'new_concept' as const,
    },
  };
}
