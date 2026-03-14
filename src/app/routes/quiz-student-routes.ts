// ============================================================
// Axon — Quiz Student Routes (Agent 1 OWNER)
//
// Agent 1 puede agregar/modificar rutas aqui libremente.
// student-routes.ts importa este archivo automaticamente.
// ============================================================
import type { RouteObject } from 'react-router';
import { lazyRetry } from '@/app/utils/lazyRetry';

export const quizStudentRoutes: RouteObject[] = [
  {
    path: 'quizzes',
    lazy: () => lazyRetry(() => import('@/app/components/content/QuizView')).then(m => ({ Component: m.QuizView })),
  },
  // Agent 1: agrega nuevas rutas de quiz aqui
];
