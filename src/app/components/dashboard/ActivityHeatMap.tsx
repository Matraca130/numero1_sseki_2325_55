// ============================================================
// Axon — ActivityHeatMap (EV-7 Prompt B)
// GitHub-style heatmap of daily study activity.
// Data: GET /daily-activities?from=&to=
// ============================================================
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  getDailyActivities,
  type DailyActivityRecord,
} from '@/app/services/platformApi';

// ── Types ────────────────────────────────────────────────

interface DayCell {
  date: string; // YYYY-MM-DD
  reviews_count: number;
  correct_count: number;
  time_spent_seconds: number;
  sessions_count: number;
}

// ── Helpers ──────────────────────────────────────────────

function toISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getColor(count: number): string {
  if (count === 0) return 'bg-zinc-800';
  if (count <= 3) return 'bg-violet-900/60';
  if (count <= 8) return 'bg-violet-700/80';
  if (count <= 15) return 'bg-violet-500';
  return 'bg-violet-400';
}

const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

const DAY_LABELS: Record<number, string> = { 1: 'Lun', 3: 'Mie', 5: 'Vie' };

function formatMinutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest > 0 ? `${h}h ${rest}m` : `${h}h`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

// ── Build grid ───────────────────────────────────────────

function buildWeeks(
  from: Date,
  to: Date,
  dataMap: Map<string, DailyActivityRecord>,
): DayCell[][] {
  const weeks: DayCell[][] = [];
  const cursor = new Date(from);

  // Start from the Monday of the 'from' week
  const dayOfWeek = cursor.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  cursor.setDate(cursor.getDate() + mondayOffset);

  while (cursor <= to) {
    const week: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = toISO(cursor);
      const rec = dataMap.get(iso);
      week.push({
        date: iso,
        reviews_count: rec?.reviews_count ?? 0,
        correct_count: rec?.correct_count ?? 0,
        time_spent_seconds: rec?.time_spent_seconds ?? 0,
        sessions_count: rec?.sessions_count ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

function getMonthLabels(weeks: DayCell[][]): { label: string; colIndex: number }[] {
  const labels: { label: string; colIndex: number }[] = [];
  let lastMonth = -1;

  for (let w = 0; w < weeks.length; w++) {
    // Use the Monday (index 0) of each week
    const d = new Date(weeks[w][0].date + 'T12:00:00');
    const month = d.getMonth();
    if (month !== lastMonth) {
      labels.push({ label: MONTH_NAMES[month], colIndex: w });
      lastMonth = month;
    }
  }

  return labels;
}

// ── Tooltip component ────────────────────────────────────

function CellTooltip({ cell }: { cell: DayCell }) {
  const pct =
    cell.reviews_count > 0
      ? Math.round((cell.correct_count / cell.reviews_count) * 100)
      : 0;

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl text-xs whitespace-nowrap"
      >
        <p className="font-medium text-zinc-100 mb-1">{formatDate(cell.date)}</p>
        {cell.reviews_count === 0 ? (
          <p className="text-zinc-400">Sin actividad</p>
        ) : (
          <>
            <p className="text-zinc-300">
              {cell.reviews_count} repasos · {cell.correct_count} correctos ({pct}%)
            </p>
            <p className="text-zinc-400">
              {cell.sessions_count} sesion{cell.sessions_count !== 1 ? 'es' : ''} ·{' '}
              {formatMinutes(cell.time_spent_seconds)} estudiados
            </p>
          </>
        )}
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-zinc-700" />
      </motion.div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────

export function ActivityHeatMap() {
  const [data, setData] = useState<DailyActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Date range: 26 weeks back
  const { from, to } = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 26 * 7);
    return { from: start, to: today };
  }, []);

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fromStr = toISO(from);
        const toStr = toISO(to);
        console.log(`[HeatMap] GET /daily-activities?from=${fromStr}&to=${toStr}`);
        const result = await getDailyActivities(fromStr, toStr, 200);
        if (!cancelled) setData(result);
      } catch (err) {
        console.error('[HeatMap] Failed to load daily activities:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [from, to]);

  // Build lookup map and weeks grid
  const dataMap = useMemo(() => {
    const m = new Map<string, DailyActivityRecord>();
    for (const rec of data) {
      m.set(rec.activity_date, rec);
    }
    return m;
  }, [data]);

  const allWeeks = useMemo(() => buildWeeks(from, to, dataMap), [from, to, dataMap]);

  // Mobile: last 13 weeks
  const mobileWeeks = useMemo(() => {
    return allWeeks.slice(Math.max(0, allWeeks.length - 13));
  }, [allWeeks]);

  const monthLabels = useMemo(() => getMonthLabels(allWeeks), [allWeeks]);
  const mobileMonthLabels = useMemo(() => getMonthLabels(mobileWeeks), [mobileWeeks]);

  const totalReviews = useMemo(() => {
    return data.reduce((acc, d) => acc + (d.reviews_count || 0), 0);
  }, [data]);

  const handleMouseEnter = useCallback((date: string) => setHoveredCell(date), []);
  const handleMouseLeave = useCallback(() => setHoveredCell(null), []);

  // ── Render ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 h-full min-h-[220px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 animate-pulse" />
          <p className="text-sm text-zinc-500 animate-pulse">Cargando actividad...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-100">Actividad de estudio</h3>
        <span className="text-xs text-zinc-500">Ultimos 6 meses</span>
      </div>

      {/* ── Desktop Grid (hidden on mobile) ── */}
      <div className="hidden sm:block">
        <HeatGrid
          weeks={allWeeks}
          monthLabels={monthLabels}
          hoveredCell={hoveredCell}
          onEnter={handleMouseEnter}
          onLeave={handleMouseLeave}
          cellSize="w-3 h-3"
        />
      </div>

      {/* ── Mobile Grid ── */}
      <div className="block sm:hidden overflow-x-auto">
        <HeatGrid
          weeks={mobileWeeks}
          monthLabels={mobileMonthLabels}
          hoveredCell={hoveredCell}
          onEnter={handleMouseEnter}
          onLeave={handleMouseLeave}
          cellSize="w-[10px] h-[10px]"
        />
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-between">
        {/* Color scale — hidden on mobile */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500">
          <span>Menos</span>
          <div className="w-3 h-3 rounded-sm bg-zinc-800" />
          <div className="w-3 h-3 rounded-sm bg-violet-900/60" />
          <div className="w-3 h-3 rounded-sm bg-violet-700/80" />
          <div className="w-3 h-3 rounded-sm bg-violet-500" />
          <div className="w-3 h-3 rounded-sm bg-violet-400" />
          <span>Mas</span>
        </div>

        <p className="text-xs text-zinc-400">
          Total: <span className="font-semibold text-zinc-200">{totalReviews.toLocaleString()}</span> repasos
        </p>
      </div>
    </motion.div>
  );
}

// ── HeatGrid sub-component ───────────────────────────────

function HeatGrid({
  weeks,
  monthLabels,
  hoveredCell,
  onEnter,
  onLeave,
  cellSize,
}: {
  weeks: DayCell[][];
  monthLabels: { label: string; colIndex: number }[];
  hoveredCell: string | null;
  onEnter: (date: string) => void;
  onLeave: () => void;
  cellSize: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {/* Month labels */}
      <div className="flex ml-8">
        {monthLabels.map((m, i) => {
          // Calculate left offset based on column position
          const nextCol = i < monthLabels.length - 1 ? monthLabels[i + 1].colIndex : weeks.length;
          const span = nextCol - m.colIndex;
          return (
            <div
              key={`${m.label}-${m.colIndex}`}
              className="text-[10px] text-zinc-500"
              style={{ width: `${span * 14}px`, minWidth: `${span * 14}px` }}
            >
              {m.label}
            </div>
          );
        })}
      </div>

      {/* Grid rows (7 days) */}
      <div className="flex gap-0">
        {/* Day labels column */}
        <div className="flex flex-col gap-[2px] pr-2 justify-start">
          {Array.from({ length: 7 }, (_, dayIdx) => (
            <div
              key={dayIdx}
              className={`${cellSize} flex items-center justify-end`}
            >
              {DAY_LABELS[dayIdx] && (
                <span className="text-[10px] text-zinc-500 leading-none">
                  {DAY_LABELS[dayIdx]}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className="flex flex-col gap-[2px]">
            {week.map((cell, dIdx) => (
              <div key={cell.date} className="relative">
                <div
                  className={`${cellSize} rounded-sm ${getColor(cell.reviews_count)} cursor-pointer transition-all duration-100 hover:ring-1 hover:ring-zinc-500`}
                  onMouseEnter={() => onEnter(cell.date)}
                  onMouseLeave={onLeave}
                />
                {hoveredCell === cell.date && <CellTooltip cell={cell} />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
