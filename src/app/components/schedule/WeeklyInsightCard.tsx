// ============================================================
// Axon — Weekly AI Insight Card
//
// Shows Claude's weekly progress analysis: summary, strengths,
// weaknesses, and recommendations. On-demand fetch (not auto).
// ============================================================
import React, { useState, useCallback } from 'react';
import { Brain, Sparkles, TrendingUp, AlertTriangle, Lightbulb, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { headingStyle } from '@/app/design-system';
import {
  aiWeeklyInsight,
  type StudentProfilePayload,
  type AiInsight,
} from '@/app/services/aiService';

interface Props {
  studentProfile: StudentProfilePayload | null;
}

export function WeeklyInsightCard({ studentProfile }: Props) {
  const [insight, setInsight] = useState<AiInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiPowered, setAiPowered] = useState(false);
  const [error, setError] = useState(false);

  const fetchInsight = useCallback(async () => {
    if (!studentProfile) return;
    setLoading(true);
    setError(false);
    try {
      const result = await aiWeeklyInsight(studentProfile);
      if (result?.insight) {
        setInsight(result.insight);
        setAiPowered(result._meta?.aiPowered ?? false);
      } else {
        setInsight(null);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [studentProfile]);

  // ── No profile ──
  if (!studentProfile) {
    return (
      <div className="bg-white rounded-2xl border border-[#ebedf0] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
            <Brain size={14} className="text-teal-500" />
          </div>
          <h3 className="text-[14px] font-semibold text-[#4a5565]" style={headingStyle}>
            Analisis Semanal
          </h3>
        </div>
        <p className="text-[12px] text-[#9ba3b2]">
          El analisis semanal estara disponible cuando haya suficiente historial de estudio.
        </p>
      </div>
    );
  }

  // ── Not yet fetched: show generate button ──
  if (!insight && !loading && !error) {
    return (
      <div className="bg-white rounded-2xl border border-[#ebedf0] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
            <Brain size={14} className="text-teal-500" />
          </div>
          <h3 className="text-[14px] font-semibold text-[#4a5565]" style={headingStyle}>
            Analisis Semanal
          </h3>
        </div>
        <p className="text-[12px] text-[#9ba3b2] mb-4">
          Genera un analisis detallado de tu progreso semanal con recomendaciones personalizadas.
        </p>
        <button
          onClick={fetchInsight}
          className="w-full flex items-center justify-center gap-2 py-3 min-h-[44px] rounded-xl bg-[#1B3B36] hover:bg-[#244e47] text-white text-[13px] font-semibold transition-colors"
        >
          <Sparkles size={14} />
          Generar analisis
        </button>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#ebedf0] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
            <Brain size={14} className="text-teal-500" />
          </div>
          <h3 className="text-[14px] font-semibold text-[#4a5565]" style={headingStyle}>
            Analisis Semanal
          </h3>
        </div>
        <div className="flex flex-col items-center py-6">
          <Loader2 size={24} className="text-teal-500 animate-spin mb-3" />
          <p className="text-[12px] text-[#9ba3b2]">Analizando tu progreso semanal...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-[#ebedf0] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
            <Brain size={14} className="text-teal-500" />
          </div>
          <h3 className="text-[14px] font-semibold text-[#4a5565]" style={headingStyle}>
            Analisis Semanal
          </h3>
        </div>
        <div className="flex flex-col items-center py-4 text-center">
          <p className="text-[12px] text-[#9ba3b2] mb-3">No se pudo generar el analisis</p>
          <button
            onClick={fetchInsight}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2a8c7a] bg-[#e6f5f1] px-3 py-2 rounded-lg hover:bg-[#ccebe3] transition-colors min-h-[36px]"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-[#ebedf0] shadow-sm p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
            <Brain size={14} className="text-teal-500" />
          </div>
          <h3 className="text-[14px] font-semibold text-[#4a5565]" style={headingStyle}>
            Analisis Semanal
          </h3>
          {aiPowered && (
            <span className="text-[9px] font-semibold text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
              IA
            </span>
          )}
        </div>
        <button
          onClick={fetchInsight}
          disabled={loading}
          className="text-[11px] font-semibold text-[#2a8c7a] bg-[#e6f5f1] px-3 py-1.5 rounded-lg hover:bg-[#ccebe3] transition-colors min-h-[36px]"
        >
          Regenerar
        </button>
      </div>

      {/* Summary */}
      {insight?.summary && (
        <p className="text-[13px] text-[#4a5565] leading-[1.6] mb-4">
          {insight.summary}
        </p>
      )}

      {/* Strengths */}
      {insight?.strengths && insight.strengths.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={12} className="text-emerald-500" />
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
              Fortalezas
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {insight.strengths.map((s, i) => (
              <span
                key={i}
                className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Weaknesses */}
      {insight?.weaknesses && insight.weaknesses.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={12} className="text-amber-500" />
            <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
              Areas de mejora
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {insight.weaknesses.map((w, i) => (
              <span
                key={i}
                className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full"
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {insight?.recommendations && insight.recommendations.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb size={12} className="text-teal-500" />
            <span className="text-[11px] font-semibold text-teal-600 uppercase tracking-wider">
              Recomendaciones
            </span>
          </div>
          <ol className="space-y-1.5">
            {insight.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-teal-500 bg-teal-50 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-[12px] text-[#4a5565] leading-[1.5]">{r}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </motion.div>
  );
}
