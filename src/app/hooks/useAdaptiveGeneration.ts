// ============================================================
// useAdaptiveGeneration — extracted from useAdaptiveSession
//
// Handles the "generate AI cards targeting weak keywords" step:
//   - progress tracking
//   - abort controller
//   - error surface
//   - re-entrance guard (isGeneratingRef)
//
// This hook is DELIBERATELY UI-agnostic: it does not know about
// the session phase. The parent hook decides when to call
// `runGeneration` and how to react to its result.
//
// Return shape is internal — the parent composes these values
// into its own public API (no consumer imports this hook
// directly today).
// ============================================================

import { useCallback, useRef, useState } from 'react';
import {
  generateAdaptiveBatch,
  type AdaptiveGenerationResult,
} from '@/app/services/adaptiveGenerationApi';

export interface GenerationProgressInfo {
  completed: number;
  total: number;
  generated: number;
  failed: number;
}

export interface RunGenerationArgs {
  count: number;
  summaryIds: string[];
  institutionId?: string;
}

export interface RunGenerationReturn {
  result: AdaptiveGenerationResult | null;
  aborted: boolean;
}

export function useAdaptiveGeneration() {
  const [generationProgress, setGenerationProgress] = useState<GenerationProgressInfo | null>(null);
  const [lastGenerationResult, setLastGenerationResult] = useState<AdaptiveGenerationResult | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const isGeneratingRef = useRef(false);
  const generationAbortRef = useRef<AbortController | null>(null);

  const resetGeneration = useCallback(() => {
    setGenerationProgress(null);
    setLastGenerationResult(null);
    setGenerationError(null);
  }, []);

  const runGeneration = useCallback(async (
    args: RunGenerationArgs,
  ): Promise<RunGenerationReturn> => {
    if (isGeneratingRef.current) {
      return { result: null, aborted: false };
    }
    isGeneratingRef.current = true;

    setGenerationProgress({
      completed: 0,
      total: args.count,
      generated: 0,
      failed: 0,
    });
    setGenerationError(null);

    generationAbortRef.current = new AbortController();
    const signal = generationAbortRef.current.signal;

    try {
      const result = await generateAdaptiveBatch({
        count: args.count,
        institutionId: args.institutionId,
        related: true,
        signal,
        onProgress: (progress) => {
          setGenerationProgress({
            completed: progress.completed,
            total: progress.total,
            generated: progress.generated,
            failed: progress.failed,
          });
        },
        summaryIds: args.summaryIds,
      });

      if (signal.aborted) {
        return { result: null, aborted: true };
      }

      setLastGenerationResult(result);
      return { result, aborted: false };
    } catch (err) {
      if (import.meta.env.DEV) console.error('[AdaptiveGeneration] Generation failed:', err);
      setGenerationError('La generación de flashcards falló. Inténtalo de nuevo.');
      return { result: null, aborted: false };
    } finally {
      isGeneratingRef.current = false;
      generationAbortRef.current = null;
    }
  }, []);

  const abortGeneration = useCallback(() => {
    const controller = generationAbortRef.current;
    if (controller) {
      controller.abort();
      if (import.meta.env.DEV) console.log('[AdaptiveGeneration] Generation aborted');
    }
    setGenerationProgress(null);
    setGenerationError(null);
  }, []);

  const setNoCardsError = useCallback(() => {
    setGenerationError('No se pudieron generar flashcards válidas. Inténtalo de nuevo.');
  }, []);

  return {
    generationProgress,
    lastGenerationResult,
    generationError,
    isGeneratingRef,
    generationAbortRef,
    runGeneration,
    abortGeneration,
    resetGeneration,
    setNoCardsError,
  };
}
