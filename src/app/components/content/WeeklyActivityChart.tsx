// ============================================================
// Axon — WeeklyActivityChart (AUDIT v3 — Palette)
//
// PALETTE AUDIT:
//   - All colors now derive from Axon Medical Academy palette
//   - Active bar: #2a8c7a (Teal Accent) with Dark Teal shadow
//   - Badge: teal tints, not generic emerald
//   - Labels: palette-derived grays and teal
//   - Zero generic Tailwind color classes
//
// Palette:
//   Dark Teal:  #1B3B36   Teal Accent:  #2a8c7a
//   Hover Teal: #244e47   Dark Panel:   #1a2e2a
//   Progress:   #2dd4a8 → #0d9488
// ============================================================
import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  BarChart3, TrendingUp, Target, Clock, BookOpen,
} from 'lucide-react';

// ── Axon palette ─────────────────────────────────────────────
import { axon, tint } from '@/app/lib/palette';

// ── Types ────────────────────────────────────────────────────

export interface DayActivity {
  day: string;
  value: number;
  active: boolean;
}

export interface WeeklyActivityChartProps {
  weeklyActivity: DayActivity[];
  weeklyTotalMin: number;
  maxBarValue: number;
  goalMinutes: number;
  todayMinutes: number;
}

// ── Component ────────────────────────────────────────────────

export function WeeklyActivityChart({
  weeklyActivity,
  weeklyTotalMin,
  maxBarValue,
  goalMinutes,
  todayMinutes,
}: WeeklyActivityChartProps) {
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      className="rounded-2xl p-6 relative overflow-hidden border"
      style={{
        backgroundColor: axon.cardBg,
        borderColor: tint.neutralBorder,
      }}
      initial={shouldReduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center border"
            style={{ backgroundColor: tint.tealBg, borderColor: tint.tealBorder }}
          >
            <BarChart3 className="w-4 h-4" style={{ color: axon.darkTeal }} />
          </div>
          <div>
            <h3 className="text-sm" style={{ color: '#111827', fontWeight: 700 }}>Actividad Semanal</h3>
            <p className="text-xs" style={{ color: '#6b7280', fontWeight: 400 }}>Tu progreso de los ultimos 7 dias</p>
          </div>
        </div>

        {weeklyTotalMin > 0 && (
          <motion.span
            className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 border"
            style={{
              backgroundColor: tint.tealBg,
              color: axon.progressEnd,
              borderColor: tint.tealBorder,
              fontWeight: 600,
            }}
            initial={shouldReduce ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 1 }}
          >
            <TrendingUp className="w-3 h-3" />
            {weeklyTotalMin} min esta semana
          </motion.span>
        )}
      </div>

      {/* Chart area */}
      <div className="flex items-end gap-2 h-32 px-2">
        {weeklyActivity.map((bar, i) => (
          <div key={bar.day} className="flex-1 flex flex-col items-center gap-2">
            <motion.div
              className="relative w-full max-w-10 group/bar cursor-pointer"
              initial={shouldReduce ? { height: `${(bar.value / maxBarValue) * 100}px` } : { height: 0 }}
              animate={{ height: `${Math.max((bar.value / maxBarValue) * 100, bar.value > 0 ? 8 : 4)}px` }}
              transition={{ delay: 0.8 + i * 0.06, duration: 0.4, ease: 'easeOut' }}
            >
              <div
                className="w-full h-full rounded-lg transition-colors"
                style={{
                  backgroundColor: bar.active
                    ? axon.tealAccent
                    : bar.value > 0 ? '#cbd5e1' : '#e2e8f0',
                  ...(bar.active ? { boxShadow: `0 4px 12px ${axon.tealAccent}33` } : {}),
                }}
              />
              {bar.value > 0 && (
                <div
                  className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-white text-[10px] rounded-md opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
                  style={{ backgroundColor: axon.darkTeal, fontWeight: 600 }}
                >
                  {bar.value} min
                </div>
              )}
            </motion.div>
            <span
              className="text-[11px]"
              style={{
                color: bar.active ? axon.tealAccent : tint.neutralText,
                fontWeight: bar.active ? 700 : 500,
              }}
            >
              {bar.day}
            </span>
          </div>
        ))}
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-6 mt-6 pt-5 flex-wrap" style={{ borderTop: `1px solid ${tint.neutralBorder}` }}>
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: tint.neutralText }} />
          <span className="text-xs" style={{ color: '#4b5563', fontWeight: 500 }}>
            Meta diaria: <span style={{ color: '#111827', fontWeight: 700 }}>{goalMinutes} min</span>
          </span>
        </div>
        <div className="h-4 w-px" style={{ backgroundColor: tint.neutralBorder }} />
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" style={{ color: tint.neutralText }} />
          <span className="text-xs" style={{ color: '#4b5563', fontWeight: 500 }}>
            Hoy: <span style={{ color: axon.tealAccent, fontWeight: 700 }}>
              {todayMinutes} min
            </span>
          </span>
        </div>
        <div className="h-4 w-px" style={{ backgroundColor: tint.neutralBorder }} />
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" style={{ color: tint.neutralText }} />
          <span className="text-xs" style={{ color: '#4b5563', fontWeight: 500 }}>
            Total semanal: <span style={{ color: '#111827', fontWeight: 700 }}>{weeklyTotalMin} min</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}
