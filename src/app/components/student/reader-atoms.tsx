// ============================================================
// Axon — Reader Atoms (shared tiny presentational components)
//
// Extracted from StudentSummaryReader.tsx (Phase 2, Step 4.0).
// Used by ReaderChunksTab, ReaderKeywordsTab, ReaderAnnotationsTab,
// and StudentSummaryReader (orchestrator — TabBadge in TabsList).
// ============================================================
import React from 'react';

// ── ListSkeleton ────────────────────────────────────────
// H-3 FIX: Module-scope component (was defined inside SSR,
// causing React Fiber to unmount/remount on every parent render
// due to unstable function reference identity).

export function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
          <div className="w-6 h-6 rounded bg-zinc-200" />
          <div className="flex-1">
            <div className="h-3 w-48 bg-zinc-200 rounded mb-2" />
            <div className="h-2.5 w-32 bg-zinc-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── TabBadge ──────────────────────────────────────────

export function TabBadge({ count, active }: { count: number; active?: boolean }) {
  return (
    <span className={`ml-1 text-[10px] rounded-full px-1.5 py-0.5 ${active ? 'bg-teal-100 text-teal-700' : 'bg-zinc-200 text-zinc-600'}`}>
      {count}
      <span className="sr-only"> elementos</span>
    </span>
  );
}