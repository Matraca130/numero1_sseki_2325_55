// ============================================================
// Axon — Study & Dashboard Student Routes (Agent 5 OWNER)
//
// Agent 5 puede agregar/modificar rutas aqui libremente.
// student-routes.ts importa este archivo automaticamente.
// ============================================================
import type { RouteObject } from 'react-router';
import { lazyRetry } from '@/app/utils/lazyRetry';

export const studyStudentRoutes: RouteObject[] = [
  {
    index: true,
    lazy: () => lazyRetry(() => import('@/app/components/content/WelcomeView')).then(m => ({ Component: m.WelcomeView })),
  },
  {
    path: 'dashboard',
    lazy: () => lazyRetry(() => import('@/app/pages/DashboardPage')).then(m => ({ Component: m.default })),
  },
  {
    path: 'study-hub',
    lazy: () => lazyRetry(() => import('@/app/components/content/StudyHubView')).then(m => ({ Component: m.StudyHubView })),
  },
  {
    path: 'study',
    lazy: () => lazyRetry(() => import('@/app/components/content/StudyView')).then(m => ({ Component: m.StudyView })),
  },
  {
    // StudyHubView section cards navigate to /student/study-plan?sectionId=...
    path: 'study-plan',
    lazy: () => lazyRetry(() => import('@/app/components/content/StudyView')).then(m => ({ Component: m.StudyView })),
  },
  {
    path: 'schedule',
    lazy: () => lazyRetry(() => import('@/app/components/content/ScheduleView')).then(m => ({ Component: m.ScheduleView })),
  },
  {
    path: 'organize-study',
    lazy: () => lazyRetry(() => import('@/app/components/content/StudyOrganizerWizard')).then(m => ({ Component: m.StudyOrganizerWizard })),
  },
  {
    path: 'study-dashboards',
    lazy: () => lazyRetry(() => import('@/app/components/content/StudyDashboardsView')).then(m => ({ Component: m.StudyDashboardsView })),
  },
  {
    path: 'knowledge-heatmap',
    lazy: () => lazyRetry(() => import('@/app/components/content/KnowledgeHeatmapView')).then(m => ({ Component: m.KnowledgeHeatmapView })),
  },
  {
    path: 'mastery-dashboard',
    lazy: () => lazyRetry(() => import('@/app/components/content/MasteryDashboardView')).then(m => ({ Component: m.MasteryDashboardView })),
  },
  {
    path: 'student-data',
    lazy: () => lazyRetry(() => import('@/app/components/content/StudentDataPanel')).then(m => ({ Component: m.StudentDataPanel })),
  },
  {
    path: 'gamification',
    lazy: () => lazyRetry(() => import('@/app/components/content/GamificationView')).then(m => ({ Component: m.GamificationView })),
  },
  // ── G6: Dedicated gamification sub-pages (lazy-loaded) ──
  {
    path: 'badges',
    lazy: () => lazyRetry(() => import('@/app/components/gamification/pages/BadgesPage')).then(m => ({ Component: m.BadgesPage })),
  },
  {
    path: 'leaderboard',
    lazy: () => lazyRetry(() => import('@/app/components/gamification/pages/LeaderboardPage')).then(m => ({ Component: m.LeaderboardPage })),
  },
  {
    path: 'xp-history',
    lazy: () => lazyRetry(() => import('@/app/components/gamification/pages/XpHistoryPage')).then(m => ({ Component: m.XpHistoryPage })),
  },
  {
    path: 'settings',
    lazy: () => lazyRetry(() => import('@/app/components/student/StudentSettingsPage')).then(m => ({ Component: m.StudentSettingsPage })),
  },
  // Agent 5: agrega nuevas rutas de study/dashboard aqui
];
