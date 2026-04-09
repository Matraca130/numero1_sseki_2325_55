// ============================================================
// Axon — Flashcard Student Routes (Agent 3 OWNER)
//
// Agent 3 puede agregar/modificar rutas aqui libremente.
// student-routes.ts importa este archivo automaticamente.
//
// ROUTES:
//   /student/flashcards         → FlashcardView (hub + deck + session + summary)
//   /student/adaptive-session   → AdaptiveFlashcardView (AI-powered adaptive)
//   /student/review-session     → ReviewSessionView (FSRS review center)
// ============================================================
import type { RouteObject } from 'react-router';
import { lazyRetry } from '@/app/utils/lazyRetry';

export const flashcardStudentRoutes: RouteObject[] = [
  {
    path: 'flashcards',
    lazy: () => lazyRetry(() => import('@/app/components/content/FlashcardView')).then(m => ({ Component: m.FlashcardView })),
  },
  {
    // BUG-016 FIX: Was missing — "Con IA" button navigated here but route didn't exist.
    // AdaptiveFlashcardView reads topicId/courseId/topicTitle from URL search params.
    path: 'adaptive-session',
    lazy: () => lazyRetry(() => import('@/app/components/content/AdaptiveFlashcardView')).then(m => ({ Component: m.AdaptiveFlashcardView })),
  },
  {
    path: 'review-session',
    lazy: () => lazyRetry(() => import('@/app/components/content/ReviewSessionView')).then(m => ({ Component: m.ReviewSessionView })),
  },
  // Agent 3: agrega nuevas rutas de flashcard aqui
];
