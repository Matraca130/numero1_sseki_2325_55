// ============================================================
// Axon — Quiz Session: Pure Helper Functions (P3-S01)
//
// Extracted from useQuizSession.ts to keep it under the
// 500-line Architecture Practices limit.
//
// These are PURE async/sync functions — no React state, no hooks.
// They receive data, return results. The hook sets state from
// the returned results.
//
// Functions:
//   loadAndNormalizeQuestions() — fetch/preload + normalize + shuffle
//   checkAndProcessBackup()   — validate localStorage backup
//   loadKeywordNames()        — non-blocking keyword label fetch
// ============================================================

import { apiCall } from '@/app/lib/api';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion, QuizQuestionListResponse } from '@/app/services/quizApi';
import { normalizeQuestionType, DIFFICULTY_TO_INT, normalizeDifficulty } from '@/app/services/quizConstants';
import {
  loadQuizBackup, clearQuizBackup, validateAndReorderBackup,
} from '@/app/components/student/useQuizBackup';
import type { QuizBackupData } from '@/app/components/student/useQuizBackup';
import { logger } from '@/app/lib/logger';
import { getErrorMsg } from '@/app/lib/error-utils';

// ── Load & Normalize Questions ─────────────────────────

export interface LoadQuestionsResult {
  items: QuizQuestion[];
  warning: string | null;
  usedPreloaded: boolean;
}

/**
 * Load quiz questions from preloaded array or backend API,
 * then filter active, normalize types/difficulty, and shuffle.
 *
 * Pure async function — no React state mutations.
 * Throws on fatal errors (no questions AND no preloaded source).
 */
export async function loadAndNormalizeQuestions(
  quizId: string | undefined,
  summaryId: string | undefined,
  preloadedQuestions: QuizQuestion[] | undefined,
  hasUsedPreloaded: boolean,
): Promise<LoadQuestionsResult> {
  let items: QuizQuestion[] = [];
  let warning: string | null = null;
  let usedPreloaded = hasUsedPreloaded;

  if (preloadedQuestions && preloadedQuestions.length > 0 && !hasUsedPreloaded) {
    // PRELOADED MODE
    usedPreloaded = true;
    items = [...preloadedQuestions];
  } else if (quizId) {
    // STANDALONE MODE: fetch by quizId
    try {
      if (summaryId) {
        // R9 FIX: use service layer — quiz_id now supported in getQuizQuestions filters
        const res = await quizApi.getQuizQuestions(summaryId, { quiz_id: quizId });
        items = res.items || [];
      } else {
        // Edge case: no summaryId — fallback to raw apiCall (backend parentKey may not be required)
        const res = await apiCall<QuizQuestionListResponse | QuizQuestion[]>(
          `/quiz-questions?quiz_id=${quizId}`
        );
        if (Array.isArray(res)) items = res;
        else if (res?.items) items = res.items;
      }
    } catch (err: unknown) {
      logger.warn(
        '[QuizSession] quiz_id filter failed:',
        getErrorMsg(err),
      );
      warning = 'El filtro quiz_id puede no estar disponible aun. Intentando cargar preguntas...';
      items = [];
    }
  } else if (!preloadedQuestions || preloadedQuestions.length === 0) {
    if (!hasUsedPreloaded) {
      throw new Error('No se proporcionaron preguntas ni quiz ID.');
    }
    return { items: [], warning: null, usedPreloaded };
  }

  // Filter active + normalize + shuffle
  items = items
    .filter(q => q.is_active)
    .map(q => ({
      ...q,
      question_type: normalizeQuestionType(q.question_type),
      difficulty: typeof q.difficulty === 'number'
        ? q.difficulty
        : (DIFFICULTY_TO_INT[normalizeDifficulty(q.difficulty)] ?? 2),
    }));
  // Shuffle using Fisher-Yates (uniform distribution)
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return { items, warning, usedPreloaded };
}

// ── Backup Recovery Check ──────────────────────────────

export interface BackupRecoveryResult {
  backup: QuizBackupData;
  reorderedItems: QuizQuestion[];
}

/**
 * Check localStorage for a valid backup, validate against fresh
 * questions, and return reordered items + validated backup data.
 *
 * Returns null if no backup, expired, or stale (< 50% match).
 * Pure function — no React state mutations.
 */
export function checkAndProcessBackup(
  quizId: string,
  items: QuizQuestion[],
): BackupRecoveryResult | null {
  const backup = loadQuizBackup(quizId);
  if (!backup) return null;

  const validated = validateAndReorderBackup(backup, items);
  if (!validated) {
    logger.debug('[QuizSession] backup stale, discarding', quizId);
    clearQuizBackup(quizId);
    return null;
  }

  // Reorder items to match backup order
  const itemMap = new Map(items.map(q => [q.id, q]));
  const reorderedItems = validated.reorderedIds
    .map(id => itemMap.get(id))
    .filter((q): q is QuizQuestion => !!q);

  const validatedBackup: QuizBackupData = {
    quizId: backup.quizId,
    quizTitle: backup.quizTitle,
    questionIds: validated.reorderedIds,
    savedAnswers: validated.remappedAnswers,
    currentIdx: validated.recoveryIdx,
    savedAt: backup.savedAt,
  };

  return { backup: validatedBackup, reorderedItems };
}

// ── Keyword Names Loader ───────────────────────────────

/**
 * Fetch keyword names for a summary (non-blocking).
 * Returns empty object on any error — never throws.
 */
export async function loadKeywordNames(
  summaryId: string,
): Promise<Record<string, string>> {
  try {
    const kwRes = await apiCall<
      { items: Array<{ id: string; term: string }> } | Array<{ id: string; term: string }>
    >(`/keywords?summary_id=${summaryId}`);
    const kwItems = Array.isArray(kwRes) ? kwRes : kwRes?.items || [];
    const map: Record<string, string> = {};
    for (const kw of kwItems) {
      map[kw.id] = kw.term || kw.id.substring(0, 8);
    }
    return map;
  } catch {
    // Non-blocking — QuizResults falls back to truncated IDs
    return {};
  }
}