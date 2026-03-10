// ============================================================
// Axon — 3D Student Routes (Agent 6 OWNER)
//
// Agent 6 puede agregar/modificar rutas aqui libremente.
// student-routes.ts importa este archivo automaticamente.
// ============================================================
import type { RouteObject } from 'react-router';
import { withBoundary } from '@/app/lib/withBoundary';

export const threeDStudentRoutes: RouteObject[] = [
  {
    path: '3d',
    lazy: () => import('@/app/components/content/ThreeDView').then(m => ({ Component: withBoundary(m.ThreeDView, 'Error al cargar vista 3D') })),
  },
  // Agent 6: agrega nuevas rutas 3D aqui
];
