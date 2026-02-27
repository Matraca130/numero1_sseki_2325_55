// ============================================================
// useStudentNav — React-Router-native student navigation
//
// Replaces the legacy AppContext.setActiveView / activeView bridge.
// All student views use this hook for navigation instead of
// reaching into AppContext.
//
// USAGE:
//   const { navigateTo, currentView, isView } = useStudentNav();
//   navigateTo('flashcards');          // navigate('/student/flashcards')
//   isView('study-hub', 'study');      // true if on either route
// ============================================================

import { useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';

// ── ViewType (canonical definition) ──────────────────────────

export type ViewType =
  | 'home'
  | 'dashboard'
  | 'study-hub'
  | 'study'
  | 'flashcards'
  | 'quiz'
  | '3d'
  | 'schedule'
  | 'organize-study'
  | 'review-session'
  | 'study-dashboards'
  | 'knowledge-heatmap'
  | 'mastery-dashboard'
  | 'student-data';

// ── Mapping helpers ──────────────────────────────────────────

/** viewType -> URL slug (only entries that differ from the viewType itself) */
const VIEW_TO_SLUG: Partial<Record<string, string>> = {
  home: '', // index route
};

/** URL slug -> viewType (only entries that differ from the slug itself) */
const SLUG_TO_VIEW: Record<string, ViewType> = {
  '': 'home', // index route
};

export function viewToPath(view: string): string {
  const slug = VIEW_TO_SLUG[view] ?? view;
  return slug ? `/student/${slug}` : '/student';
}

export function pathToView(pathname: string): ViewType {
  const match = pathname.match(/^\/student\/?(.*)$/);
  const slug = match?.[1]?.split('/')[0] ?? '';
  return (SLUG_TO_VIEW[slug] ?? (slug || 'home')) as ViewType;
}

// ── Hook ─────────────────────────────────────────────────────

export function useStudentNav() {
  const navigate = useNavigate();
  const location = useLocation();

  /** Current view derived from URL — single source of truth */
  const currentView = useMemo(
    () => pathToView(location.pathname),
    [location.pathname],
  );

  /** Navigate to a student view by its ViewType id */
  const navigateTo = useCallback(
    (view: ViewType) => {
      navigate(viewToPath(view));
    },
    [navigate],
  );

  /** Check if the current URL matches any of the given views */
  const isView = useCallback(
    (...views: ViewType[]) => views.includes(currentView),
    [currentView],
  );

  return { navigateTo, currentView, isView } as const;
}
