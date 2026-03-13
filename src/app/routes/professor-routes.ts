// ============================================================
// Axon — Professor Routes (children of ProfessorLayout)
// ============================================================
import type { RouteObject } from 'react-router';

import { ProfessorQuizzesPage } from '@/app/components/roles/pages/professor/ProfessorQuizzesPage';
import { PlaceholderPage } from '@/app/components/roles/PlaceholderPage';

export const professorChildren: RouteObject[] = [
  { index: true,        Component: PlaceholderPage },
  { path: 'courses',    Component: PlaceholderPage },
  { path: 'curriculum', Component: PlaceholderPage },
  { path: 'flashcards', Component: PlaceholderPage },
  { path: 'quizzes',    Component: ProfessorQuizzesPage },
  { path: 'students',   Component: PlaceholderPage },
  { path: 'ai',         Component: PlaceholderPage },
  { path: 'settings',   Component: PlaceholderPage },
  // ── G7: Professor Gamification View (lazy-loaded) ──
  {
    path: 'gamification',
    lazy: () => import('@/app/components/professor/ProfessorGamificationPage').then(m => ({ Component: m.ProfessorGamificationPage })),
  },
];
