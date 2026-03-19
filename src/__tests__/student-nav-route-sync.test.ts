// ============================================================
// Student Navigation ↔ Route Sync Guard
//
// PURPOSE: Prevent sidebar nav items from linking to URLs that
// don't match any registered route. When this happens, the
// catch-all renders WelcomeView instead of the intended page.
//
// HISTORY:
//   - 3D Atlas mismatch: sidebar id='3d' → /student/3d, but
//     route was registered as '3d-atlas' → catch-all fired.
//   - Quiz mismatch (PR #88): sidebar id='quiz' → /student/quiz,
//     but route was 'quizzes'.
//
// This test imports ALL student route arrays and the nav mapping
// functions, then verifies every sidebar ViewType resolves to a
// slug that exists as a registered route path.
//
// RUN: npm test
// ============================================================

import { describe, it, expect } from 'vitest';
import { viewToPath, pathToView, type ViewType } from '@/app/hooks/useStudentNav';
import { studentChildren } from '@/app/routes/student-routes';

// ── Helpers ──────────────────────────────────────────────────

/** Collect all registered route paths (non-index, non-catch-all) */
function collectRoutePaths(routes: any[]): Set<string> {
  const paths = new Set<string>();
  for (const r of routes) {
    if (r.path && r.path !== '*') {
      paths.add(r.path);
    }
  }
  return paths;
}

// ── Data ─────────────────────────────────────────────────────

// These are the sidebar nav item ids — the ViewTypes that the
// Sidebar component uses. Keep this list in sync with Sidebar.tsx.
// If a new nav item is added to the sidebar, add it here too.
const SIDEBAR_NAV_VIEW_TYPES: ViewType[] = [
  'home',
  'dashboard',
  'study-hub',
  'schedule',
  'flashcards',
  '3d',
  'quiz',
  'student-data',
];

const registeredPaths = collectRoutePaths(studentChildren);

// ══════════════════════════════════════════════════════════════
// SUITE 1: Every sidebar nav item resolves to a registered route
//
// This is THE guard against the 3D Atlas / Quiz mismatch bug.
// If a ViewType in the sidebar produces a slug that doesn't
// exist in the route tree, this test fails.
// ══════════════════════════════════════════════════════════════

describe('Sidebar nav items match registered student routes', () => {
  for (const viewType of SIDEBAR_NAV_VIEW_TYPES) {
    it(`"${viewType}" resolves to a registered route`, () => {
      const fullPath = viewToPath(viewType); // e.g. /student/quizzes

      if (viewType === 'home') {
        // 'home' maps to the index route (empty slug → /student)
        // The index route uses `index: true`, not `path: ''`
        expect(fullPath).toBe('/student');
        return;
      }

      const slug = fullPath.replace('/student/', ''); // e.g. quizzes
      expect(registeredPaths.has(slug)).toBe(true);
    });
  }
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: Round-trip consistency (view → path → view)
//
// Ensures that viewToPath and pathToView are perfect inverses
// for every sidebar nav item. If these drift, the sidebar
// active-state highlight breaks.
// ══════════════════════════════════════════════════════════════

describe('Round-trip: viewType → path → viewType', () => {
  for (const viewType of SIDEBAR_NAV_VIEW_TYPES) {
    it(`"${viewType}" round-trips correctly`, () => {
      const path = viewToPath(viewType);
      const recovered = pathToView(path);
      expect(recovered).toBe(viewType);
    });
  }
});

// ══════════════════════════════════════════════════════════════
// SUITE 3: No orphan routes (routes without a nav mapping)
//
// Optional but useful: ensures every top-level student route
// path can be reverse-mapped to a ViewType via pathToView.
// This catches routes that exist but are unreachable because
// pathToView doesn't know about them.
// ══════════════════════════════════════════════════════════════

describe('All registered routes reverse-map to a ViewType', () => {
  for (const routePath of registeredPaths) {
    // Skip sub-routes with params (e.g. summary/:summaryId)
    if (routePath.includes(':') || routePath.includes('/')) continue;

    it(`route "${routePath}" maps to a ViewType via pathToView`, () => {
      const viewType = pathToView(`/student/${routePath}`);
      // Should not be 'home' unless the route IS home
      // (pathToView defaults to 'home' for unknown slugs)
      if (routePath !== '') {
        expect(viewType).not.toBe('home');
      }
    });
  }
});
