// ============================================================
// Axon — Admin: AI Health Dashboard
// PARALLEL-SAFE: This file is independent. Edit freely.
//
// Shows AI usage metrics: total calls, success rate,
// average latency, fallback rate, and a log table.
//
// CONTEXT (usePlatformData):
//   Reads:    (none — fetches AI logs independently)
//
// API DIRECT:
//   getAiScheduleLogs (from pa-ai.ts)
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { headingStyle } from '@/app/design-system';
import { getAiScheduleLogs } from '@/app/services/platform-api/pa-ai';
import type { AiScheduleLog } from '@/app/services/platform-api/pa-ai';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  ArrowDownCircle,
} from 'lucide-react';

// ─── Stats Card ─────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      </div>
      <p className="font-bold text-gray-900" style={{ ...headingStyle, fontSize: 'clamp(1.25rem, 2vw, 1.75rem)' }}>
        {value}
      </p>
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────

function StatusBadge({ status }: { status: AiScheduleLog['status'] }) {
  switch (status) {
    case 'success':
      return (
        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-xs gap-1">
          <CheckCircle2 size={12} />
          Exito
        </Badge>
      );
    case 'fallback':
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-xs gap-1">
          <AlertTriangle size={12} />
          Fallback
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-xs gap-1">
          <XCircle size={12} />
          Error
        </Badge>
      );
    default:
      return null;
  }
}

// ─── Loading Skeleton ───────────────────────────────────────

function AiHealthSkeleton() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

// ─── Error State ────────────────────────────────────────────

function AiHealthError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-md mx-auto mt-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} />
        </div>
        <h2 className="font-semibold text-gray-900 mb-2" style={headingStyle}>
          Error al cargar
        </h2>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <Button onClick={onRetry} className="gap-2">
          <RefreshCw size={14} />
          Reintentar
        </Button>
      </div>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────

function AiHealthEmpty() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-4">
        <Activity size={24} />
      </div>
      <h3 className="font-semibold text-gray-900 mb-1" style={headingStyle}>
        Sin registros de IA
      </h3>
      <p className="text-sm text-gray-500">
        Aun no hay actividad de IA registrada para esta institucion.
      </p>
    </div>
  );
}

// ─── Timestamp Formatter ────────────────────────────────────

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ─── Main Page ──────────────────────────────────────────────

export function AdminAIHealthPage() {
  const [logs, setLogs] = useState<AiScheduleLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAiScheduleLogs({ limit: 50 });
      setLogs(result.items ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ─── Derived Stats ────────────────────────────────────────

  const stats = useMemo(() => {
    const total = logs.length;
    if (total === 0) {
      return {
        total: 0,
        successRate: '0',
        avgLatency: '0',
        fallbackRate: '0',
      };
    }
    const successes = logs.filter((l) => l.status === 'success').length;
    const fallbacks = logs.filter((l) => l.status === 'fallback').length;
    const totalLatency = logs.reduce((sum, l) => sum + (l.latency_ms ?? 0), 0);

    return {
      total,
      successRate: ((successes / total) * 100).toFixed(1),
      avgLatency: Math.round(totalLatency / total).toLocaleString(),
      fallbackRate: ((fallbacks / total) * 100).toFixed(1),
    };
  }, [logs]);

  // ─── Render ───────────────────────────────────────────────

  if (loading) return <AiHealthSkeleton />;
  if (error) return <AiHealthError message={error} onRetry={fetchLogs} />;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <PageHeader
        icon={<Activity size={22} />}
        title="AI Health"
        subtitle="Monitoreo del rendimiento de inteligencia artificial"
        accent="blue"
        actions={
          <Button variant="outline" onClick={fetchLogs} className="gap-2">
            <RefreshCw size={14} />
            Actualizar
          </Button>
        }
      />

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          icon={<Zap size={20} />}
          label="Total llamadas"
          value={stats.total.toLocaleString()}
          iconBg="bg-teal-50"
          iconColor="text-teal-500"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Tasa de exito"
          value={`${stats.successRate}%`}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Latencia promedio"
          value={`${stats.avgLatency} ms`}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
        />
        <StatCard
          icon={<ArrowDownCircle size={20} />}
          label="Tasa de fallback"
          value={`${stats.fallbackRate}%`}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
        />
      </motion.div>

      {/* Logs Table */}
      {logs.length === 0 ? (
        <AiHealthEmpty />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-5 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900" style={headingStyle}>
              Ultimos registros
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Mostrando las ultimas {logs.length} operaciones de IA
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 font-medium text-gray-500">Timestamp</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Accion</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Estado</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Modelo</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-right">Latencia</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-right">Tokens</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Error / Fallback</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">
                      {formatTimestamp(log.created_at)}
                    </td>
                    <td className="px-5 py-3 text-gray-900 font-medium">
                      {log.action}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {log.model}
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-right font-mono">
                      {log.latency_ms != null ? `${log.latency_ms.toLocaleString()} ms` : '--'}
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-right font-mono">
                      {log.tokens_used != null ? log.tokens_used.toLocaleString() : '--'}
                    </td>
                    <td className="px-5 py-3 text-gray-500 max-w-xs truncate">
                      {log.error_message || log.fallback_reason || '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
