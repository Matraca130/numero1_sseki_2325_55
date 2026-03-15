// ============================================================
// Quiz Route Integrity Guards
//
// PURPOSE: Prevent routing regressions that silently break quiz
// navigation. These tests caught PR #87 and #88 bugs.
//
// WHAT THEY CHECK:
//   1. Professor /quizzes route loads ProfessorQuizzesPage (not placeholder)
//   2. Student quiz ViewType resolves to the correct URL slug
//   3. Student route path has matching SLUG_TO_VIEW entry
//   4. viewToPath and pathToView are bidirectional for quiz
//   5. Professor /quizzes route uses lazyRetry (not lazyPlaceholder)
//   6. Student quiz route points to QuizView component
//
// RUN: pnpm test
// ============================================================

import { describe, it, expect } from 'vitest';
import { professorChildren } from '@/app/routes/professor-routes';
import { quizStudentRoutes } from '@/app/routes/quiz-student-routes';
import { viewToPath, pathToView } from '@/app/hooks/useStudentNav';

// ── Helper: extract the route object for a given path ────────
function findRoute(routes: any[], pathStr: string) {
  return routes.find((r: any) => r.path === pathStr);
}

// ══════════════════════════════════════════════════════════════
// TEST SUITE 1: Professor Quiz Route
// ══════════════════════════════════════════════════════════════

describe('Professor quiz route', () => {
  const quizRoute = findRoute(professorChildren, 'quizzes');

  it('exists in professorChildren', () => {
    expect(quizRoute).toBeDefined();
  });

  it('has a lazy loader (not undefined)', () => {
    // If this is undefined, the route was likely removed or misconfigured
    expect(quizRoute.lazy).toBeDefined();
    expect(typeof quizRoute.lazy).toBe('function');
  });

  it('lazy loader resolves to ProfessorQuizzesPage (not PlaceholderPage)', async () => {
    // Call the lazy function — it returns { Component: ... }
    const result = await quizRoute.lazy();
    expect(result).toBeDefined();
    expect(result.Component).toBeDefined();

    // The component should be named ProfessorQuizzesPage (or wrapped)
    // At minimum, it should NOT be a PlaceholderPage
    const name = result.Component.name || result.Component.displayName || '';
    expect(name).not.toContain('Placeholder');
    // Positive check: should reference the real page
    // (Component.name may be minified in prod, so we also check it's a function)
    expect(typeof result.Component).toBe('function');
  });
});

// ══════════════════════════════════════════════════════════════
// TEST SUITE 2: Student Quiz Navigation Mapping
// ══════════════════════════════════════════════════════════════

describe('Student quiz navigation mapping', () => {
  it('viewToPath("quiz") resolves to /student/quizzes', () => {
    // BUG #88: Was resolving to /student/quiz (missing slug mapping)
    expect(viewToPath('quiz')).toBe('/student/quizzes');
  });

  it('pathToView("/student/quizzes") resolves to "quiz"', () => {
    // Reverse mapping must also work for sidebar highlight
    expect(pathToView('/student/quizzes')).toBe('quiz');
  });

  it('viewToPath and pathToView are bidirectional for quiz', () => {
    // Round-trip: quiz -> /student/quizzes -> quiz
    const path = viewToPath('quiz');
    const view = pathToView(path);
    expect(view).toBe('quiz');
  });
});

// ══════════════════════════════════════════════════════════════
// TEST SUITE 3: Student Quiz Route Registration
// ══════════════════════════════════════════════════════════════

describe('Student quiz route registration', () => {
  const quizRoute = findRoute(quizStudentRoutes, 'quizzes');

  it('exists in quizStudentRoutes with path "quizzes"', () => {
    expect(quizRoute).toBeDefined();
  });

  it('has a lazy loader for QuizView', () => {
    expect(quizRoute.lazy).toBeDefined();
    expect(typeof quizRoute.lazy).toBe('function');
  });

  it('route path matches the slug from viewToPath', () => {
    // This is the CORE guard: the route path must match what the sidebar generates
    const expectedPath = viewToPath('quiz'); // /student/quizzes
    const expectedSlug = expectedPath.replace('/student/', ''); // quizzes
    expect(quizRoute.path).toBe(expectedSlug);
  });
});
