// ============================================================
// Axon — WeeklyReportViewer v2
//
// AI-generated weekly study report with rich analytics:
// stats grid, summary, mastery trend, weak/strong topics,
// lapsing flashcards, AI-recommended focus, and legacy
// strengths/weaknesses chips as fallback.
//
// Design: Axon DS (teal primary, Georgia headings, Inter body)
// A11y:   WCAG 2.1 AA — focus rings, aria attrs, contrast OK
// ============================================================

import React, { useState, useId } from 'react';
import {
  Brain, Sparkles, TrendingUp, AlertTriangle, Lightbulb,
  Loader2, BarChart3, Calendar, Target, Zap, Clock,
  GraduationCap, ShieldAlert, BookOpen, FlaskConical, Repeat,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { headingStyle, components } from '@/app/design-system';
import {
  useWeeklyReport,
  type MasteryTrend,
  type WeakTopic,
  type StrongTopic,
  type LapsingCard,
  type RecommendedFocus,
} from '@/app/hooks/queries/useWeeklyReport';

// ── Helpers ──────────────────────────────────────────────────

function formatStudyTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function masteryColor(level: number) {
  if (level >= 75) return { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' };
  if (level >= 50) return { bg: 'bg-teal-50', text: 'text-teal-700', bar: 'bg-teal-500' };
  if (level >= 30) return { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' };
  return { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' };
}

/** Method badge color — teal/emerald/amber only (no violet/sky per DS rules) */
function methodColor(method: string): string {
  switch (method.toLowerCase()) {
    case 'flashcards': return 'bg-teal-50 text-teal-700';
    case 'lectura activa':
    case 'lectura': return 'bg-emerald-50 text-emerald-700';
    case 'quiz': return 'bg-amber-50 text-amber-700';
    default: return 'bg-teal-50 text-teal-700';
  }
}

function methodIcon(method: string): React.ElementType {
  switch (method.toLowerCase()) {
    case 'flashcards': return Repeat;
    case 'lectura activa':
    case 'lectura': return BookOpen;
    case 'quiz': return FlaskConical;
    default: return Lightbulb;
  }
}

// ── Focus ring utility ───────────────────────────────────────
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1';

// ── Sub-components ───────────────────────────────────────────

function StatBox({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2.5 bg-[#f8f9fb] rounded-xl px-3 py-2.5">
      <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
        <Icon size={15} className="text-teal-500" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-[#7a8290] font-medium truncate">{label}</div>
        <div className="text-[15px] font-bold text-[#1a2332] tabular-nums">{value}</div>
      </div>
    </div>
  );
}

/** Mastery trend badge — sits beside the header title */
function TrendBadge({ trend }: { trend: MasteryTrend }) {
  const config = {
    improving: {
      icon: ArrowUpRight, label: 'Mejorando',
      bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',
    },
    stable: {
      icon: ArrowRight, label: 'Estable',
      bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200',
    },
    declining: {
      icon: ArrowDownRight, label: 'Declinando',
      bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200',
    },
  };
  const c = config[trend] ?? config.stable;
  const TrendIcon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${c.bg} ${c.text} ${c.border}`}
      role="status"
      aria-label={`Tendencia de dominio: ${c.label}`}
    >
      <TrendIcon size={12} aria-hidden="true" />
      {c.label}
    </span>
  );
}

/** Tiny horizontal mastery progress bar */
function MasteryBar({ level, size = 'md' }: { level: number; size?: 'sm' | 'md' }) {
  const colors = masteryColor(level);
  const h = size === 'sm' ? 'h-1' : 'h-1.5';
  return (
    <div className="flex items-center gap-2 w-full">
      <div
        className={`flex-1 ${h} bg-gray-100 rounded-full overflow-hidden`}
        role="progressbar"
        aria-valuenow={level}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Dominio: ${level}%`}
      >
        <div
          className={`${h} rounded-full transition-all duration-500 ${colors.bar}`}
          style={{ width: `${level}%` }}
        />
      </div>
      <span className={`text-[11px] font-bold tabular-nums ${colors.text}`}>{level}%</span>
    </div>
  );
}

/** Collapsible section with a11y attrs */
function Section({
  icon: Icon,
  iconColor,
  label,
  children,
  defaultOpen = true,
  count,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 mb-2 w-full text-left group min-h-[44px] rounded-lg px-1 -mx-1 ${focusRing}`}
        aria-expanded={open}
        aria-controls={contentId}
      >
        <Icon size={13} className={iconColor} aria-hidden="true" />
        <span className="text-[11px] font-semibold text-[#4a5565] uppercase tracking-wider">
          {label}
        </span>
        {count != null && (
          <span className="text-[10px] font-bold text-[#7a8290] bg-gray-100 rounded-full px-1.5 py-0.5 ml-0.5">
            {count}
          </span>
        )}
        <span className="ml-auto text-[#9ba3b2] group-hover:text-[#4a5565] transition-colors" aria-hidden="true">
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={contentId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

export function WeeklyReportViewer() {
  const { report, isLoading, generate, isGenerating } = useWeeklyReport();

  if (isLoading) {
    return (
      <div className={`${components.card.base} ${components.card.padding} animate-pulse`} aria-busy="true">
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
        lang="es"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
            <Brain size={16} className="text-teal-500" aria-hidden="true" />
          </div>
          <h3 className="text-[15px] font-semibold text-[#1a2332]" style={headingStyle}>
            Reporte Semanal
          </h3>
        </div>
        <p className="text-[13px] text-[#7a8290] mb-4">
          Genera un análisis de tu progreso de estudio de esta semana con inteligencia artificial.
        </p>
        <button
          onClick={() => generate()}
          disabled={isGenerating}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1B3B36] text-white text-[12px] font-semibold hover:bg-[#244e47] transition-colors disabled:opacity-50 ${focusRing}`}
        >
          {isGenerating ? (
            <><Loader2 size={14} className="animate-spin" aria-hidden="true" />Generando...</>
          ) : (
            <><Sparkles size={14} aria-hidden="true" />Generar reporte</>
          )}
        </button>
      </motion.div>
    );
  }

  // Use backend accuracy if available, otherwise compute inline
  const accuracy = report.accuracyPercent
    ?? (report.totalReviews > 0 ? Math.round((report.correctReviews / report.totalReviews) * 100) : 0);

  const hasWeakTopics = (report.weakTopics?.length ?? 0) > 0;
  const hasStrongTopics = (report.strongTopics?.length ?? 0) > 0;
  const hasLapsingCards = (report.lapsingCards?.length ?? 0) > 0;
  const hasAiFocus = (report.aiRecommendedFocus?.length ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={`${components.card.base} ${components.card.padding}`}
      lang="es"
    >
      {/* ── Header + Trend Badge ─────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center" aria-hidden="true">
            <Brain size={16} className="text-teal-500" />
          </div>
          <h3 className="text-[15px] font-semibold text-[#1a2332]" style={headingStyle}>
            Reporte Semanal
          </h3>
          {report.aiMasteryTrend && <TrendBadge trend={report.aiMasteryTrend} />}
        </div>
        <button
          onClick={() => generate()}
          disabled={isGenerating}
          className={`text-[11px] font-semibold text-[#2a8c7a] hover:text-[#1B3B36] px-2 py-1 rounded-md hover:bg-[#e6f5f1] transition-colors disabled:opacity-50 ${focusRing}`}
          aria-label="Actualizar reporte semanal"
        >
          {isGenerating ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : 'Actualizar'}
        </button>
      </div>

      {/* ── Stats Grid (2col mobile → 3col tablet+) ──────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4" role="group" aria-label="Estadísticas semanales">
        <StatBox icon={BarChart3} label="Sesiones" value={report.totalSessions} />
        <StatBox icon={Target} label="Precisión" value={`${accuracy}%`} />
        <StatBox icon={Calendar} label="Días activos" value={`${report.daysActive}/7`} />
        <StatBox icon={Zap} label="XP ganados" value={report.xpEarned} />
        {report.totalTimeSeconds != null && (
          <StatBox icon={Clock} label="Tiempo estudio" value={formatStudyTime(report.totalTimeSeconds)} />
        )}
        <StatBox icon={Sparkles} label="Racha" value={`${report.streakAtReport} días`} />
      </div>

      {/* ── AI Summary ───────────────────────────────────────── */}
      {report.summary && (
        <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 mb-4">
          <p className="text-[13px] text-[#374151] leading-relaxed">{report.summary}</p>
        </div>
      )}

      {/* ── Weak Topics (high priority — shown first) ────────── */}
      {hasWeakTopics && (
        <Section
          icon={AlertTriangle}
          iconColor="text-amber-500"
          label="Temas débiles"
          count={report.weakTopics!.length}
          defaultOpen={true}
        >
          <div className="space-y-2">
            {report.weakTopics!.map((t: WeakTopic, i: number) => {
              const colors = masteryColor(t.masteryLevel);
              return (
                <div key={i} className="bg-[#f8f9fb] rounded-xl px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="text-[12px] font-semibold text-[#1a2332]">{t.topicName}</div>
                    <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                      {t.masteryLevel}%
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7a8290] leading-snug mb-1.5">{t.reason}</p>
                  <MasteryBar level={t.masteryLevel} size="sm" />
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Lapsing Cards ────────────────────────────────────── */}
      {hasLapsingCards && (
        <Section
          icon={ShieldAlert}
          iconColor="text-rose-500"
          label="Flashcards en riesgo"
          count={report.lapsingCards!.length}
          defaultOpen={true}
        >
          <div className="space-y-2">
            {report.lapsingCards!.map((card: LapsingCard, i: number) => (
              <div key={i} className="bg-[#f8f9fb] rounded-xl px-3 py-2.5 flex items-start gap-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[#1a2332] font-medium leading-snug line-clamp-2">
                    {card.cardFront}
                  </p>
                  <span className="inline-flex mt-1.5 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-semibold">
                    {card.keyword}
                  </span>
                </div>
                <div className="shrink-0 flex flex-col items-center">
                  <span className="text-[10px] text-[#7a8290] font-medium">Lapsos</span>
                  <span
                    className="text-[15px] font-bold text-rose-600 tabular-nums"
                    aria-label={`${card.lapses} lapsos`}
                  >
                    {card.lapses}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── AI Recommended Focus ─────────────────────────────── */}
      {hasAiFocus && (
        <Section
          icon={Lightbulb}
          iconColor="text-teal-500"
          label="Enfoque recomendado"
          count={report.aiRecommendedFocus!.length}
          defaultOpen={true}
        >
          <ul className="space-y-2.5">
            {report.aiRecommendedFocus!.map((rec: RecommendedFocus, i: number) => {
              const MethodIcon = methodIcon(rec.suggestedMethod);
              const mColor = methodColor(rec.suggestedMethod);
              return (
                <li key={i} className="bg-[#f8f9fb] rounded-xl px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[12px] font-semibold text-[#1a2332]">{rec.topicName}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${mColor}`}>
                      <MethodIcon size={10} aria-hidden="true" />
                      {rec.suggestedMethod}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7a8290] leading-snug">{rec.reason}</p>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* ── Strong Topics (lower priority, collapsed) ────────── */}
      {hasStrongTopics && (
        <Section
          icon={GraduationCap}
          iconColor="text-emerald-500"
          label="Temas fuertes"
          count={report.strongTopics!.length}
          defaultOpen={false}
        >
          <div className="space-y-2">
            {report.strongTopics!.map((t: StrongTopic, i: number) => (
              <div key={i} className="bg-[#f8f9fb] rounded-xl px-3 py-2.5">
                <div className="text-[12px] font-semibold text-[#1a2332] mb-1.5">{t.topicName}</div>
                <MasteryBar level={t.masteryLevel} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Legacy Strengths (fallback when no rich topics) ──── */}
      {!hasStrongTopics && report.strengths.length > 0 && (
        <Section icon={TrendingUp} iconColor="text-emerald-500" label="Fortalezas" defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5" role="list" aria-label="Lista de fortalezas">
            {report.strengths.map((s, i) => (
              <span key={i} role="listitem"
                className="inline-flex px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* ── Legacy Weaknesses (fallback when no rich topics) ─── */}
      {!hasWeakTopics && report.weaknesses.length > 0 && (
        <Section icon={AlertTriangle} iconColor="text-amber-500" label="A mejorar" defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5" role="list" aria-label="Áreas a mejorar">
            {report.weaknesses.map((w, i) => (
              <span key={i} role="listitem"
                className="inline-flex px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium">
                {w}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* ── Legacy Recommendations (fallback) ─────────────────── */}
      {!hasAiFocus && report.recommendations.length > 0 && (
        <Section icon={Lightbulb} iconColor="text-teal-500" label="Recomendaciones" defaultOpen={true}>
          <ul className="space-y-1.5">
            {report.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-[#4a5565]">
                <span className="shrink-0 w-4 h-4 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-[10px] font-bold mt-0.5">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </motion.div>
  );
}

export default WeeklyReportViewer;
