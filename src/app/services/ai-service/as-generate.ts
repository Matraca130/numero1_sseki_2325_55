// ============================================================
// Axon — AI Generate Service (basic generation)
// Split from aiService.ts (PN-6)
//
// Backend: POST /ai/generate
// ============================================================

import { apiCall } from '@/app/lib/api';
import type { GeneratedFlashcard, GeneratedQuestion } from './as-types';
import { handleRateLimitError } from './as-types';

/**
 * Generate a flashcard via AI.
 * Backend: POST /ai/generate (action: 'flashcard')
 */
export async function generateFlashcard(
  params: {
    summaryId: string;
    keywordId?: string;
    subtopicId?: string;
    blockId?: string;
    related?: boolean;
  }
): Promise<GeneratedFlashcard> {
  try {
    const data = await apiCall<GeneratedFlashcard>('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        action: 'flashcard',
        summary_id: params.summaryId,
        keyword_id: params.keywordId,
        subtopic_id: params.subtopicId,
        block_id: params.blockId,
        related: params.related ?? true,
      }),
    });
    return data;
  } catch (err: unknown) {
    handleRateLimitError(err);
  }
}

/**
 * Generate a quiz question via AI.
 * Backend: POST /ai/generate (action: 'quiz_question')
 */
export async function generateQuizQuestion(
  params: {
    summaryId: string;
    keywordId?: string;
    subtopicId?: string;
    blockId?: string;
    wrongAnswer?: string;
  }
): Promise<GeneratedQuestion> {
  try {
    const data = await apiCall<GeneratedQuestion>('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        action: 'quiz_question',
        summary_id: params.summaryId,
        keyword_id: params.keywordId,
        subtopic_id: params.subtopicId,
        block_id: params.blockId,
        wrong_answer: params.wrongAnswer,
      }),
    });
    return data;
  } catch (err: unknown) {
    handleRateLimitError(err);
  }
}
