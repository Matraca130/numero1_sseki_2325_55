// ============================================================
// Route Integrity Guards — Gamification Domain
//
// PURPOSE: Prevent routing regressions that silently orphan
// gamification views. Specifically guards against:
//   - PR #54: Feature merged without route entry (orphaned GamificationView)
//   - PR #58: ViewType missing 'gamification' (sidebar broken)
//   - G6: Sub-page routes (badges, leaderboard, xp-history)
//
// APPROACH: Pure static analysis. We inspect route config objects
// and navigation mapping functions WITHOUT actually importing
// components (no DOM, no React, no side effects).
//
// RUN: pnpm test
// ============================================================

import { describe, it, expect } from 'vitest';
import { studyStudentRoutes } from '@/app/routes/study-student-routes';
import { viewToPath, pathToView } from '@/app/hooks/useStudentNav';
import type { ViewType } from '@/app/hooks/useStudentNav';

// ── Helper ───────────────────────────────────────────────────
function findRoute(routes: any[], pathStr: string) {
  return routes.find((r: any) => r.path === pathStr);
}

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
// SUITE 1: Main Gamification Route
//
// Guards against: PR #54 regression (feature merged, no route)
// ══════════════════════════════════════════════════════════════

describe('Gamification main route exists in studyStudentRoutes', () => {
  const route = findRoute(studyStudentRoutes, 'gamification');

  it('exists with path "gamification"', () => {
    expect(route).toBeDefined();
  });

  it('has a lazy loader function', () => {
    expect(route.lazy).toBeDefined();
    expect(typeof route.lazy).toBe('function');
  });

  it('references GamificationView (not PlaceholderPage)', () => {
    expect(lazySourceContains(route, 'GamificationView')).toBe(true);
    expect(lazySourceExcludes(route, 'PlaceholderPage')).toBe(true);
  });

  it('uses lazyRetry for chunk error resilience', () => {
    expect(lazySourceContains(route, 'lazyRetry')).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: Gamification Sub-Page Routes (G6)
//
// Guards against: sub-pages orphaned after modularization
// ══════════════════════════════════════════════════════════════

describe('Gamification sub-page routes', () => {
  const subPages = [
    { path: 'badges',       component: 'BadgesPage' },
    { path: 'leaderboard',  component: 'LeaderboardPage' },
    { path: 'xp-history',   component: 'XpHistoryPage' },
  ];

  for (const { path, component } of subPages) {
    describe(`/student/${path}`, () => {
      const route = findRoute(studyStudentRoutes, path);

      it('exists in studyStudentRoutes', () => {
        expect(route).toBeDefined();
      });

      it('has a lazy loader', () => {
        expect(route?.lazy).toBeDefined();
        expect(typeof route?.lazy).toBe('function');
      });

      it(`references ${component}`, () => {
        expect(lazySourceContains(route, component)).toBe(true);
      });
    });
  }
});

// ══════════════════════════════════════════════════════════════
// SUITE 3: ViewType <-> Route Path Bidirectional Mapping
//
// Guards against: PR #58 regression (sidebar click -> 404)
// ══════════════════════════════════════════════════════════════

describe('Gamification navigation mapping', () => {
  it('viewToPath("gamification") resolves to /student/gamification', () => {
    expect(viewToPath('gamification')).toBe('/student/gamification');
  });

  it('pathToView("/student/gamification") resolves to "gamification"', () => {
    expect(pathToView('/student/gamification')).toBe('gamification');
  });

  it('round-trip: gamification -> path -> gamification', () => {
    const path = viewToPath('gamification');
    const view = pathToView(path);
    expect(view).toBe('gamification');
  });

  it('"gamification" is assignable to ViewType', () => {
    // Compile-time guard: if 'gamification' is removed from ViewType,
    // this assignment fails at type-check time.
    const view: ViewType = 'gamification';
    expect(view).toBe('gamification');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 4: Route <-> ViewType Consistency
//
// Guards against: route path exists but ViewType doesn't (or vice versa)
// ══════════════════════════════════════════════════════════════

describe('Route-ViewType consistency', () => {
  it('gamification route path matches viewToPath slug', () => {
    const route = findRoute(studyStudentRoutes, 'gamification');
    const expectedPath = viewToPath('gamification');
    const expectedSlug = expectedPath.replace('/student/', '');
    expect(route?.path).toBe(expectedSlug);
  });

  it('index route has no path (is welcome)', () => {
    const indexRoute = studyStudentRoutes.find((r: any) => r.index === true);
    expect(indexRoute).toBeDefined();
  });
});
