// ============================================================
// Axon — Student API: AI Features (DEPRECATED) + Compat Aliases
// Extracted from studentApi.ts (zero functional changes)
// ============================================================

import { apiCall } from '@/app/lib/api';
import type { StudySummary } from '@/app/types/student';
import { getStudySummary, saveStudySummary, getKeywords, saveKeywords } from './sa-content';

// ═════════════════════ AI FEATURES ═════════════════════

export async function aiChat(
  messages: Array<{ role: string; content: string }>,
  context?: any
): Promise<{ reply: string }> {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const message = lastUserMsg?.content || '';
  const history = messages.slice(0, -1);

  const data = await apiCall<{ response: string }>('/ai/rag-chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      history: history.length > 0 ? history : undefined,
      summary_id: context?.summaryId || context?.summary_id || undefined,
    }),
  });
  return { reply: data.response };
}

/**
 * @deprecated Use aiService.generateFlashcard({ summaryId }) instead.
 */
export async function aiGenerateFlashcards(
  _topic: string,
  _count = 5,
  _context?: any
): Promise<{ flashcards: any[] }> {
  console.warn(
    '[studentApi] aiGenerateFlashcards() is DEPRECATED and non-functional. ' +
    'Backend POST /ai/generate requires summary_id (UUID). ' +
    'Use aiService.generateFlashcard({ summaryId }) or aiService.generateSmart({ summaryId }) instead.'
  );
  return { flashcards: [] };
}

/**
 * @deprecated Use aiService.generateQuizQuestion({ summaryId }) instead.
 */
export async function aiGenerateQuiz(
  _topic: string,
  _count = 3,
  _difficulty = 'intermediate'
): Promise<{ questions: any[] }> {
  console.warn(
    '[studentApi] aiGenerateQuiz() is DEPRECATED. ' +
    'Use aiService.generateQuizQuestion({ summaryId }) instead.'
  );
  return { questions: [] };
}

/**
 * @deprecated Use aiService.explainConcept() instead.
 */
export async function aiExplain(
  concept: string,
  context?: any
): Promise<{ explanation: string }> {
  const message = context
    ? `Explica el siguiente concepto en el contexto de "${context}": ${concept}`
    : `Explica el siguiente concepto de forma clara y concisa: ${concept}`;

  const data = await apiCall<{ response: string }>('/ai/rag-chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return { explanation: data.response };
}

// ═════════════════ SEED (removed) ═════════════════

export async function seedDemoData(_studentId?: string): Promise<void> {}

// ════════════ BACKWARD COMPATIBILITY ALIASES ════════════

export const getCourseKeywords = getKeywords;
export const saveTopicKeywords = saveKeywords;

export function getSummary(
  courseId: string,
  topicId: string,
  studentId?: string
): Promise<StudySummary | null> {
  return getStudySummary(studentId || '', courseId, topicId);
}

export function saveSummary(
  courseId: string,
  topicId: string,
  data: Partial<StudySummary>,
  studentId?: string
): Promise<StudySummary> {
  return saveStudySummary(studentId || '', courseId, topicId, data);
}
