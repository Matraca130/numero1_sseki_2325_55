// ============================================================
// Axon — Student Routes (children of StudentLayout)
// ============================================================
import type { RouteObject } from 'react-router';

import { WelcomeView } from '@/app/components/content/WelcomeView';
import { DashboardView } from '@/app/components/content/DashboardView';
import { StudyHubView } from '@/app/components/content/StudyHubView';
import { QuizView } from '@/app/components/content/QuizView';
import { PlaceholderPage } from '@/app/components/roles/PlaceholderPage';

export const studentChildren: RouteObject[] = [
  { index: true,                    Component: WelcomeView },
  { path: 'dashboard',              Component: DashboardView },
  { path: 'study-hub',              Component: StudyHubView },
  { path: 'quiz',                   Component: QuizView },
  // ── Podados (placeholder hasta reimplementar) ──
  { path: 'study',                  Component: PlaceholderPage },
  { path: 'flashcards',             Component: PlaceholderPage },
  { path: '3d',                     Component: PlaceholderPage },
  { path: 'schedule',               Component: PlaceholderPage },
  { path: 'organize-study',         Component: PlaceholderPage },
  { path: 'review-session',         Component: PlaceholderPage },
  { path: 'study-dashboards',       Component: PlaceholderPage },
  { path: 'knowledge-heatmap',      Component: PlaceholderPage },
  { path: 'mastery-dashboard',      Component: PlaceholderPage },
  { path: 'student-data',           Component: PlaceholderPage },
  // ── G6: Gamification pages (lazy-loaded) ──
  {
    path: 'badges',
    lazy: () => import('@/app/components/gamification/pages/BadgesPage').then(m => ({ Component: m.BadgesPage })),
  },
  {
    path: 'leaderboard',
    lazy: () => import('@/app/components/gamification/pages/LeaderboardPage').then(m => ({ Component: m.LeaderboardPage })),
  },
  {
    path: 'xp-history',
    lazy: () => import('@/app/components/gamification/pages/XpHistoryPage').then(m => ({ Component: m.XpHistoryPage })),
  },
];
