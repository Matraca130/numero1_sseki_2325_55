// ============================================================
// Axon — StudyHubHero (extracted from StudyHubView.tsx)
// Hero section: "Retoma donde dejaste" + CTA card + page spine
// Zero functional changes — pure extraction.
// ============================================================
import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  BookOpen, Clock, Sparkles, Play, ArrowRight,
} from 'lucide-react';
import {
  HeroSection,
  ProgressBar,
  Breadcrumb,
  focusRing,
} from '@/app/components/design-kit';
import { useMotionPresets } from '@/app/components/shared/FadeIn';

// ── Types ────────────────────────────────────────────────────

export interface TodayStats {
  minutes: number;
  summaries: number;
  flashcards: number;
  videos: number;
}

export interface StudyHubHeroProps {
  // Greeting
  greeting: string;
  userName: string;

  // Topic
  effectiveTopic: { id: string; title: string } | null;
  isAutoSelected: boolean;
  heroReadingSessions: number;
  heroProgressPct: number;
  heroProgress: number; // 0-1
  heroLastActivity: string | undefined;
  estimatedRemaining: number | null;
  streakDays: number;

  // Breadcrumb
  courseName: string;
  sectionName: string;

  // Today stats (for the 4-card row)
  todayStats: TodayStats;
  studyMinutesToday: number;
  totalCardsReviewed: number;
  dailyGoalMinutes: number;

  // Callbacks
  onContinue: () => void;
}

// ── Component ────────────────────────────────────────────────

