// ============================================================
// Axon — Professor: useQuizQuestionsLoader Hook (R19 Extraction)
//
// Shared hook that encapsulates the question-loading pattern
// used by QuizQuestionsEditor (and potentially others).
//
// Handles:
//   - summaryId-gated loading (null → empty questions)
//   - Configurable filters (question_type, difficulty, quiz_id, etc.)
//   - Optional fallback on error (retry without filters)
//   - Backend warning state for UI feedback
//   - Stable reload() callback for CRUD refresh
//
// Consumer:
//   QuizQuestionsEditor.tsx — filters by quiz_id with fallback
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion } from '@/app/services/quizApi';
import { logger } from '@/app/lib/logger';
import { getErrorMsg } from '@/app/lib/error-utils';

// ── Options ──────────────────────────────────────────────

export interface UseQuizQuestionsLoaderOptions {
  /** Summary ID to load questions from. Null = skip loading. */
  summaryId: string | null;
  /** Filters passed directly to getQuizQuestions (e.g. quiz_id, question_type). */
  filters?: Record<string, unknown>;
  /**
   * If true, on primary load failure the hook retries without
   * filters as a fallback (limit: 200). Used by QuizQuestionsEditor
   * to gracefully handle quiz_id filter errors.
   */
  fallbackOnError?: boolean;
  /** Label for logger messages. Defaults to 'Quiz'. */
  label?: string;
}

// ── Return type ──────────────────────────────────────────

export interface UseQuizQuestionsLoaderReturn {
  questions: QuizQuestion[];
  loading: boolean;
  /** Non-null when fallback was used (primary load failed). */
  backendWarning: string | null;
  /** Stable callback to re-trigger loading. Safe to pass as prop. */
  reload: () => Promise<void>;
}

// ── Hook ─────────────────────────────────────────────────

export function useQuizQuestionsLoader({
  summaryId,
  filters,
  fallbackOnError = false,
  label = 'Quiz',
}: UseQuizQuestionsLoaderOptions): UseQuizQuestionsLoaderReturn {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  // FIX: Start loading=true when summaryId is present to match original
  // QuizQuestionsEditor behavior (avoids 1-frame empty state flash)
  const [loading, setLoading] = useState(!!summaryId);
  const [backendWarning, setBackendWarning] = useState<string | null>(null);

  // Ref-mirror filters to avoid stale closure in reload()
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const summaryIdRef = useRef(summaryId);
  summaryIdRef.current = summaryId;

  const doLoad = useCallback(
    async (isCancelled?: () => boolean) => {
      // Guard against being accidentally invoked as an event handler
      // (e.g. onClick={doLoad} would pass a SyntheticEvent here).
      const cancelled =
        typeof isCancelled === 'function' ? isCancelled : () => false;

      const sid = summaryIdRef.current;
      if (!sid) {
        if (cancelled()) return;
        setQuestions([]);
        setLoading(false);
        setBackendWarning(null);
        return;
      }

      setLoading(true);
      setBackendWarning(null);

      try {
        const res = await quizApi.getQuizQuestions(sid, filtersRef.current as any);
        if (cancelled()) return;
        setQuestions(res.items || []);
      } catch (err: unknown) {
        if (cancelled()) return;
        if (fallbackOnError) {
          logger.warn(`[${label}] Primary load failed:`, getErrorMsg(err));
          setBackendWarning(
            'Error al cargar preguntas del quiz. Se muestran todas las del resumen como fallback.',
          );
          // Fallback: load all questions for the summary without filters
          try {
            const fallback = await quizApi.getQuizQuestions(sid, { limit: 200 });
            if (cancelled()) return;
            setQuestions(fallback.items || []);
          } catch (fallbackErr: unknown) {
            if (cancelled()) return;
            logger.error(`[${label}] Fallback also failed:`, getErrorMsg(fallbackErr));
            setQuestions([]);
          }
        } else {
          logger.error(`[${label}] Questions load error:`, err);
          setQuestions([]);
        }
      } finally {
        if (!cancelled()) setLoading(false);
      }
    },
    [fallbackOnError, label],
  );

  // Auto-load when summaryId or filters change.
  // The cancelled flag prevents a stale response from a previous summaryId/filter
  // combination from overwriting the data fetched for the current one.
  // NOTE: the cleanup MUST live here (in the effect), not inside the async
  // useCallback — returning a function from an async function resolves the
  // Promise with that function instead of registering a React cleanup.
  useEffect(() => {
    let cancelled = false;
    doLoad(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [summaryId, filters, doLoad]);

  // Public reload() ignores any args (e.g. event handlers passing a SyntheticEvent)
  // and never receives an isCancelled — manual reloads always commit their result.
  const reload = useCallback(async () => {
    await doLoad();
  }, [doLoad]);

  return { questions, loading, backendWarning, reload };
}
