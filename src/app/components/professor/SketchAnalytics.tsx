// ============================================================
// Axon — SketchAnalytics: Professor Analytics Dashboard
// PARALLEL-SAFE: This file is independent. Edit freely.
//
// Queries sketch_interactions via Supabase and displays:
//   - Most used engines (bar chart)
//   - Avg time per sketch (bar chart)
//   - Most adjusted params (bar chart)
//   - Filterable by date range, summary, and student
// ============================================================
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { ChartErrorBoundary } from '@/app/components/shared/ChartErrorBoundary';
import { Skeleton } from '@/app/components/ui/skeleton';
import { BarChart3, Clock, Sliders, Filter, X } from 'lucide-react';
import { ENGINE_DISPLAY_NAMES } from '@/app/components/algorithmic-art/engines/index';
import type { EngineKey } from '@/app/components/algorithmic-art/types';
import clsx from 'clsx';

// ── Types ─────────────────────────────────────────────────

interface InteractionRow {
  id: string;
  engine: EngineKey;
  action: string;
  param_key: string | null;
  param_value: string | null;
  seed: number | null;
  duration_ms: number | null;
  created_at: string;
  user_id?: string;
  summary_id?: string;
}

interface DateFilter {
  from: string; // ISO date
  to: string;
}

// ── Colors (Anthropic palette) ────────────────────────────

const CHART_COLORS = [
  '#d97757', // orange
  '#6a9bcc', // blue
  '#788c5d', // green
  '#c4856b', // salmon
  '#8b7ec8', // purple
  '#5c9e8f', // teal
  '#d4a853', // gold
  '#b05a7a', // rose
  '#6b8fa3', // steel
  '#a0855b', // amber
];

// ── Data Fetching ─────────────────────────────────────────

async function fetchInteractions(dateFilter: DateFilter): Promise<InteractionRow[]> {
  let query = supabase
    .from('sketch_interactions')
    .select('*')
    .gte('created_at', dateFilter.from)
    .lte('created_at', dateFilter.to)
    .order('created_at', { ascending: false })
    .limit(5000);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as InteractionRow[];
}

// ── Stat Card ─────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-500/10 shrink-0">
        <Icon size={16} className="text-orange-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-lg font-semibold text-white tabular-nums">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────

