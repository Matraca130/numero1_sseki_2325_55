// ============================================================
// Axon — Student Routes (children of StudentLayout)
//
// CODE SPLIT (BUG-014): All page components use React Router `lazy`
// so they're downloaded only when the student navigates to them.
// ============================================================
import type { RouteObject } from 'react-router';

export const studentChildren: RouteObject[] = [
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
    path: 'summaries',
    lazy: () => import('@/app/components/content/StudentSummariesView').then(m => ({ Component: m.StudentSummariesView })),
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
    path: 'review-session',
    lazy: () => import('@/app/components/content/ReviewSessionView').then(m => ({ Component: m.ReviewSessionView })),
  },
  {
    path: 'flashcards',
    lazy: () => import('@/app/components/content/FlashcardView').then(m => ({ Component: m.FlashcardView })),
  },
  {
    path: '3d',
    lazy: () => import('@/app/components/content/ThreeDView').then(m => ({ Component: m.ThreeDView })),
  },
  {
    path: 'quiz',
    lazy: () => import('@/app/components/content/QuizView').then(m => ({ Component: m.QuizView })),
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
    path: 'summary/:topicId',
    lazy: () => import('@/app/components/content/SummaryView').then(m => ({ Component: m.SummaryView })),
  },
  {
    path: '*',
    lazy: () => import('@/app/components/content/WelcomeView').then(m => ({ Component: m.WelcomeView })),
  },
];
