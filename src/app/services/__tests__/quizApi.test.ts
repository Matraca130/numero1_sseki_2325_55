// ============================================================
// quizApi.test.ts — Tests for the quizApi barrel re-exporter.
//
// quizApi.ts is a thin barrel that re-exports functions and types
// from domain-specific modules:
//   - quizQuestionsApi
//   - quizzesEntityApi
//   - quizAttemptsApi
//   - reviewsApi
//   - smartGenerateApi
//   - studySessionApi
//   - bktApi
//   - quizConstants (types only)
//
// These tests guard the public API surface so consumers keep
// importing from '@/app/services/quizApi' without surprises.
// ============================================================

import { describe, it, expect } from 'vitest';

import * as quizApi from '@/app/services/quizApi';

describe('quizApi barrel', () => {
  describe('Quiz Questions re-exports', () => {
    it('re-exports getQuizQuestions as a function', () => {
      expect(typeof quizApi.getQuizQuestions).toBe('function');
    });

    it('re-exports getQuizQuestion as a function', () => {
      expect(typeof quizApi.getQuizQuestion).toBe('function');
    });

    it('re-exports createQuizQuestion as a function', () => {
      expect(typeof quizApi.createQuizQuestion).toBe('function');
    });

    it('re-exports updateQuizQuestion as a function', () => {
      expect(typeof quizApi.updateQuizQuestion).toBe('function');
    });

    it('re-exports deleteQuizQuestion as a function', () => {
      expect(typeof quizApi.deleteQuizQuestion).toBe('function');
    });

    it('re-exports restoreQuizQuestion as a function', () => {
      expect(typeof quizApi.restoreQuizQuestion).toBe('function');
    });
  });

  describe('Quiz Entity re-exports', () => {
    it('re-exports getQuizzes', () => {
      expect(typeof quizApi.getQuizzes).toBe('function');
    });

    it('re-exports createQuiz', () => {
      expect(typeof quizApi.createQuiz).toBe('function');
    });

    it('re-exports updateQuiz', () => {
      expect(typeof quizApi.updateQuiz).toBe('function');
    });

    it('re-exports deleteQuiz', () => {
      expect(typeof quizApi.deleteQuiz).toBe('function');
    });

    it('re-exports restoreQuiz', () => {
      expect(typeof quizApi.restoreQuiz).toBe('function');
    });
  });

  describe('Quiz Attempt re-exports', () => {
    it('re-exports createQuizAttempt', () => {
      expect(typeof quizApi.createQuizAttempt).toBe('function');
    });

    it('re-exports getQuizAttempts', () => {
      expect(typeof quizApi.getQuizAttempts).toBe('function');
    });
  });

  describe('Review re-exports', () => {
    it('re-exports createReview', () => {
      expect(typeof quizApi.createReview).toBe('function');
    });
  });

  describe('Smart Generation re-exports', () => {
    it('re-exports generateSmartQuiz', () => {
      expect(typeof quizApi.generateSmartQuiz).toBe('function');
    });
  });

  describe('Study Session re-exports (P2-S01)', () => {
    it('re-exports createStudySession', () => {
      expect(typeof quizApi.createStudySession).toBe('function');
    });

    it('re-exports closeStudySession', () => {
      expect(typeof quizApi.closeStudySession).toBe('function');
    });

    it('re-exports getStudySessions', () => {
      expect(typeof quizApi.getStudySessions).toBe('function');
    });
  });

  describe('BKT re-exports (P2-S01)', () => {
    it('re-exports upsertBktState', () => {
      expect(typeof quizApi.upsertBktState).toBe('function');
    });

    it('re-exports getBktStates', () => {
      expect(typeof quizApi.getBktStates).toBe('function');
    });
  });

  describe('Barrel identity (same function reference across imports)', () => {
    it('getQuizQuestions from barrel is the same reference as from quizQuestionsApi', async () => {
      const mod = await import('@/app/services/quizQuestionsApi');
      expect(quizApi.getQuizQuestions).toBe(mod.getQuizQuestions);
    });

    it('createQuiz from barrel is the same reference as from quizzesEntityApi', async () => {
      const mod = await import('@/app/services/quizzesEntityApi');
      expect(quizApi.createQuiz).toBe(mod.createQuiz);
    });

    it('createQuizAttempt from barrel is the same reference as from quizAttemptsApi', async () => {
      const mod = await import('@/app/services/quizAttemptsApi');
      expect(quizApi.createQuizAttempt).toBe(mod.createQuizAttempt);
    });
  });
});
