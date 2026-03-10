// ============================================================
// Axon — Quiz Session: Pure Helper Functions (P3-S01)
//
// Pure async/sync functions — no React state, no hooks.
// Functions:
//   loadAndNormalizeQuestions() — fetch/preload + normalize + shuffle
//   checkAndProcessBackup()   — validate localStorage backup
//   loadKeywordNames()        — non-blocking keyword label fetch
// ============================================================

import { apiCall } from '@/app/lib/api';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion, QuizQuestionListResponse } from '@/app/services/quizApi';
import { normalizeQuestionType } from '@/app/services/quizConstants';
import {
  loadQuizBackup, clearQuizBackup, validateAndReorderBackup,
} from '@/app/components/student/useQuizBackup';
import type { QuizBackupData } from '@/app/components/student/useQuizBackup';
import { logger } from '@/app/lib/logger';
import { getErrorMsg } from '@/app/lib/error-utils';

export interface LoadQuestionsResult {
  items: QuizQuestion[];
  warning: string | null;
  usedPreloaded: boolean;
}

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
    usedPreloaded = true;
    items = [...preloadedQuestions];
  } else if (quizId) {
    try {
      if (summaryId) {
        const res = await quizApi.getQuizQuestions(summaryId, { quiz_id: quizId });
        items = res.items || [];
      } else {
        const res = await apiCall<QuizQuestionListResponse | QuizQuestion[]>(
          `/quiz-questions?quiz_id=${quizId}`
        );
        if (Array.isArray(res)) items = res;
        else if (res?.items) items = res.items;
      }
    } catch (err: unknown) {
      logger.warn('[QuizSession] quiz_id filter failed:', getErrorMsg(err));
      warning = 'El filtro quiz_id puede no estar disponible aun.';
      items = [];
    }
  } else if (!preloadedQuestions || preloadedQuestions.length === 0) {
    if (!hasUsedPreloaded) throw new Error('No se proporcionaron preguntas ni quiz ID.');
    return { items: [], warning: null, usedPreloaded };
  }

  items = items
    .filter(q => q.is_active)
    .map(q => ({
      ...q,
      question_type: normalizeQuestionType(q.question_type),
      difficulty: typeof q.difficulty === 'string'
        ? ({ easy: 1, medium: 2, hard: 3 }[q.difficulty as string] ?? 2)
        : q.difficulty,
    }));
  items = items.sort(() => Math.random() - 0.5);

  return { items, warning, usedPreloaded };
}

export interface BackupRecoveryResult {
  backup: QuizBackupData;
  reorderedItems: QuizQuestion[];
}

export function checkAndProcessBackup(
  quizId: string,
  items: QuizQuestion[],
): BackupRecoveryResult | null {
  const backup = loadQuizBackup(quizId);
  if (!backup) return null;
  const validated = validateAndReorderBackup(backup, items);
  if (!validated) {
    clearQuizBackup(quizId);
    return null;
  }
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

export async function loadKeywordNames(
  summaryId: string,
): Promise<Record<string, string>> {
  try {
    const kwRes = await apiCall<
      { items: Array<{ id: string; term: string }> } | Array<{ id: string; term: string }>
    >(`/keywords?summary_id=${summaryId}`);
    const kwItems = Array.isArray(kwRes) ? kwRes : kwRes?.items || [];
    const map: Record<string, string> = {};
    for (const kw of kwItems) map[kw.id] = kw.term || kw.id.substring(0, 8);
    return map;
  } catch {
    return {};
  }
}