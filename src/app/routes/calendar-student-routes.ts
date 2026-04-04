// ============================================================
// Axon — Calendar Student Routes
//
// Route: /student/calendario → CalendarPage (lazy-loaded)
// ============================================================
import type { RouteObject } from 'react-router';
import { lazyRetry } from '@/app/utils/lazyRetry';

export const calendarStudentRoutes: RouteObject[] = [
  {
    path: 'calendario',
    lazy: () => lazyRetry(() => import('@/app/components/calendar/CalendarPage')).then(m => ({ Component: m.CalendarPage })),
  },
];
