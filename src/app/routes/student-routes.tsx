// ============================================================
// Axon — Student Routes (children of StudentLayout)
//
// PARALLEL-SAFE: Only student devs touch this file.
// ============================================================
import React from 'react';
import type { RouteObject } from 'react-router';
import { Construction } from 'lucide-react';

import { WelcomeView } from '@/app/components/content/WelcomeView';
import { DashboardView } from '@/app/components/content/DashboardView';
import { StudyHubView } from '@/app/components/content/StudyHubView';
import { FlashcardView } from '@/app/components/content/FlashcardView';
import { PlaceholderPage } from '@/app/components/roles/PlaceholderPage';

// Wrapper for pruned routes
function Placeholder() {
  return (
    <PlaceholderPage
      title="Em Desenvolvimento"
      description="Esta secao sera implementada em breve."
      icon={<Construction size={24} />}
      accentColor="teal"
    />
  );
}

export const studentChildren: RouteObject[] = [
  { index: true,                    Component: WelcomeView },
  { path: 'dashboard',              Component: DashboardView },
  { path: 'study-hub',              Component: StudyHubView },
  { path: 'flashcards',             Component: FlashcardView },
  // Pruned routes — placeholder until rebuilt
  { path: 'study',                  Component: Placeholder },
  { path: '3d',                     Component: Placeholder },
  { path: 'quiz',                   Component: Placeholder },
  { path: 'schedule',               Component: Placeholder },
  { path: 'organize-study',         Component: Placeholder },
  { path: 'review-session',         Component: Placeholder },
  { path: 'study-dashboards',       Component: Placeholder },
  { path: 'knowledge-heatmap',      Component: Placeholder },
  { path: 'mastery-dashboard',      Component: Placeholder },
  { path: 'student-data',           Component: Placeholder },
];
