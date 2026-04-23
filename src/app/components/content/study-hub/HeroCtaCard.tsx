// ============================================================
// Axon — HeroCtaCard (extracted from StudyHubHero.tsx)
//
// The "continue studying" (or fallback) card inside ZONE 1.
// ============================================================
import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BookOpen, Clock, ArrowRight } from 'lucide-react';
import { ProgressBar, Breadcrumb, focusRing } from '@/app/components/design-kit';

interface HeroCtaCardProps {
  effectiveTopic: { id: string; title: string } | null;
  heroReadingSessions: number;
  heroProgress: number;
  heroProgressPct: number;
  heroLastActivity: string | undefined;
  estimatedRemaining: number | null;
  courseName: string;
  sectionName: string;
  onContinue: () => void;
  fadeUp: (delay: number) => any;
}

export function HeroCtaCard({
  effectiveTopic,
  heroReadingSessions,
  heroProgress,
  heroProgressPct,
  heroLastActivity,
  estimatedRemaining,
  courseName,
  sectionName,
  onContinue,
  fadeUp,
}: HeroCtaCardProps) {
  const shouldReduce = useReducedMotion();

  if (!effectiveTopic) {
    return (
      <motion.div
        className="mt-8 bg-zinc-800/80 border border-white/10 rounded-2xl p-6 text-center"
        {...fadeUp(0.4)}
      >
        <BookOpen className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
        <p className="text-sm text-zinc-300" style={{ fontWeight: 600 }}>Explora las secciones abajo y elige tu primer tema</p>
        <p className="text-xs text-zinc-400 mt-1">Tu progreso aparecera aqui</p>
      </motion.div>
    );
  }

  return (
    <motion.button
      onClick={onContinue}
      className={`w-full text-left mt-8 bg-zinc-800/80 border border-amber-400/15 rounded-2xl p-6 hover:bg-zinc-800 hover:border-amber-400/30 transition-all group cursor-pointer relative overflow-hidden ${focusRing}`}
      {...fadeUp(0.4)}
      whileHover={shouldReduce ? undefined : { y: -3 }}
    >
      {/* Page spine */}
      <div className="absolute left-2.5 top-5 bottom-5 flex flex-col items-center gap-1.5">
        {Array.from({ length: 5 }, (_, i) => {
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
  );
}