export function StudyHubHero({
  greeting,
  userName,
  effectiveTopic,
  isAutoSelected,
  heroReadingSessions,
  heroProgressPct,
  heroProgress,
  heroLastActivity,
  estimatedRemaining,
  streakDays,
  courseName,
  sectionName,
  todayStats,
  studyMinutesToday,
  totalCardsReviewed,
  dailyGoalMinutes,
  onContinue,
}: StudyHubHeroProps) {
  const { fadeUp } = useMotionPresets();
  const shouldReduce = useReducedMotion();

  return (
    <HeroSection>
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-14">
        {/* Greeting */}
        <motion.p {...fadeUp(0)} className="text-sm text-zinc-300 mb-1.5">
          👋 {greeting}{userName ? `, ${userName}` : ''}
        </motion.p>

        {/* Title + subtitle */}
        <motion.div {...fadeUp(0.1)}>
          <h1 className="text-2xl sm:text-3xl text-white tracking-tight mb-2" style={{ fontWeight: 800 }}>
            {heroReadingSessions > 0 ? 'Retoma donde dejaste' : 'Empezar a estudiar'}
          </h1>
          <p className="text-sm text-zinc-300 max-w-lg">
            {streakDays > 0 ? (
              <>Llevas <span className="text-amber-400" style={{ fontWeight: 700 }}>{streakDays} dias seguidos</span> estudiando. </>
            ) : null}
            {effectiveTopic ? (
              estimatedRemaining != null ? (
                <>Te faltan <span className="text-amber-400" style={{ fontWeight: 600 }}>~{estimatedRemaining} min</span> para terminar el resumen actual.</>
              ) : heroProgressPct > 0 ? (
                <>Llevas un <span className="text-amber-400" style={{ fontWeight: 600 }}>{heroProgressPct}%</span> de avance en este tema.</>
              ) : (
                <>Te sugerimos un tema para empezar.</>
              )
            ) : (
              <>Explora las secciones y elige un tema.</>
            )}
          </p>
        </motion.div>

        {/* Study card — ALWAYS visible: shows continue or suggestion */}
        {effectiveTopic ? (
          <motion.button
            onClick={onContinue}
            className={`w-full text-left mt-8 bg-white/[0.07] backdrop-blur-md border border-amber-400/15 rounded-2xl p-6 hover:bg-white/[0.12] hover:border-amber-400/30 transition-all group cursor-pointer relative overflow-hidden ${focusRing}`}
            {...fadeUp(0.4)}
            whileHover={shouldReduce ? undefined : { y: -3 }}
          >
            {/* Page spine — absolute positioned left edge */}
            <div className="absolute left-2.5 top-5 bottom-5 flex flex-col items-center gap-1.5">
              {Array.from({ length: 5 }, (_, i) => {
                // Derive spine from real progress: how many of 5 segments are "read"
                const filledSegments = Math.max(0, Math.min(5, Math.round(heroProgress * 5)));
                const isRead = i < filledSegments;
                const isCurrent = i === filledSegments - 1 && filledSegments > 0 && filledSegments < 5;
                return (
                  <motion.div
                    key={i}
                    className={`w-1.5 flex-1 rounded-full ${
                      isRead ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]' : 'bg-white/10'
                    }`}
                    initial={shouldReduce ? false : { scaleY: 0 }}
                    animate={{
                      scaleY: 1,
                      opacity: isCurrent && !shouldReduce ? [0.6, 1, 0.6] : 1,
                    }}
                    transition={{
                      scaleY: { delay: 0.5 + i * 0.08, duration: 0.3 },
                      opacity: isCurrent ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : undefined,
                    }}
                    style={{ originY: 0 }}
                  />
                );
              })}
            </div>

            <div className="flex items-start gap-6 pl-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border ${
                    heroReadingSessions > 0
                      ? 'text-amber-200 bg-amber-500/15 border-amber-500/20'
                      : 'text-teal-200 bg-teal-500/15 border-teal-500/20'
                  }`} style={{ fontWeight: 600 }}>
                    {heroReadingSessions > 0 ? 'Continuar leyendo' : 'Sugerencia de estudio'}
                  </span>
                  {heroLastActivity && (
                    <span className="text-xs text-zinc-400 ml-auto">{heroLastActivity}</span>
                  )}
                </div>

                <h3 className="text-lg text-white tracking-tight mb-1.5" style={{ fontWeight: 700 }}>
                  {effectiveTopic.title || 'Continuar estudiando'}
                </h3>

                <Breadcrumb
                  items={[courseName, sectionName, effectiveTopic.title || ''].filter(Boolean)}
                  className="mb-5 text-zinc-400"
                  dark
                />

                <div className="flex items-center gap-5">
                  <div className="flex-1 max-w-xs">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-zinc-300" style={{ fontWeight: 500 }}>
                        {heroReadingSessions > 0
                          ? `${heroReadingSessions} sesion${heroReadingSessions !== 1 ? 'es' : ''} de lectura`
                          : 'Tema nuevo — empieza aqui'}
                      </span>
                      <span className="text-amber-400" style={{ fontWeight: 700 }}>{heroProgressPct}%</span>
                    </div>
                    <ProgressBar value={heroProgress} color="bg-gradient-to-r from-amber-400 to-amber-500" className="h-2" animated dark />
                  </div>
                  {estimatedRemaining != null && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400" style={{ fontWeight: 500 }}>
                      <Clock className="w-3.5 h-3.5" /> ~{estimatedRemaining} min
                    </div>
                  )}
                </div>
              </div>

              {/* Orange CTA arrow */}
              <motion.div
                className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shrink-0 shadow-xl shadow-amber-500/25 group-hover:shadow-amber-500/40 transition-shadow"
                whileHover={shouldReduce ? undefined : { scale: 1.08, rotate: 3 }}
                whileTap={shouldReduce ? undefined : { scale: 0.95 }}
              >
                <ArrowRight className="w-7 h-7 text-white" />
              </motion.div>
            </div>
          </motion.button>
        ) : (
          /* Fallback: no topic derivable — prompt to explore sections below */
          <motion.div
            className="mt-8 bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center"
            {...fadeUp(0.4)}
          >
            <BookOpen className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
            <p className="text-sm text-zinc-300" style={{ fontWeight: 600 }}>Explora las secciones abajo y elige tu primer tema</p>
            <p className="text-xs text-zinc-400 mt-1">Tu progreso aparecera aqui</p>
          </motion.div>
        )}

        {/* Stats row (Hoy, Resúmenes, Flashcards, Videos) */}
        <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6" {...fadeUp(0.5)}>
          {[
            { icon: Clock, label: 'Hoy', value: `${todayStats.minutes > 0 ? todayStats.minutes : studyMinutesToday > 0 ? studyMinutesToday : 0}m`, sub: `meta ${dailyGoalMinutes}m`, accent: 'text-teal-300' },
            { icon: BookOpen, label: 'Resúmenes', value: String(todayStats.summaries), sub: 'leidos hoy', accent: 'text-teal-300' },
            { icon: Sparkles, label: 'Flashcards', value: String(todayStats.flashcards > 0 ? todayStats.flashcards : totalCardsReviewed), sub: todayStats.flashcards > 0 ? 'hoy' : 'total', accent: 'text-amber-400' },
            { icon: Play, label: 'Videos', value: String(todayStats.videos), sub: 'visto hoy', accent: 'text-violet-300' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="bg-white/[0.05] backdrop-blur-sm border border-white/[0.10] rounded-xl px-4 py-3.5"
              initial={shouldReduce ? false : { y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.05 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-3.5 h-3.5 ${stat.accent}`} />
                <span className="text-[11px] text-zinc-400" style={{ fontWeight: 500 }}>{stat.label}</span>
              </div>
              <p className="text-xl text-white tracking-tight" style={{ fontWeight: 700 }}>{stat.value}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">{stat.sub}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </HeroSection>
  );
}
