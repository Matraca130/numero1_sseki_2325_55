// ============================================================
// AnimatedOutlet — Lightweight page transition for React Router
//
// PERF-72: Replaced key={location.pathname} which caused FULL
// React subtree remount on every navigation (destroying all
// component state, re-triggering all useEffects/fetches).
//
// New approach: CSS-only fade-in animation. Zero remounts.
// The Outlet stays mounted — only the content inside changes.
// This preserves React state and avoids redundant API calls.
// ============================================================

import { Outlet } from 'react-router';

export function AnimatedOutlet() {
  return (
    <div className="h-full w-full animate-in fade-in duration-200">
      <Outlet />
    </div>
  );
}