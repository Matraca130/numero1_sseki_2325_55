// ============================================================
// Axon — Summary Student Routes (Agent 2 OWNER)
//
// Agent 2 puede agregar/modificar rutas aqui libremente.
// student-routes.ts importa este archivo automaticamente.
// ============================================================
import type { RouteObject } from 'react-router';
import { lazyRetry } from '@/app/utils/lazyRetry';

export const summaryStudentRoutes: RouteObject[] = [
  {
    path: 'summaries',
    lazy: () => lazyRetry(() => import('@/app/components/content/StudentSummariesView')).then(m => ({ Component: m.StudentSummariesView })),
  },
  {
    path: 'summary/:topicId',
    lazy: () => lazyRetry(() => import('@/app/components/content/SummaryView')).then(m => ({ Component: m.SummaryView })),
  },
  // Agent 2: agrega nuevas rutas de summary aqui
];
