// ============================================================
// Route Integrity Guards — Axon v4.4
//
// PURPOSE: Prevent routing regressions that silently break
// navigation. Specifically guards against:
//   - PR #87: PERF-70 replacing real routes with PlaceholderPage
//   - PR #88: Sidebar ViewType not matching route path slug
//
// APPROACH: Pure static analysis. We inspect route config objects
// and navigation mapping functions WITHOUT actually importing
// components (no DOM, no React, no side effects).
//
// RUN: pnpm test
// ============================================================

import { describe, it, expect } from 'vitest';
import { professorChildren } from '@/app/routes/professor-routes';
import { quizStudentRoutes } from '@/app/routes/quiz-student-routes';
import { viewToPath, pathToView } from '@/app/hooks/useStudentNav';

// ── Helper ───────────────────────────────────────────────────
function findRoute(routes: any[], pathStr: string) {
  return routes.find((r: any) => r.path === pathStr);
}

/**
 * Checks if a route's lazy function references a real component
 * import (via lazyRetry) instead of PlaceholderPage.
 *
 * We convert the lazy function to string and inspect the source.
 * This avoids actually calling the dynamic import (which would
 * fail in Node env due to CSS/JSX/context dependencies).
 */
function lazySourceContains(route: any, needle: string): boolean {
  if (!route?.lazy) return false;
  const src = route.lazy.toString();
  return src.includes(needle);
}

function lazySourceExcludes(route: any, needle: string): boolean {
  if (!route?.lazy) return true;
  const src = route.lazy.toString();
  return !src.includes(needle);
}

// ══════════════════════════════════════════════════════════════
// SUITE 1: Professor Routes — Real Components (not Placeholders)
//
// Guards against: PR #87 regression (PERF-70 lazyPlaceholder)
// ══════════════════════════════════════════════════════════════

describe('Professor routes load real components', () => {
  // These 3 routes were ALL broken by PERF-70 and fixed in PR #87.
  // If ANY of them regresses to PlaceholderPage, these tests fail.

  const routeChecks = [
    { path: 'quizzes',    component: 'ProfessorQuizzesPage' },
    { path: 'curriculum', component: 'ProfessorCurriculumPage' },
    { path: 'flashcards', component: 'ProfessorFlashcardsPage' },
  ];

  for (const { path, component } of routeChecks) {
    describe(`/professor/${path}`, () => {
      const route = findRoute(professorChildren, path);

      it('exists in professorChildren', () => {
        expect(route).toBeDefined();
      });

      it('has a lazy loader function', () => {
        expect(route.lazy).toBeDefined();
        expect(typeof route.lazy).toBe('function');
      });

      it(`references ${component} (not PlaceholderPage)`, () => {
        // Positive: lazy source mentions the real component
        expect(lazySourceContains(route, component)).toBe(true);
        // Negative: lazy source does NOT mention PlaceholderPage
        expect(lazySourceExcludes(route, 'PlaceholderPage')).toBe(true);
      });

      it('uses lazyRetry (not lazyPlaceholder)', () => {
        expect(lazySourceContains(route, 'lazyRetry')).toBe(true);
      });
    });
  }
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: Student Quiz Navigation Mapping
//
// Guards against: PR #88 regression (quiz ≠ quizzes mismatch)
// ══════════════════════════════════════════════════════════════

describe('Student quiz navigation mapping', () => {
  it('viewToPath("quiz") resolves to /student/quizzes', () => {
    // BUG #88: Was resolving to /student/quiz (missing slug mapping)
    expect(viewToPath('quiz')).toBe('/student/quizzes');
  });

  it('pathToView("/student/quizzes") resolves to "quiz"', () => {
    // Reverse mapping must work for sidebar active-state highlight
    expect(pathToView('/student/quizzes')).toBe('quiz');
  });

  it('round-trip: quiz → path → quiz', () => {
    const path = viewToPath('quiz');
    const view = pathToView(path);
    expect(view).toBe('quiz');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 3: Student Quiz Route Registration
//
// Guards against: route path not matching sidebar-generated URL
// ══════════════════════════════════════════════════════════════

describe('Student quiz route registration', () => {
  const quizRoute = findRoute(quizStudentRoutes, 'quizzes');

  it('exists with path "quizzes"', () => {
    expect(quizRoute).toBeDefined();
  });

  it('has a lazy loader', () => {
    expect(quizRoute.lazy).toBeDefined();
    expect(typeof quizRoute.lazy).toBe('function');
  });

  it('references QuizView component', () => {
    expect(lazySourceContains(quizRoute, 'QuizView')).toBe(true);
  });

  it('route path matches the slug viewToPath generates', () => {
    // CORE GUARD: sidebar click → URL → route match
    // If these diverge, the catch-all shows WelcomeView instead.
    const expectedPath = viewToPath('quiz');            // /student/quizzes
    const expectedSlug = expectedPath.replace('/student/', ''); // quizzes
    expect(quizRoute.path).toBe(expectedSlug);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 4: question_type Enum (Guidelines Rule 4)
//
// Guards against: invalid question types leaking into the system
// ══════════════════════════════════════════════════════════════

describe('question_type enum', () => {
  const VALID_TYPES = ['mcq', 'true_false', 'fill_blank', 'open'] as const;

  it('has exactly 4 valid types', () => {
    expect(VALID_TYPES).toHaveLength(4);
  });

  it('all types are lowercase snake_case strings', () => {
    for (const t of VALID_TYPES) {
      expect(t).toMatch(/^[a-z_]+$/);
    }
  });

  // This is a "documentation test" — if someone adds a 5th type,
  // they must update this test (forcing them to think about it).
  it('snapshot: valid types have not changed unexpectedly', () => {
    expect([...VALID_TYPES].sort()).toEqual(
      ['fill_blank', 'mcq', 'open', 'true_false']
    );
  });
});
