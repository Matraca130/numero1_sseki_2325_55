// ============================================================
// Axon — Summary Student Routes (Agent 2 OWNER)
//
// Agent 2 puede agregar/modificar rutas aqui libremente.
// student-routes.ts importa este archivo automaticamente.
// ============================================================
import type { RouteObject } from 'react-router';
import { withBoundary } from '@/app/lib/withBoundary';

export const summaryStudentRoutes: RouteObject[] = [
  {
    path: 'summaries',
    lazy: () => import('@/app/components/content/StudentSummariesView').then(m => ({ Component: withBoundary(m.StudentSummariesView, 'Error al cargar resumenes') })),
  },
  {
    path: 'summary/:topicId',
    lazy: () => import('@/app/components/content/SummaryView').then(m => ({ Component: withBoundary(m.SummaryView, 'Error al cargar resumen') })),
  },
  // Agent 2: agrega nuevas rutas de summary aqui
];
