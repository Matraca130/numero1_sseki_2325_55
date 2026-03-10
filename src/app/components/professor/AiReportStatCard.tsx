// ============================================================
// Axon — AI Report Stat Card (R11 extraction)
//
// Compact metric card used in AiReportsDashboard stats grid.
// Extracted to keep AiReportsDashboard under 500 lines.
// ============================================================

import React from 'react';

// ── Props ─────────────────────────────────────────────

export interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  subValue?: string;
}

// ── Component ───────────────────────────────────────────

export const StatCard = React.memo(function StatCard({
  label,
  value,
  icon,
  color,
  subValue,
}: StatCardProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-zinc-200">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[16px] text-zinc-900" style={{ fontWeight: 700 }}>{value}</p>
        <p className="text-[9px] text-zinc-400 truncate" style={{ fontWeight: 500 }}>{label}</p>
        {subValue && (
          <p className="text-[8px] text-zinc-300 truncate">{subValue}</p>
        )}
      </div>
    </div>
  );
});
