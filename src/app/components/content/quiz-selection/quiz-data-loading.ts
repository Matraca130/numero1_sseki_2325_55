/**
 * Data loading functions for QuizSelection.
 * Handles summary loading, quiz fetching, and question loading.
 */

import { getTopicSummaries } from '@/app/services/platformApi';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion, QuestionType, Difficulty, QuizEntity, QuizEntityListResponse } from '@/app/services/quizApi';
import type { Summary } from '@/app/types/platform';
import { apiCall } from '@/app/lib/api';
import { logger } from '@/app/lib/logger';

export async function loadSummariesForTopicFn(
  topicId: string,
): Promise<Summary[]> {
  try {
    const s: any = await getTopicSummaries(topicId);
    const arr: Summary[] = Array.isArray(s) ? s : (s?.items || []);
    const published = arr.filter(x => x.status === 'published');
    return published.length > 0 ? published : arr;
  } catch (err) {
    logger.error('[QuizView] Error loading summaries for topic:', topicId, err);
    return [];
  }
}

export async function loadQuizzesForSummary(
  summaryId: string,
): Promise<{ quizzes: QuizEntity[]; practiceCount: number; error: string | null }> {
  const [quizzesResult, questionsResult] = await Promise.allSettled([
    apiCall<QuizEntityListResponse | QuizEntity[]>(`/quizzes?summary_id=${summaryId}`),
    quizApi.getQuizQuestions(summaryId, { limit: 1 }),
  ]);

  let quizzes: QuizEntity[] = [];
  if (quizzesResult.status === 'fulfilled') {
    const res = quizzesResult.value;
    if (Array.isArray(res)) {
      quizzes = res;
    } else if (res && typeof res === 'object' && 'items' in res) {
      quizzes = res.items || [];
    }
    quizzes = quizzes.filter(q => q.is_active);
  }

  let practiceCount = 0;
  if (questionsResult.status === 'fulfilled') {
    const qRes = questionsResult.value;
    practiceCount = qRes.total || (qRes.items || []).length;
  }

  const error = quizzes.length === 0 && practiceCount === 0
    ? 'No hay quizzes ni preguntas para este resumen. El profesor aun no ha creado contenido de quiz aqui.'
    : null;

  return { quizzes, practiceCount, error };
}

export async function loadQuizQuestions(
  quiz: QuizEntity,
  maxQuestions: number,
): Promise<{ items: QuizQuestion[]; error: string | null }> {
  // Build filters: always filter by quiz_id; also by block_id when the quiz is block-scoped
  const params = new URLSearchParams();
  params.set('summary_id', quiz.summary_id);
  params.set('quiz_id', quiz.id);
  if (quiz.block_id) params.set('block_id', quiz.block_id);
  params.set('limit', '200');

  let items: QuizQuestion[] = [];
  try {
    const res = await apiCall<any>(`/quiz-questions?${params}`);
    const arr = Array.isArray(res) ? res : (res?.items || []);
    items = arr.filter((q: any) => q.is_active);
  } catch {
    // Fallback: fetch by summary + block_id only
    const filters: { limit: number; block_id?: string } = { limit: 200 };
    if (quiz.block_id) filters.block_id = quiz.block_id;
    const res = await quizApi.getQuizQuestions(quiz.summary_id, filters);
    items = (res.items || []).filter(q => q.is_active);
  }

  if (items.length === 0) {
    return { items: [], error: 'Este quiz no tiene preguntas activas.' };
  }

  items = items.sort(() => Math.random() - 0.5);
  if (maxQuestions > 0 && maxQuestions < items.length) {
    items = items.slice(0, maxQuestions);
  }

  return { items, error: null };
}

export async function loadPracticeQuestions(
  summaryId: string,
  filters: { difficulty: Difficulty | ''; type: QuestionType | '' },
  maxQuestions: number,
): Promise<{ items: QuizQuestion[]; error: string | null }> {
  const apiFilters: any = { limit: 200 };
  if (filters.difficulty) apiFilters.difficulty = filters.difficulty;
  if (filters.type) apiFilters.question_type = filters.type;

  const res = await quizApi.getQuizQuestions(summaryId, apiFilters);
  let items = (res.items || []).filter(q => q.is_active);

  if (items.length === 0) {
    return { items: [], error: 'Este resumen no tiene preguntas de quiz activas.' };
  }

  items = items.sort(() => Math.random() - 0.5);
  if (maxQuestions > 0 && maxQuestions < items.length) {
    items = items.slice(0, maxQuestions);
  }

  return { items, error: null };
}

export async function loadBlockPracticeQuestions(
  summaryId: string,
  blockId: string,
  filters: { difficulty: Difficulty | ''; type: QuestionType | '' },
  maxQuestions: number,
): Promise<{ items: QuizQuestion[]; error: string | null }> {
  const apiFilters: any = { limit: 200, block_id: blockId };
  if (filters.difficulty) apiFilters.difficulty = filters.difficulty;
  if (filters.type) apiFilters.question_type = filters.type;

  const res = await quizApi.getQuizQuestions(summaryId, apiFilters);
  let items = (res.items || []).filter(q => q.is_active);

  if (items.length === 0) {
    return { items: [], error: 'Este bloque no tiene preguntas de quiz activas.' };
  }

  items = items.sort(() => Math.random() - 0.5);
  if (maxQuestions > 0 && maxQuestions < items.length) {
    items = items.slice(0, maxQuestions);
  }

  return { items, error: null };
}

export async function loadBlocksForSummary(
  summaryId: string,
): Promise<{ id: string; title: string; type: string }[]> {
  try {
    const res = await apiCall<any>(`/summary-blocks?summary_id=${summaryId}`);
    const items = Array.isArray(res) ? res : (res?.items || []);
    return items
      .filter((b: any) => b.is_active !== false)
      .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((b: any) => ({
        id: b.id,
        title: b.content?.title || b.type || `Bloque ${b.order_index + 1}`,
        type: b.type,
      }));
  } catch {
    return [];
  }
}
