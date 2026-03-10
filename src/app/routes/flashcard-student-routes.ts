// ============================================================
// Axon — Flashcard Student Routes (Agent 3 OWNER)
//
// Agent 3 puede agregar/modificar rutas aqui libremente.
// student-routes.ts importa este archivo automaticamente.
// ============================================================
import type { RouteObject } from 'react-router';
import { withBoundary } from '@/app/lib/withBoundary';

export const flashcardStudentRoutes: RouteObject[] = [
  {
    path: 'flashcards',
    lazy: () => import('@/app/components/content/FlashcardView').then(m => ({ Component: withBoundary(m.FlashcardView, 'Error al cargar flashcards') })),
  },
  {
    path: 'review-session',
    lazy: () => import('@/app/components/content/ReviewSessionView').then(m => ({ Component: withBoundary(m.ReviewSessionView, 'Error al cargar sesion de repaso') })),
  },
  // Agent 3: agrega nuevas rutas de flashcard aqui
];