export function SketchAnalytics() {
  // Default date range: last 30 days
  const [dateFilter, setDateFilter] = useState<DateFilter>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    };
  });

  const [engineFilter, setEngineFilter] = useState<EngineKey | 'all'>('all');

  const { data: interactions, isLoading, error } = useQuery({
    queryKey: ['sketch-interactions', dateFilter],
    queryFn: () => fetchInteractions(dateFilter),
    staleTime: 60_000,
  });

  // ── Filtered data ──
  const filtered = useMemo(() => {
    if (!interactions) return [];
    if (engineFilter === 'all') return interactions;
    return interactions.filter(i => i.engine === engineFilter);
  }, [interactions, engineFilter]);

  // ── Aggregations ──

  // 1. Most used engines
  const engineUsage = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of filtered) {
      const name = ENGINE_DISPLAY_NAMES[row.engine] ?? row.engine;
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return Array.from(map, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  // 2. Avg time per engine (from 'view' actions with duration_ms)
  const avgTimeData = useMemo(() => {
    const sums = new Map<string, { total: number; count: number }>();
    for (const row of filtered) {
      if (row.action !== 'view' || !row.duration_ms) continue;
      const name = ENGINE_DISPLAY_NAMES[row.engine] ?? row.engine;
      const entry = sums.get(name) ?? { total: 0, count: 0 };
      entry.total += row.duration_ms;
      entry.count += 1;
      sums.set(name, entry);
    }
    return Array.from(sums, ([name, { total, count }]) => ({
      name,
      avgSeconds: Math.round(total / count / 1000),
    })).sort((a, b) => b.avgSeconds - a.avgSeconds);
  }, [filtered]);

  // 3. Most adjusted params
  const paramUsage = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of filtered) {
      if (row.action !== 'param_change' || !row.param_key) continue;
      map.set(row.param_key, (map.get(row.param_key) ?? 0) + 1);
    }
    return Array.from(map, ([param, count]) => ({ param, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [filtered]);

  // 4. Summary stats
  const totalInteractions = filtered.length;
  const uniqueEngines = new Set(filtered.map(i => i.engine)).size;
  const totalViews = filtered.filter(i => i.action === 'view').length;
  const totalParamChanges = filtered.filter(i => i.action === 'param_change').length;

  // ── Handlers ──
  const handleClearFilters = useCallback(() => {
    setEngineFilter('all');
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    setDateFilter({
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    });
  }, []);

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400 text-sm">Error cargando analíticas: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white font-[Poppins,sans-serif]">
            Analíticas de Arte Algorítmico
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Interacciones de los estudiantes con los motores de visualización
          </p>
        </div>
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/30 px-4 py-3"
        role="region"
        aria-label="Filtros de analíticas"
      >
        <Filter size={14} className="text-slate-400 shrink-0" />

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400" htmlFor="analytics-date-from">Desde</label>
          <input
            id="analytics-date-from"
            type="date"
            value={dateFilter.from}
            onChange={e => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
            className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            aria-label="Fecha desde"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400" htmlFor="analytics-date-to">Hasta</label>
          <input
            id="analytics-date-to"
            type="date"
            value={dateFilter.to}
            onChange={e => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
            className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            aria-label="Fecha hasta"
          />
        </div>

        <select
          value={engineFilter}
          onChange={e => setEngineFilter(e.target.value as EngineKey | 'all')}
          className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
          aria-label="Filtrar por motor"
        >
          <option value="all">Todos los motores</option>
          {Object.entries(ENGINE_DISPLAY_NAMES).map(([key, name]) => (
            <option key={key} value={key}>{name}</option>
          ))}
        </select>

        {(engineFilter !== 'all') && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
            aria-label="Limpiar filtros"
          >
            <X size={12} />
            Limpiar
          </button>
        )}
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BarChart3} label="Total interacciones" value={totalInteractions} />
          <StatCard icon={Sliders} label="Motores usados" value={uniqueEngines} subtitle="de 10 disponibles" />
          <StatCard icon={Clock} label="Vistas totales" value={totalViews} />
          <StatCard icon={Sliders} label="Cambios de parámetro" value={totalParamChanges} />
        </div>
      )}

      {/* Charts */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Engine Usage Bar Chart */}
          <ChartErrorBoundary>
            <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4">
              <h3 className="text-sm font-medium text-slate-200 mb-4">
                Uso por motor
              </h3>
              {engineUsage.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-10">Sin datos en el rango seleccionado</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={engineUsage} layout="vertical" margin={{ left: 100, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      width={100}
                    />
                    <RechartsTooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#f1f5f9' }}
                    />
                    <Bar dataKey="count" fill="#d97757" radius={[0, 4, 4, 0]} name="Interacciones" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartErrorBoundary>

          {/* Avg Time Bar Chart */}
          <ChartErrorBoundary>
            <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4">
              <h3 className="text-sm font-medium text-slate-200 mb-4">
                Tiempo promedio por motor (segundos)
              </h3>
              {avgTimeData.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-10">Sin datos de duración</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={avgTimeData} layout="vertical" margin={{ left: 100, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      width={100}
                    />
                    <RechartsTooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#f1f5f9' }}
                    />
                    <Bar dataKey="avgSeconds" fill="#6a9bcc" radius={[0, 4, 4, 0]} name="Promedio (s)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartErrorBoundary>

          {/* Most Adjusted Params */}
          <ChartErrorBoundary>
            <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4 lg:col-span-2">
              <h3 className="text-sm font-medium text-slate-200 mb-4">
                Parámetros más ajustados
              </h3>
              {paramUsage.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-10">Sin cambios de parámetros</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={paramUsage} margin={{ left: 20, right: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="param"
                      tick={{ fontSize: 10, fill: '#94a3b8', angle: -45, textAnchor: 'end' }}
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <RechartsTooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#f1f5f9' }}
                    />
                    <Bar dataKey="count" fill="#788c5d" radius={[4, 4, 0, 0]} name="Ajustes" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartErrorBoundary>
        </div>
      )}
    </div>
  );
}

export default SketchAnalytics;
