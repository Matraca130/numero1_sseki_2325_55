// ============================================================
// Axon — WeeklyActivityChart (extracted from StudyHubView.tsx)
// Bar chart showing last 7 days of study activity.
// Zero functional changes — pure extraction.
// ============================================================
import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  BarChart3, TrendingUp, Target, Clock, BookOpen,
} from 'lucide-react';
import { useMotionPresets } from '@/app/components/shared/FadeIn';

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
  const { fadeUp } = useMotionPresets();
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      className="bg-white border border-zinc-200 rounded-2xl p-6 relative overflow-hidden"
      {...fadeUp(0.6)}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-teal-700" />
          </div>
          <div>
            <h3 className="text-sm text-zinc-900" style={{ fontWeight: 700 }}>Actividad Semanal</h3>
            <p className="text-xs text-zinc-500" style={{ fontWeight: 400 }}>Tu progreso de los últimos 7 días</p>
          </div>
        </div>

        {weeklyTotalMin > 0 && (
          <motion.span
            className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1.5"
            initial={shouldReduce ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 1 }}
            style={{ fontWeight: 600 }}
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
                className={`w-full h-full rounded-lg transition-colors ${
                  bar.active
                    ? 'bg-teal-600 shadow-md shadow-teal-600/20'
                    : bar.value > 0 ? 'bg-zinc-300 hover:bg-zinc-400' : 'bg-zinc-200'
                }`}
              />
              {/* Tooltip on hover */}
              {bar.value > 0 && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-900 text-white text-[10px] rounded-md opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none" style={{ fontWeight: 600 }}>
                  {bar.value} min
                </div>
              )}
            </motion.div>
            <span
              className={`text-[11px] ${bar.active ? 'text-teal-700' : 'text-zinc-400'}`}
              style={{ fontWeight: bar.active ? 700 : 500 }}
            >
              {bar.day}
            </span>
          </div>
        ))}
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-6 mt-6 pt-5 border-t border-zinc-100 flex-wrap">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-zinc-400" />
          <span className="text-xs text-zinc-600" style={{ fontWeight: 500 }}>
            Meta diaria: <span className="text-zinc-900" style={{ fontWeight: 700 }}>{goalMinutes} min</span>
          </span>
        </div>
        <div className="h-4 w-px bg-zinc-200" />
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-400" />
          <span className="text-xs text-zinc-600" style={{ fontWeight: 500 }}>
            Hoy: <span className="text-teal-700" style={{ fontWeight: 700 }}>
              {todayMinutes} min
            </span>
          </span>
        </div>
        <div className="h-4 w-px bg-zinc-200" />
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-zinc-400" />
          <span className="text-xs text-zinc-600" style={{ fontWeight: 500 }}>
            Total semanal: <span className="text-zinc-900" style={{ fontWeight: 700 }}>{weeklyTotalMin} min</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}
