// ============================================================
// Axon — Study & Dashboard Student Routes (Agent 5 OWNER)
//
// Agent 5 puede agregar/modificar rutas aqui libremente.
// student-routes.ts importa este archivo automaticamente.
// ============================================================
import type { RouteObject } from 'react-router';
import { withBoundary } from '@/app/lib/withBoundary';

export const studyStudentRoutes: RouteObject[] = [
  {
    index: true,
    lazy: () => import('@/app/components/content/WelcomeView').then(m => ({ Component: withBoundary(m.WelcomeView, 'Error al cargar bienvenida') })),
  },
  {
    path: 'dashboard',
    lazy: () => import('@/app/components/content/DashboardView').then(m => ({ Component: withBoundary(m.DashboardView, 'Error al cargar dashboard') })),
  },
  {
    path: 'study-hub',
    lazy: () => import('@/app/components/content/StudyHubView').then(m => ({ Component: withBoundary(m.StudyHubView, 'Error al cargar centro de estudio') })),
  },
  {
    path: 'study-plan',
    lazy: () => import('@/app/components/content/SectionStudyPlanView').then(m => ({ Component: withBoundary(m.SectionStudyPlanView, 'Error al cargar plan de estudio') })),
  },
  {
    path: 'topic-summaries',
    lazy: () => import('@/app/components/content/TopicSummariesView').then(m => ({ Component: withBoundary(m.TopicSummariesView, 'Error al cargar resumenes del tema') })),
  },
  {
    path: 'study',
    lazy: () => import('@/app/components/content/StudyView').then(m => ({ Component: withBoundary(m.StudyView, 'Error al cargar vista de estudio') })),
  },
  {
    path: 'schedule',
    lazy: () => import('@/app/components/content/ScheduleView').then(m => ({ Component: withBoundary(m.ScheduleView, 'Error al cargar horario') })),
  },
  {
    path: 'organize-study',
    lazy: () => import('@/app/components/content/StudyOrganizerWizard').then(m => ({ Component: withBoundary(m.StudyOrganizerWizard, 'Error al cargar organizador') })),
  },
  {
    path: 'study-dashboards',
    lazy: () => import('@/app/components/content/StudyDashboardsView').then(m => ({ Component: withBoundary(m.StudyDashboardsView, 'Error al cargar dashboards de estudio') })),
  },
  {
    path: 'knowledge-heatmap',
    lazy: () => import('@/app/components/content/KnowledgeHeatmapView').then(m => ({ Component: withBoundary(m.KnowledgeHeatmapView, 'Error al cargar mapa de conocimiento') })),
  },
  {
    path: 'mastery-dashboard',
    lazy: () => import('@/app/components/content/MasteryDashboardView').then(m => ({ Component: withBoundary(m.MasteryDashboardView, 'Error al cargar dashboard de dominio') })),
  },
  {
    path: 'student-data',
    lazy: () => import('@/app/components/content/StudentDataPanel').then(m => ({ Component: withBoundary(m.StudentDataPanel, 'Error al cargar datos del estudiante') })),
  },
  // Agent 5: agrega nuevas rutas de study/dashboard aqui
];
