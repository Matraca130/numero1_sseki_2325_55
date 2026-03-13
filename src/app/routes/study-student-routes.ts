// ============================================================
// Axon — Study & Dashboard Student Routes (Agent 5 OWNER)
//
// Agent 5 puede agregar/modificar rutas aqui libremente.
// student-routes.ts importa este archivo automaticamente.
// ============================================================
import type { RouteObject } from 'react-router';

export const studyStudentRoutes: RouteObject[] = [
  {
    index: true,
    lazy: () => import('@/app/components/content/WelcomeView').then(m => ({ Component: m.WelcomeView })),
  },
  {
    path: 'dashboard',
    lazy: () => import('@/app/pages/DashboardPage').then(m => ({ Component: m.default })),
  },
  {
    path: 'study-hub',
    lazy: () => import('@/app/components/content/StudyHubView').then(m => ({ Component: m.StudyHubView })),
  },
  {
    path: 'study',
    lazy: () => import('@/app/components/content/StudyView').then(m => ({ Component: m.StudyView })),
  },
  {
    // StudyHubView section cards navigate to /student/study-plan?sectionId=...
    path: 'study-plan',
    lazy: () => import('@/app/components/content/StudyView').then(m => ({ Component: m.StudyView })),
  },
  {
    path: 'schedule',
    lazy: () => import('@/app/components/content/ScheduleView').then(m => ({ Component: m.ScheduleView })),
  },
  {
    path: 'organize-study',
    lazy: () => import('@/app/components/content/StudyOrganizerWizard').then(m => ({ Component: m.StudyOrganizerWizard })),
  },
  {
    path: 'study-dashboards',
    lazy: () => import('@/app/components/content/StudyDashboardsView').then(m => ({ Component: m.StudyDashboardsView })),
  },
  {
    path: 'knowledge-heatmap',
    lazy: () => import('@/app/components/content/KnowledgeHeatmapView').then(m => ({ Component: m.KnowledgeHeatmapView })),
  },
  {
    path: 'mastery-dashboard',
    lazy: () => import('@/app/components/content/MasteryDashboardView').then(m => ({ Component: m.MasteryDashboardView })),
  },
  {
    path: 'student-data',
    lazy: () => import('@/app/components/content/StudentDataPanel').then(m => ({ Component: m.StudentDataPanel })),
  },
  {
    path: 'gamification',
    lazy: () => import('@/app/components/content/GamificationView').then(m => ({ Component: m.GamificationView })),
  },
  // Agent 5: agrega nuevas rutas de study/dashboard aqui
];
