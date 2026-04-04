// ============================================================
// Axon — WeeklyReportViewer
//
// AI-generated weekly study report: stats grid, summary text,
// strengths/weaknesses chips, recommendations list.
// On-demand generation via POST /ai/weekly-report.
// ============================================================

import React from 'react';
import {
  Brain, Sparkles, TrendingUp, AlertTriangle, Lightbulb,
  Loader2, BarChart3, Calendar, Target, Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { headingStyle, components } from '@/app/design-system';
import { useWeeklyReport } from '@/app/hooks/queries/useWeeklyReport';

function StatBox({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2.5 bg-[#f8f9fb] rounded-xl px-3 py-2.5">
      <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
        <Icon size={15} className="text-teal-500" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-[#9ba3b2] font-medium truncate">{label}</div>
        <div className="text-[15px] font-bold text-[#1a2332] tabular-nums">{value}</div>
      </div>
    </div>
  );
}

export function WeeklyReportViewer() {
  const { report, isLoading, generate, isGenerating } = useWeeklyReport();

  if (isLoading) {
    return (
      <div className={`${components.card.base} ${components.card.padding} animate-pulse`}>
        <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  // Empty state — no report yet
  if (!report) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className={`${components.card.base} ${components.card.padding}`}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
            <Brain size={16} className="text-teal-500" />
          </div>
          <h3 className="text-[15px] font-semibold text-[#1a2332]" style={headingStyle}>
            Reporte Semanal
          </h3>
        </div>
        <p className="text-[13px] text-[#9ba3b2] mb-4">
          Genera un analisis de tu progreso de estudio de esta semana con inteligencia artificial.
        </p>
        <button
          onClick={() => generate()}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1B3B36] text-white text-[12px] font-semibold hover:bg-[#244e47] transition-colors disabled:opacity-50"
        >
          {isGenerating ? (
            <><Loader2 size={14} className="animate-spin" />Generando...</>
          ) : (
            <><Sparkles size={14} />Generar reporte</>
          )}
        </button>
      </motion.div>
    );
  }

  const accuracy = report.totalReviews > 0
    ? Math.round((report.correctReviews / report.totalReviews) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={`${components.card.base} ${components.card.padding}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
            <Brain size={16} className="text-teal-500" />
          </div>
          <h3 className="text-[15px] font-semibold text-[#1a2332]" style={headingStyle}>
            Reporte Semanal
          </h3>
        </div>
        <button
          onClick={() => generate()}
          disabled={isGenerating}
          className="text-[11px] font-semibold text-[#2a8c7a] hover:text-[#1B3B36] px-2 py-1 rounded-md hover:bg-[#e6f5f1] transition-colors disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={12} className="animate-spin" /> : 'Actualizar'}
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatBox icon={BarChart3} label="Sesiones" value={report.totalSessions} />
        <StatBox icon={Target} label="Precision" value={`${accuracy}%`} />
        <StatBox icon={Calendar} label="Dias activos" value={`${report.daysActive}/7`} />
        <StatBox icon={Zap} label="XP ganados" value={report.xpEarned} />
      </div>

      {/* AI summary */}
      {report.summary && (
        <div className="bg-[#f8f9fb] rounded-xl p-3 mb-4">
          <p className="text-[13px] text-[#4a5565] leading-relaxed">{report.summary}</p>
        </div>
      )}

      {/* Strengths */}
      {report.strengths.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={13} className="text-emerald-500" />
            <span className="text-[11px] font-semibold text-[#4a5565] uppercase tracking-wider">Fortalezas</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {report.strengths.map((s, i) => (
              <span key={i} className="inline-flex px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Weaknesses */}
      {report.weaknesses.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={13} className="text-amber-500" />
            <span className="text-[11px] font-semibold text-[#4a5565] uppercase tracking-wider">A mejorar</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {report.weaknesses.map((w, i) => (
              <span key={i} className="inline-flex px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium">
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb size={13} className="text-blue-500" />
            <span className="text-[11px] font-semibold text-[#4a5565] uppercase tracking-wider">Recomendaciones</span>
          </div>
          <ul className="space-y-1.5">
            {report.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-[#4a5565]">
                <span className="shrink-0 w-4 h-4 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold mt-0.5">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

export default WeeklyReportViewer;
