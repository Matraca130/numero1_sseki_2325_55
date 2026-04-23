// ============================================================
// Axon — HeroGreeting (extracted from StudyHubHero.tsx)
//
// ZONE 1 top block: greeting, title and subtitle motion lines.
// Pure presentation; animation presets come from useMotionPresets.
// ============================================================
import React from 'react';
import { motion } from 'motion/react';

interface HeroGreetingProps {
  greeting: string;
  userName: string;
  heroReadingSessions: number;
  heroProgressPct: number;
  streakDays: number;
  effectiveTopic: { id: string; title: string } | null;
  estimatedRemaining: number | null;
  fadeUp: (delay: number) => any;
}

export function HeroGreeting({
  greeting,
  userName,
  heroReadingSessions,
  heroProgressPct,
  streakDays,
  effectiveTopic,
  estimatedRemaining,
  fadeUp,
}: HeroGreetingProps) {
  return (
    <>
      {/* Greeting */}
      <motion.p {...fadeUp(0)} className="text-sm text-zinc-300 mb-1.5">
        {greeting}{userName ? `, ${userName}` : ''}
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
    </>
  );
}
