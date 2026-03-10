// ============================================================
// Axon — withBoundary HOC (route-level ErrorBoundary wrapper)
//
// Wraps a lazy-loaded route component with ErrorBoundary so that
// rendering crashes show a retry fallback instead of a white screen.
//
// USAGE (in route files):
//   import { withBoundary } from '@/app/lib/withBoundary';
//
//   {
//     path: 'summaries',
//     lazy: () => import('...StudentSummariesView')
//       .then(m => ({ Component: withBoundary(m.StudentSummariesView, 'Error en resumenes') })),
//   }
//
// WHY IT'S SAFE:
//   - React Router's lazy() runs ONCE per route; the returned Component
//     is cached. The wrapper has a stable identity — no re-creation.
//   - ErrorBoundary is transparent when no error: returns children as-is.
//   - Inner component still receives route context via hooks (useParams, etc.).
//
// Phase 17 (2026-03-10): Created to address white-screen gap in 21 routes.
// ============================================================
import React from 'react';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';

/**
 * Wrap a component with ErrorBoundary. Intended for use inside
 * React Router `lazy()` callbacks where the result is cached.
 */
export function withBoundary<P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
  fallbackTitle: string,
): React.ComponentType<P> {
  function Bounded(props: P) {
    return (
      <ErrorBoundary fallbackTitle={fallbackTitle}>
        <Component {...props} />
      </ErrorBoundary>
    );
  }
  Bounded.displayName = `Bounded(${Component.displayName || Component.name || 'Component'})`;
  return Bounded;
}
