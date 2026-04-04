// ============================================================
// Axon — Student Routes ASSEMBLER (PROTECTED — no agent touches this)
//
// This file ONLY imports and spreads per-agent route files.
// Each agent owns their own route file and can modify it freely.
//
// ARCHITECTURE:
//   quiz-student-routes.ts       → Agent 1 OWNER
//   summary-student-routes.ts    → Agent 2 OWNER
//   flashcard-student-routes.ts  → Agent 3 OWNER
//   study-student-routes.ts      → Agent 5 OWNER
//   threed-student-routes.ts     → Agent 6 OWNER
// ============================================================
import type { RouteObject } from 'react-router';
import { lazyRetry } from '@/app/utils/lazyRetry';

import { quizStudentRoutes } from './quiz-student-routes';
import { summaryStudentRoutes } from './summary-student-routes';
import { flashcardStudentRoutes } from './flashcard-student-routes';
import { studyStudentRoutes } from './study-student-routes';
import { threeDStudentRoutes } from './threed-student-routes';
import { calendarStudentRoutes } from './calendar-student-routes';

export const studentChildren: RouteObject[] = [
  ...studyStudentRoutes,       // Agent 5 (includes index route)
  ...quizStudentRoutes,        // Agent 1
  ...summaryStudentRoutes,     // Agent 2
  ...flashcardStudentRoutes,   // Agent 3
  ...threeDStudentRoutes,      // Agent 6
  ...calendarStudentRoutes,    // Calendar v2
  // Catch-all — keep last
  {
    path: '*',
    lazy: () => lazyRetry(() => import('@/app/components/content/WelcomeView')).then(m => ({ Component: m.WelcomeView })),
  },
];
