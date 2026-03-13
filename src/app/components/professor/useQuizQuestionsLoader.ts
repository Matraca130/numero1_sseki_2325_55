// ============================================================
// Axon — Professor: useQuizQuestionsLoader Hook (R19 Extraction)
//
// Shared hook that encapsulates the question-loading pattern
// used by both ProfessorQuizzesPage and QuizQuestionsEditor.
//
// Handles:
//   - summaryId-gated loading (null → empty questions)
//   - Configurable filters (question_type, difficulty, quiz_id, etc.)
//   - Optional fallback on error (retry without filters)
//   - Backend warning state for UI feedback
//   - Stable reload() callback for CRUD refresh
//
// Consumers:
//   ProfessorQuizzesPage.tsx  — filters by type/difficulty/keyword
//   QuizQuestionsEditor.tsx   — filters by quiz_id with fallback
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
  const [loading, setLoading] = useState(false);
  const [backendWarning, setBackendWarning] = useState<string | null>(null);

  // Ref-mirror filters to avoid stale closure in reload()
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const summaryIdRef = useRef(summaryId);
  summaryIdRef.current = summaryId;

  const doLoad = useCallback(async () => {
    const sid = summaryIdRef.current;
    if (!sid) {
      setQuestions([]);
      setBackendWarning(null);
      return;
    }

    setLoading(true);
    setBackendWarning(null);

    try {
      const res = await quizApi.getQuizQuestions(sid, filtersRef.current as any);
      setQuestions(res.items || []);
    } catch (err: unknown) {
      if (fallbackOnError) {
        logger.warn(`[${label}] Primary load failed:`, getErrorMsg(err));
        setBackendWarning(
          'Error al cargar preguntas del quiz. Se muestran todas las del resumen como fallback.',
        );
        // Fallback: load all questions for the summary without filters
        try {
          const fallback = await quizApi.getQuizQuestions(sid, { limit: 200 });
          setQuestions(fallback.items || []);
        } catch (fallbackErr: unknown) {
          logger.error(`[${label}] Fallback also failed:`, getErrorMsg(fallbackErr));
          setQuestions([]);
        }
      } else {
        logger.error(`[${label}] Questions load error:`, err);
        setQuestions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [fallbackOnError, label]);

  // Auto-load when summaryId or filters change
  useEffect(() => {
    doLoad();
  }, [summaryId, filters, doLoad]);

  return { questions, loading, backendWarning, reload: doLoad };
}
