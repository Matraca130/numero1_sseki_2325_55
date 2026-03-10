// ============================================================
// Axon — RagAnalyticsDashboard (v4.5, Fase E-3)
//
// Admin-only dashboard displaying RAG query metrics and
// embedding coverage for an institution.
//
// USAGE:
//   <RagAnalyticsDashboard institutionId={institutionId} />
//
// BACKEND ROUTES:
//   GET /ai/rag-analytics       — Query metrics (7-day default)
//   GET /ai/embedding-coverage  — Chunk coverage snapshot
//
// DEPENDENCIES:
//   - useRagAnalytics hook
//   - design-system tokens
//   - shadcn Card, Progress, Button
// ============================================================

import React, { useEffect } from 'react';
import {
  BarChart3,
  Search,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Database,
  RefreshCw,
  Activity,
  Zap,
  Timer,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { useRagAnalytics } from '@/app/hooks/useRagAnalytics';
import { components, headingStyle } from '@/app/design-system';
import { LoadingPage, ErrorState } from '@/app/components/shared/PageStates';

// ── Date range presets ─────────────────────────────

const DATE_PRESETS = [
  { label: 'Ultimos 7 dias', value: '7d' },
  { label: 'Ultimos 30 dias', value: '30d' },
  { label: 'Ultimos 90 dias', value: '90d' },
];

function getDateRange(preset: string): { from: string; to: string } {
  const to = new Date().toISOString();
  const from = new Date();
  const days = preset === '90d' ? 90 : preset === '30d' ? 30 : 7;
  from.setDate(from.getDate() - days);
  return { from: from.toISOString(), to };
}

// ── Component ───────────────────────────────────────────

interface RagAnalyticsDashboardProps {
  institutionId: string;
}

export function RagAnalyticsDashboard({ institutionId }: RagAnalyticsDashboardProps) {
  const {
    phase, analytics, coverage, error,
    feedbackRate, positiveRate, zeroResultRate,
    fetchAll, updateDateRange,
  } = useRagAnalytics(institutionId);

  const [preset, setPreset] = React.useState('7d');

  // ── Initial fetch ────────────────────────────────
  useEffect(() => {
    if (institutionId) {
      fetchAll(getDateRange(preset));
    }
  }, [institutionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePresetChange = (value: string) => {
    setPreset(value);
    updateDateRange(getDateRange(value));
  };

  // ── States ───────────────────────────────────────
  if (phase === 'loading') return <LoadingPage />;
  if (phase === 'error') {
    return <ErrorState message={error || 'Error al cargar analytics'} onRetry={() => fetchAll(getDateRange(preset))} />;
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* ── Header ────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl text-gray-900 tracking-tight"
            style={{ ...headingStyle, fontWeight: 700 }}
          >
            Analytics RAG
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Metricas de consultas y cobertura de embeddings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={preset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAll(getDateRange(preset))}
            className="gap-1.5"
          >
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {/* ── Query Metrics KPIs ──────────────────── */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<Search size={18} />}
            label="Total consultas"
            value={analytics.total_queries.toLocaleString()}
            colorClass="bg-teal-50 text-teal-600"
          />
          <MetricCard
            icon={<Timer size={18} />}
            label="Latencia promedio"
            value={analytics.avg_latency_ms != null ? `${Math.round(analytics.avg_latency_ms)}ms` : 'N/A'}
            colorClass="bg-blue-50 text-blue-600"
          />
          <MetricCard
            icon={<Activity size={18} />}
            label="Similitud promedio"
            value={analytics.avg_similarity != null ? `${(analytics.avg_similarity * 100).toFixed(1)}%` : 'N/A'}
            colorClass="bg-purple-50 text-purple-600"
          />
          <MetricCard
            icon={<AlertCircle size={18} />}
            label="Sin resultados"
            value={zeroResultRate != null ? `${zeroResultRate.toFixed(1)}%` : 'N/A'}
            colorClass="bg-amber-50 text-amber-600"
            subtitle={`${analytics.zero_result_queries} consultas`}
          />
        </div>
      )}

      {/* ── Feedback Section ────────────────────── */}
      {analytics && (
        <div className={`${components.card.base} ${components.card.paddingLg}`}>
          <h2
            className="text-sm text-gray-900 mb-4 uppercase tracking-wide"
            style={{ ...headingStyle, fontWeight: 600 }}
          >
            Feedback de usuarios
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Positive */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-50 text-green-600">
                <ThumbsUp size={20} />
              </div>
              <div>
                <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>
                  {analytics.positive_feedback}
                </p>
                <p className="text-xs text-gray-500">Positivos</p>
              </div>
            </div>

            {/* Negative */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
                <ThumbsDown size={20} />
              </div>
              <div>
                <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>
                  {analytics.negative_feedback}
                </p>
                <p className="text-xs text-gray-500">Negativos</p>
              </div>
            </div>

            {/* Satisfaction rate */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>
                  {positiveRate != null ? `${positiveRate.toFixed(0)}%` : 'N/A'}
                </p>
                <p className="text-xs text-gray-500">Tasa de satisfaccion</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Embedding Coverage ──────────────────── */}
      {coverage && (
        <div className={`${components.card.base} ${components.card.paddingLg}`}>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-sm text-gray-900 uppercase tracking-wide"
              style={{ ...headingStyle, fontWeight: 600 }}
            >
              Cobertura de Embeddings
            </h2>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Database size={14} />
              <span>{coverage.total_chunks.toLocaleString()} chunks totales</span>
            </div>
          </div>

          <div className="space-y-3">
            {/* Coverage bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {coverage.chunks_with_embedding.toLocaleString()} con embedding
                </span>
                <span
                  className="text-sm text-teal-600"
                  style={{ fontWeight: 600 }}
                >
                  {coverage.coverage_pct.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={coverage.coverage_pct}
                className="h-3"
              />
            </div>

            {/* Missing chunks */}
            {coverage.coverage_pct < 100 && (
              <p className="text-xs text-amber-600 flex items-center gap-1.5">
                <AlertCircle size={12} />
                {(coverage.total_chunks - coverage.chunks_with_embedding).toLocaleString()} chunks
                sin embedding — usa "Generar Embeddings" en Herramientas Admin para completar.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  colorClass,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  colorClass: string;
  subtitle?: string;
}) {
  return (
    <div className={components.kpiCard.base}>
      <div className="flex items-center gap-3">
        <div className={`${components.kpiCard.iconBg} ${colorClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg text-gray-900" style={{ fontWeight: 700 }}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
