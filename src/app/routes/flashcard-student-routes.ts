// ============================================================
// Axon — Flashcard Student Routes (Agent 3 OWNER)
//
// Agent 3 puede agregar/modificar rutas aqui libremente.
// student-routes.ts importa este archivo automaticamente.
// ============================================================
import type { RouteObject } from 'react-router';
import { lazyRetry } from '@/app/utils/lazyRetry';

export const flashcardStudentRoutes: RouteObject[] = [
  {
    path: 'flashcards',
    lazy: () => lazyRetry(() => import('@/app/components/content/FlashcardView')).then(m => ({ Component: m.FlashcardView })),
  },
  {
    path: 'review-session',
    lazy: () => lazyRetry(() => import('@/app/components/content/ReviewSessionView')).then(m => ({ Component: m.ReviewSessionView })),
  },
  // Agent 3: agrega nuevas rutas de flashcard aqui
];
