// ============================================================
// Axon — Student Quiz: Progress Trend Chart (P10 Feature)
//
// Agent: PROGRESS
// Line chart showing quiz performance over time using
// historical study session data.
//
// Uses recharts AreaChart for visual impact.
// Design: teal gradient, matches student accent.
// ============================================================

import React, { useMemo } from 'react';
import type { StudySession } from '@/app/services/quizApi';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

// ── Props ────────────────────────────────────────────────

interface ProgressTrendChartProps {
  sessions: StudySession[];
}

// ── Helpers ──────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short' });
}

// ── Component ────────────────────────────────────────────

export const ProgressTrendChart = React.memo(function ProgressTrendChart({
  sessions,
}: ProgressTrendChartProps) {
  // Only completed sessions with actual review data
  const chartData = useMemo(() => {
    return sessions
      .filter(s => s.completed_at && s.total_reviews && s.total_reviews > 0)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(s => ({
        date: formatDate(s.created_at),
        pct: Math.round(((s.correct_reviews || 0) / s.total_reviews!) * 100),
        correct: s.correct_reviews || 0,
        total: s.total_reviews || 0,
      }));
  }, [sessions]);

  // Trend calculation (comparing last 3 vs first 3)
  const trend = useMemo(() => {
    if (chartData.length < 2) return 'neutral';
    const recent = chartData.slice(-3);
    const early = chartData.slice(0, 3);
    const recentAvg = recent.reduce((s, d) => s + d.pct, 0) / recent.length;
    const earlyAvg = early.reduce((s, d) => s + d.pct, 0) / early.length;
    const diff = recentAvg - earlyAvg;
    if (diff > 5) return 'up';
    if (diff < -5) return 'down';
    return 'neutral';
  }, [chartData]);

  // Guard: need at least 2 data points
  if (chartData.length < 2) return null;

  const avg = Math.round(chartData.reduce((s, d) => s + d.pct, 0) / chartData.length);

  return (
    <div className="mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-zinc-500 flex items-center gap-1.5" style={{ fontWeight: 600 }}>
          {trend === 'up' ? (
            <><TrendingUp size={13} className="text-emerald-500" /> Tendencia al alza</>
          ) : trend === 'down' ? (
            <><TrendingDown size={13} className="text-rose-500" /> Tendencia a la baja</>
          ) : (
            <><Minus size={13} className="text-zinc-400" /> Tendencia estable</>
          )}
        </span>
        <span className="text-[10px] text-zinc-400">
          Promedio: <span style={{ fontWeight: 700 }} className={clsx(
            avg >= 70 ? 'text-emerald-600' : avg >= 40 ? 'text-amber-600' : 'text-rose-500',
          )}>{avg}%</span>
        </span>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-zinc-200 p-3">
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: '#a1a1aa' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: '#a1a1aa' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 10,
                border: '1px solid #e4e4e7',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number) => [`${value}%`, 'Puntaje']}
            />
            {/* BKT mastery threshold line */}
            <ReferenceLine
              y={80}
              stroke="#0d9488"
              strokeDasharray="4 4"
              strokeOpacity={0.4}
              label={{ value: 'BKT \u226580%', fontSize: 8, fill: '#0d9488', position: 'left' }}
            />
            <Area
              type="monotone"
              dataKey="pct"
              stroke="#0d9488"
              strokeWidth={2}
              fill="url(#progressFill)"
              dot={{ r: 3, fill: '#0d9488', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 5, stroke: '#0d9488', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});