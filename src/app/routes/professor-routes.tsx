// ============================================================
// Axon — Professor Routes (children of ProfessorLayout)
//
// PARALLEL-SAFE: Only professor-area devs touch this file.
// ============================================================
import React from 'react';
import type { RouteObject } from 'react-router';
import { Construction } from 'lucide-react';

import { ProfessorFlashcardsPage } from '@/app/components/roles/pages/professor/ProfessorFlashcardsPage';
import { PlaceholderPage } from '@/app/components/roles/PlaceholderPage';

// Wrapper for pruned routes
function Placeholder() {
  return (
    <PlaceholderPage
      title="Em Desenvolvimento"
      description="Esta secao sera implementada em breve."
      icon={<Construction size={24} />}
      accentColor="purple"
    />
  );
}

export const professorChildren: RouteObject[] = [
  { index: true,        Component: Placeholder },
  { path: 'courses',    Component: Placeholder },
  { path: 'curriculum', Component: Placeholder },
  { path: 'flashcards', Component: ProfessorFlashcardsPage },
  { path: 'quizzes',    Component: Placeholder },
  { path: 'students',   Component: Placeholder },
  { path: 'ai',         Component: Placeholder },
  { path: 'settings',   Component: Placeholder },
];
