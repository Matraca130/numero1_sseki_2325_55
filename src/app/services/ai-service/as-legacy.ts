// ============================================================
// Axon — AI Legacy Aliases (deprecated)
// Split from aiService.ts (PN-6)
// ============================================================

import type { GeneratedFlashcard, GeneratedQuestion } from './as-types';

/**
 * @deprecated REMOVED from backend in PHASE-A2 CLEANUP.
 */
export async function listModels(): Promise<never> {
  throw new Error(
    '[aiService] listModels() is no longer available. ' +
    'Backend removed GET /ai/list-models in PHASE-A2 CLEANUP.'
  );
}

/** @deprecated Use generateFlashcard() instead */
export async function generateFlashcards(
  _topic: string,
  _count: number = 5,
  _context?: string
): Promise<GeneratedFlashcard[]> {
  if (import.meta.env.DEV) {
    console.warn('[aiService] generateFlashcards() is deprecated. Use generateFlashcard({ summaryId }) instead.');
  }
  return [];
}

/** @deprecated Use generateQuizQuestion() instead */
export async function generateQuiz(
  _topic: string,
  _count: number = 3,
  _difficulty?: string
): Promise<GeneratedQuestion[]> {
  if (import.meta.env.DEV) {
    console.warn('[aiService] generateQuiz() is deprecated. Use generateQuizQuestion({ summaryId }) instead.');
  }
  return [];
}
