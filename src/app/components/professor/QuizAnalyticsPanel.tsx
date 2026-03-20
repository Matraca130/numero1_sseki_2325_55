// ============================================================
// Axon — Professor: Quiz Analytics Panel (P4 Feature)
//
// Agent: ANALYST
// Shows per-quiz analytics: question difficulty distribution,
// type distribution, and question-level stats.
//
// Design: purple accent, recharts bar charts, collapsible.
//
// R15 refactor: data logic extracted to useQuizAnalytics hook.
// This component is now pure UI (~170 lines).
// ============================================================

import React from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';
import {
  BarChart3, X, Loader2, AlertTriangle,
  TrendingUp, Clock, Target, HelpCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { MODAL_OVERLAY, MODAL_CARD, MODAL_HEADER, BTN_CLOSE, BANNER_ERROR } from '@/app/services/quizDesignTokens';
import { ChartErrorBoundary } from '@/app/components/shared/ChartErrorBoundary';
import { useQuizAnalytics } from '@/app/components/professor/useQuizAnalytics';

// ── Props ────────────────────────────────────────────────

interface QuizAnalyticsPanelProps {
  quizId: string;
  quizTitle: string;
  summaryId: string;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────

export function QuizAnalyticsPanel({
  quizId, quizTitle, summaryId, onClose,
}: QuizAnalyticsPanelProps) {
  const { loading, error, diffData, typeData, questionStats, globalStats } = useQuizAnalytics(quizId, summaryId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`${MODAL_OVERLAY} p-4`}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className={`${MODAL_CARD} w-full max-w-[700px] max-h-[85vh] flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className={MODAL_HEADER}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center shadow-sm">
              <BarChart3 size={17} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm text-gray-900" style={{ fontWeight: 700 }}>
                Analytics del quiz
              </h3>
              <p className="text-[10px] text-gray-400 truncate max-w-[350px]">{quizTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className={BTN_CLOSE}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2">
              <Loader2 size={20} className="animate-spin text-purple-500" />
              <span className="text-[12px] text-zinc-400">Cargando analytics...</span>
            </div>
          ) : error ? (
            <div className={BANNER_ERROR}>
              <AlertTriangle size={14} />
              {error}
            </div>
          ) : (
            <>
              {/* Global stats cards */}
              <div className="grid grid-cols-4 gap-3">
                <StatCard icon={<HelpCircle size={14} />} label="Preguntas" value={String(globalStats.totalQuestions)} color="text-purple-600 bg-purple-50" />
                <StatCard icon={<Target size={14} />} label="Intentos" value={String(globalStats.totalAttempts)} color="text-blue-600 bg-blue-50" />
                <StatCard icon={<TrendingUp size={14} />} label="Acierto" value={`${globalStats.globalSuccessRate}%`} color={globalStats.globalSuccessRate >= 70 ? 'text-emerald-600 bg-emerald-50' : globalStats.globalSuccessRate >= 40 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50'} />
                <StatCard icon={<Clock size={14} />} label="Tiempo prom." value={`${globalStats.avgTimeSec}s`} color="text-zinc-600 bg-zinc-100" />
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Difficulty chart */}
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3" style={{ fontWeight: 700 }}>
                    Por dificultad
                  </p>
                  <ChartErrorBoundary height={120}>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={diffData}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis hide allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                          {diffData.map((d, i) => (
                            <Cell key={i} fill={d.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartErrorBoundary>
                </div>

                {/* Type chart */}
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3" style={{ fontWeight: 700 }}>
                    Por tipo
                  </p>
                  <ChartErrorBoundary height={120}>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={typeData}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis hide allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                          {typeData.map((d, i) => (
                            <Cell key={i} fill={d.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartErrorBoundary>
                </div>
              </div>

              {/* Per-question stats (hardest first) */}
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2" style={{ fontWeight: 700 }}>
                  Preguntas mas dificiles
                </p>
                {questionStats.length === 0 ? (
                  <p className="text-[12px] text-zinc-400 text-center py-4">No hay datos de intentos</p>
                ) : (
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar-light">
                    {questionStats.map(qs => (
                      <div key={qs.question.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-zinc-200 text-[11px]">
                        <span className="text-zinc-400 shrink-0" style={{ fontWeight: 600 }}>#{qs.index}</span>
                        <span className="text-zinc-600 truncate flex-1">{qs.question.question}</span>
                        {qs.totalAttempts > 0 ? (
                          <>
                            <span className={clsx(
                              'shrink-0 px-1.5 py-0.5 rounded text-[9px]',
                              qs.successRate >= 70 ? 'text-emerald-600 bg-emerald-50' :
                              qs.successRate >= 40 ? 'text-amber-600 bg-amber-50' :
                              'text-rose-600 bg-rose-50',
                            )} style={{ fontWeight: 700 }}>
                              {Math.round(qs.successRate)}%
                            </span>
                            <span className="text-zinc-400 shrink-0 flex items-center gap-0.5">
                              <Clock size={9} />
                              {qs.avgTimeSec.toFixed(1)}s
                            </span>
                            <span className="text-zinc-400 shrink-0">
                              {qs.correctAttempts}/{qs.totalAttempts}
                            </span>
                          </>
                        ) : (
                          <span className="text-zinc-300 text-[9px] italic">Sin intentos</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Stat Card ────────────────────────────────────────────

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div className={clsx('rounded-xl px-3 py-3 flex flex-col items-center gap-1', color)}>
      {icon}
      <span className="text-lg" style={{ fontWeight: 700 }}>{value}</span>
      <span className="text-[9px] uppercase tracking-wider opacity-70" style={{ fontWeight: 600 }}>{label}</span>
    </div>
  );
}
