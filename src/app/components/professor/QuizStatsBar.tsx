// ============================================================
// Axon — Professor: QuizStatsBar
//
// Displays question statistics badges (total, active, by type,
// by difficulty). Pure presentational component.
// Extracted from ProfessorQuizzesPage in Phase 4 refactor.
// ============================================================

import React from 'react';
import clsx from 'clsx';

// ── Types ─────────────────────────────────────────────────

export interface QuizStats {
  total: number;
  active: number;
  byType: Record<string, number>;
  byDiff: Record<string, number>;
}

interface QuizStatsBarProps {
  stats: QuizStats;
}

// ── Component ─────────────────────────────────────────────

export const QuizStatsBar = React.memo(function QuizStatsBar({ stats }: QuizStatsBarProps) {
  return (
    <div className="bg-white border-b border-zinc-200 px-5 py-2.5">
      <div className="flex items-center gap-4 flex-wrap">
        <StatBadge label="Total" value={stats.total} color="bg-gray-100 text-gray-700" />
        <StatBadge label="Activas" value={stats.active} color="bg-emerald-50 text-emerald-700" />
        <div className="w-px h-5 bg-gray-200" />
        <StatBadge label="Opcion mult." value={stats.byType.mcq} color="bg-blue-50 text-blue-700" />
        <StatBadge label="V/F" value={stats.byType.true_false} color="bg-indigo-50 text-indigo-700" />
        <StatBadge label="Completar" value={stats.byType.fill_blank} color="bg-cyan-50 text-cyan-700" />
        <StatBadge label="Abierta" value={stats.byType.open} color="bg-violet-50 text-violet-700" />
        <div className="w-px h-5 bg-gray-200" />
        <StatBadge label="Facil" value={stats.byDiff.easy} color="bg-emerald-50 text-emerald-700" />
        <StatBadge label="Media" value={stats.byDiff.medium} color="bg-amber-50 text-amber-700" />
        <StatBadge label="Dificil" value={stats.byDiff.hard} color="bg-red-50 text-red-700" />
      </div>
    </div>
  );
});

// ── Stat Badge ────────────────────────────────────────────

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={clsx('flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px]', color)}>
      <span style={{ fontWeight: 700 }}>{value}</span>
      <span style={{ fontWeight: 500 }}>{label}</span>
    </div>
  );
}
