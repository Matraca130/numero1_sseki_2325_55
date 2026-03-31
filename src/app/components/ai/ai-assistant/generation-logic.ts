/**
 * Generation logic for flashcards, quiz, and concept explanations.
 */

import {
  generateFlashcard,
  generateQuizQuestion,
  explainConcept as explainConceptApi,
} from '@/app/services/aiService';
import type { GeneratedFlashcard, GeneratedQuestion } from '@/app/services/aiService';

export async function generateFlashcardsForTopic(summaryId: string, count = 5): Promise<GeneratedFlashcard[]> {
  const cards: GeneratedFlashcard[] = [];
  for (let i = 0; i < count; i++) {
    const card = await generateFlashcard({ summaryId });
    cards.push(card);
  }
  return cards;
}

export async function generateQuizQuestions(summaryId: string, count = 3): Promise<GeneratedQuestion[]> {
  const questions: GeneratedQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const q = await generateQuizQuestion({ summaryId });
    questions.push(q);
  }
  return questions;
}

export async function explainConceptTerm(concept: string, summaryId?: string): Promise<string> {
  return await explainConceptApi(concept, summaryId);
}
