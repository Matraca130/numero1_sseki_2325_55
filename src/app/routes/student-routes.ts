// ============================================================
// Axon — Student Routes (children of StudentLayout)
//
// EV-FIX: DashboardView → DashboardPage, Atlas3DPlaceholder → ThreeDView
// Sessions integrated: Quiz, Flashcards, Dashboard/Organizer, 3D
// ============================================================
import type { RouteObject } from 'react-router';

import { WelcomeView } from '@/app/components/content/WelcomeView';
import DashboardPage from '@/app/pages/DashboardPage';
import { StudyHubView } from '@/app/components/content/StudyHubView';
import { StudyView } from '@/app/components/content/StudyView';
import { StudentSummariesView } from '@/app/components/content/StudentSummariesView';
import { SummaryView } from '@/app/components/content/SummaryView';
import { QuizView } from '@/app/components/content/QuizView';
import { FlashcardView } from '@/app/components/content/FlashcardView';
import { ScheduleView } from '@/app/components/content/ScheduleView';
import { StudyOrganizerWizard } from '@/app/components/content/StudyOrganizerWizard';
import { ReviewSessionView } from '@/app/components/content/ReviewSessionView';
import { StudyDashboardsView } from '@/app/components/content/StudyDashboardsView';
import { KnowledgeHeatmapView } from '@/app/components/content/KnowledgeHeatmapView';
import { MasteryDashboardView } from '@/app/components/content/MasteryDashboardView';
import { StudentDataPanel } from '@/app/components/content/StudentDataPanel';
import { ThreeDView } from '@/app/components/content/ThreeDView';

export const studentChildren: RouteObject[] = [
  { index: true,              Component: WelcomeView },
  { path: 'dashboard',        Component: DashboardPage },
  { path: 'study-hub',        Component: StudyHubView },
  { path: 'study',            Component: StudyView },
  { path: 'summaries',        Component: StudentSummariesView },
  { path: 'schedule',         Component: ScheduleView },
  { path: 'organize-study',   Component: StudyOrganizerWizard },
  { path: 'review-session',   Component: ReviewSessionView },
  { path: 'flashcards',       Component: FlashcardView },
  { path: '3d',               Component: ThreeDView },
  { path: 'quiz',             Component: QuizView },
  { path: 'study-dashboards', Component: StudyDashboardsView },
  { path: 'knowledge-heatmap', Component: KnowledgeHeatmapView },
  { path: 'mastery-dashboard', Component: MasteryDashboardView },
  { path: 'student-data',     Component: StudentDataPanel },
  { path: 'summary/:topicId', Component: SummaryView },
  // Catch-all → redirect to home
  { path: '*',                Component: WelcomeView },
];
