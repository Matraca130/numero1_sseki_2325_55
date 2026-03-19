// ============================================================
// Axon — Daily AI Recommendation Card
//
// Shows Claude's personalized study recommendations for today.
// Accepts a StudentProfilePayload; if null, shows empty state.
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, BookOpen, Zap, GraduationCap, FileText, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { headingStyle } from '@/app/design-system';
import {
  aiRecommendToday,
  type StudentProfilePayload,
  type AiRecommendation,
} from '@/app/services/aiService';

// ── Method icon mapping ──
const METHOD_ICON_MAP: Record<string, React.ReactNode> = {
  flashcard: <Zap size={14} className="text-emerald-500" />,
  quiz: <GraduationCap size={14} className="text-amber-600" />,
  video: <BookOpen size={14} className="text-blue-500" />,
  resumo: <FileText size={14} className="text-violet-500" />,
  lectura: <BookOpen size={14} className="text-teal-500" />,
};

const PRIORITY_BADGE: Record<number, { label: string; classes: string }> = {
  1: { label: 'Alta', classes: 'bg-red-50 text-red-600 border-red-200' },
  2: { label: 'Media', classes: 'bg-amber-50 text-amber-600 border-amber-200' },
  3: { label: 'Normal', classes: 'bg-[#F0F2F5] text-gray-500 border-gray-200' },
};

interface Props {
  studentProfile: StudentProfilePayload | null;
}

export function DailyRecommendationCard({ studentProfile }: Props) {
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiPowered, setAiPowered] = useState(false);
  const [error, setError] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    if (!studentProfile) return;
    setLoading(true);
    setError(false);
    try {
      const result = await aiRecommendToday(studentProfile);
      if (result?.todayRecommendations?.length) {
        setRecommendations(result.todayRecommendations);
        setAiPowered(result._meta?.aiPowered ?? false);
      } else {
        setRecommendations([]);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  }, [studentProfile]);

  useEffect(() => {
    if (studentProfile) {
      fetchRecommendations();
    }
  }, [studentProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Empty state (no profile) ──
  if (!studentProfile) {
    return (
      <div className="bg-white rounded-2xl border border-[#ebedf0] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
            <Sparkles size={14} className="text-teal-500" />
          </div>
          <h3 className="text-[14px] font-semibold text-[#4a5565]" style={headingStyle}>
            Recomendaciones para hoy
          </h3>
        </div>
        <p className="text-[12px] text-[#9ba3b2]">
          Las recomendaciones se activaran cuando haya suficiente historial de estudio.
        </p>
      </div>
    );
  }

  // ── Skeleton loading ──
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#ebedf0] shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
              <Sparkles size={14} className="text-teal-500" />
            </div>
            <h3 className="text-[14px] font-semibold text-[#4a5565]" style={headingStyle}>
              Recomendaciones para hoy
            </h3>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-gray-100" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-2.5 bg-[#F0F2F5] rounded w-1/2" />
              </div>
              <div className="h-5 w-12 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-[#ebedf0] shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
              <Sparkles size={14} className="text-teal-500" />
            </div>
            <h3 className="text-[14px] font-semibold text-[#4a5565]" style={headingStyle}>
              Recomendaciones para hoy
            </h3>
          </div>
        </div>
        <div className="flex flex-col items-center py-4 text-center">
          <AlertCircle size={24} className="text-[#dfe2e8] mb-2" />
          <p className="text-[12px] text-[#9ba3b2] mb-3">No hay recomendaciones disponibles</p>
          <button
            onClick={fetchRecommendations}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2a8c7a] bg-[#e6f5f1] px-3 py-2 rounded-lg hover:bg-[#ccebe3] transition-colors min-h-[36px]"
          >
            <RefreshCw size={12} />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ── Empty result (fetched but no recs) ──
  if (hasFetched && recommendations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#ebedf0] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
            <Sparkles size={14} className="text-teal-500" />
          </div>
          <h3 className="text-[14px] font-semibold text-[#4a5565]" style={headingStyle}>
            Recomendaciones para hoy
          </h3>
        </div>
        <p className="text-[12px] text-[#9ba3b2]">
          Sin recomendaciones por ahora. Sigue estudiando y pronto habra sugerencias personalizadas.
        </p>
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
            <Sparkles size={14} className="text-teal-500" />
          </div>
          <h3 className="text-[14px] font-semibold text-[#4a5565]" style={headingStyle}>
            Recomendaciones para hoy
          </h3>
          {aiPowered && (
            <span className="text-[9px] font-semibold text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
              IA
            </span>
          )}
        </div>
        <button
          onClick={fetchRecommendations}
          disabled={loading}
          className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-[#9ba3b2] hover:text-[#4a5565] hover:bg-gray-50 rounded-lg transition-colors"
          aria-label="Actualizar recomendaciones"
        >
          <RefreshCw size={14} className={clsx(loading && 'animate-spin')} />
        </button>
      </div>

      {/* Recommendations list */}
      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout">
          {recommendations.map((rec, idx) => {
            const methodKey = rec.method?.toLowerCase?.() ?? '';
            const icon = METHOD_ICON_MAP[methodKey] || <BookOpen size={14} className="text-teal-500" />;
            const priorityBadge = PRIORITY_BADGE[rec.priority] || PRIORITY_BADGE[3];

            return (
              <motion.div
                key={`${rec.topicId}-${idx}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ delay: idx * 0.06, duration: 0.2 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-[#f8f9fb] border border-[#eef0f3] hover:border-[#dfe2e8] transition-colors"
              >
                {/* Method icon */}
                <div className="w-8 h-8 rounded-lg bg-white border border-[#eef0f3] flex items-center justify-center shrink-0 mt-0.5">
                  {icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#1a2332] leading-[1.4] truncate">
                    {rec.topicTitle}
                  </p>
                  <p className="text-[11px] text-[#9ba3b2] leading-[1.5] mt-0.5 line-clamp-2">
                    {rec.reason}
                  </p>
                </div>

                {/* Priority badge */}
                <span className={clsx(
                  'text-[9px] font-semibold px-2 py-0.5 rounded-full border shrink-0 uppercase tracking-wider',
                  priorityBadge.classes,
                )}>
                  {priorityBadge.label}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
