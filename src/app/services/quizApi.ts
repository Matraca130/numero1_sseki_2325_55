// ============================================================
// Axon — Quiz API Service (barrel re-exporter)
//
// R1 Refactor: Domain-specific logic extracted to:
//   quizQuestionsApi.ts — /quiz-questions CRUD
//   quizzesEntityApi.ts — /quizzes CRUD
//   quizAttemptsApi.ts  — /quiz-attempts
//   reviewsApi.ts       — /reviews
//   smartGenerateApi.ts — /ai/generate-smart
//
// This file re-exports everything for backwards compatibility.
// All existing `import from '@/app/services/quizApi'` continue
// to work unchanged.
//
// Study Sessions & BKT States (P2-S01):
//   studySessionApi.ts, bktApi.ts — also re-exported here.
// ============================================================

// ── Quiz Questions ────────────────────────────────────────
export type {
  QuestionSource,
  QuizQuestion,
  QuizQuestionListResponse,
  CreateQuizQuestionPayload,
  UpdateQuizQuestionPayload,
} from '@/app/services/quizQuestionsApi';
export {
  getQuizQuestions,
  getQuizQuestion,
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
  restoreQuizQuestion,
} from '@/app/services/quizQuestionsApi';

// ── Quiz Entities ─────────────────────────────────────────
export type {
  QuizEntity,
  Quiz,
  QuizEntityListResponse,
  CreateQuizPayload,
  UpdateQuizPayload,
} from '@/app/services/quizzesEntityApi';
export {
  getQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  restoreQuiz,
} from '@/app/services/quizzesEntityApi';

// ── Quiz Attempts ─────────────────────────────────────────
export type { QuizAttempt } from '@/app/services/quizAttemptsApi';
export { createQuizAttempt, getQuizAttempts } from '@/app/services/quizAttemptsApi';

// ── Reviews ───────────────────────────────────────────────
export type { ReviewPayload, Review } from '@/app/services/reviewsApi';
export { createReview } from '@/app/services/reviewsApi';

// ── Smart Generation ────────────────────────────────────────
export type {
  SmartGenerateParams,
  SmartGenerateItem,
  SmartGenerateError,
  SmartGenerateResponse,
} from '@/app/services/smartGenerateApi';
export { generateSmartQuiz } from '@/app/services/smartGenerateApi';

// ── Re-exports: Study Sessions (P2-S01) ────────────────
export type { StudySession } from '@/app/services/studySessionApi';
export { createStudySession, closeStudySession, getStudySessions } from '@/app/services/studySessionApi';

// ── Re-exports: BKT States (P2-S01) ────────────────────
export type { BktStatePayload, BktState } from '@/app/services/bktApi';
export { upsertBktState, getBktStates } from '@/app/services/bktApi';

// ── Re-exports: Quiz Constants (backwards compat) ────────
export type { QuestionType, Difficulty } from '@/app/services/quizConstants';
