// ============================================================
// Axon — Student Routes (children of StudentLayout)
//
// Sessions integrated: Quiz, Flashcards, Dashboard/Organizer
// ============================================================
import React from 'react';
import type { RouteObject } from 'react-router';

import { WelcomeView } from '@/app/components/content/WelcomeView';
import { DashboardView } from '@/app/components/content/DashboardView';
import { StudyHubView } from '@/app/components/content/StudyHubView';
import { StudyView } from '@/app/components/content/StudyView';
import { StudentSummariesView } from '@/app/components/content/StudentSummariesView';
import { StudentPlaceholder } from '@/app/components/content/StudentPlaceholder';
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
import { Box } from 'lucide-react';

// ── Placeholder wrappers (only for routes not yet implemented) ──
function Atlas3DPlaceholder() {
  return React.createElement(StudentPlaceholder, {
    title: 'Atlas 3D',
    description: 'Modelos anatomicos interactivos — proximamente',
    icon: React.createElement(Box, { size: 24 }),
    accentColor: 'blue',
  });
}

export const studentChildren: RouteObject[] = [
  { index: true,              Component: WelcomeView },
  { path: 'dashboard',        Component: DashboardView },
  { path: 'study-hub',        Component: StudyHubView },
  { path: 'study',            Component: StudyView },
  { path: 'summaries',        Component: StudentSummariesView },
  { path: 'schedule',         Component: ScheduleView },
  { path: 'organize-study',   Component: StudyOrganizerWizard },
  { path: 'review-session',   Component: ReviewSessionView },
  { path: 'flashcards',       Component: FlashcardView },
  { path: '3d',               Component: Atlas3DPlaceholder },
  { path: 'quiz',             Component: QuizView },
  { path: 'study-dashboards', Component: StudyDashboardsView },
  { path: 'knowledge-heatmap', Component: KnowledgeHeatmapView },
  { path: 'mastery-dashboard', Component: MasteryDashboardView },
  { path: 'student-data',     Component: StudentDataPanel },
  { path: 'summary/:topicId', Component: SummaryView },
  // Catch-all → redirect to home
  { path: '*',                Component: WelcomeView },
];
