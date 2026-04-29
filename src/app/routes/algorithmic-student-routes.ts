// ============================================================
// Axon — Algorithmic Art Student Routes
//
// Routes for native p5.js sketch rendering.
// student-routes.ts spreads these automatically.
//
// Routes:
//   /student/sketch/:engine           → SketchFullscreen
//   /student/sketch/:engine/:mode     → SketchFullscreen (with mode)
// ============================================================
import type { RouteObject } from 'react-router';
import { lazyRetry } from '@/app/utils/lazyRetry';

export const algorithmicStudentRoutes: RouteObject[] = [
  {
    path: 'sketch/:engine',
    lazy: () =>
      lazyRetry(() => import('@/app/components/algorithmic-art/SketchFullscreen')).then(m => ({
        Component: m.SketchFullscreen,
      })),
  },
  {
    path: 'sketch/:engine/:mode',
    lazy: () =>
      lazyRetry(() => import('@/app/components/algorithmic-art/SketchFullscreen')).then(m => ({
        Component: m.SketchFullscreen,
      })),
  },
];
