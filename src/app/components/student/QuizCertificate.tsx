// ============================================================
// Axon — Student Quiz: Completion Certificate (P9 Feature)
//
// Agent: CERTIFICATE
// Animated achievement certificate shown when student
// scores >= 80% on a quiz. Celebrates mastery with
// visual flair and confetti.
//
// Design: gradient border, gold/teal accent, trophy icon.
// ============================================================

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';
import {
  Award, Star, Sparkles,
  Crown, Zap, Shield,
} from 'lucide-react';

// ── Props ────────────────────────────────────────────────

interface QuizCertificateProps {
  quizTitle: string;
  score: number; // 0-100
  correctCount: number;
  totalQuestions: number;
  durationSec: number;
}

// ── Achievement tiers ──────────────────────────────────

function getAchievement(score: number) {
  if (score === 100) return {
    tier: 'perfecto',
    title: 'Perfeccion Absoluta',
    subtitle: 'Has respondido TODAS las preguntas correctamente',
    icon: <Crown size={28} className="text-amber-400" />,
    gradient: 'from-amber-400 via-yellow-500 to-amber-600',
    borderGlow: 'shadow-amber-500/30',
    bgColor: 'bg-gradient-to-br from-amber-50 to-yellow-50',
    accentColor: 'text-amber-600',
    stars: 3,
  };
  if (score >= 90) return {
    tier: 'excelente',
    title: 'Dominio Excepcional',
    subtitle: 'Demostraste un dominio sobresaliente del tema',
    icon: <Shield size={28} className="text-emerald-400" />,
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    borderGlow: 'shadow-emerald-500/25',
    bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-50',
    accentColor: 'text-emerald-600',
    stars: 3,
  };
  return {
    tier: 'aprobado',
    title: 'Objetivo Cumplido',
    subtitle: 'Has alcanzado el umbral de dominio BKT',
    icon: <Zap size={28} className="text-teal-400" />,
    gradient: 'from-teal-500 via-cyan-500 to-blue-500',
    borderGlow: 'shadow-teal-500/20',
    bgColor: 'bg-gradient-to-br from-teal-50 to-cyan-50',
    accentColor: 'text-teal-600',
    stars: 2,
  };
}

// ── Component ────────────────────────────────────────────

export const QuizCertificate = React.memo(function QuizCertificate({
  quizTitle,
  score,
  correctCount,
  totalQuestions,
  durationSec,
}: QuizCertificateProps) {
  const achievement = useMemo(() => getAchievement(score), [score]);
  const dateStr = new Date().toLocaleDateString('es', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;

  // Don't show for < 80%
  if (score < 80) return null;

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0, y: -20, rotate: -2 }}
      animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 }}
      className="mb-8"
    >
      {/* Certificate card */}
      <div className={clsx(
        'relative rounded-3xl p-[2px] shadow-2xl',
        achievement.borderGlow,
      )}>
        {/* Gradient border */}
        <div className={clsx('absolute inset-0 rounded-3xl bg-gradient-to-br opacity-60', achievement.gradient)} />

        {/* Inner card */}
        <div className={clsx(
          'relative rounded-[22px] px-8 py-7 border border-white/50',
          achievement.bgColor,
        )}>
          {/* Decorative corner sparkles */}
          <Sparkles size={14} className="absolute top-4 right-5 text-amber-300 opacity-60" />
          <Sparkles size={10} className="absolute top-7 right-9 text-amber-400 opacity-40" />
          <Sparkles size={12} className="absolute bottom-5 left-6 text-teal-300 opacity-50" />

          {/* Top section: icon + title */}
          <div className="flex items-center gap-4 mb-5">
            <motion.div
              className={clsx(
                'w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg',
                achievement.gradient,
              )}
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', delay: 0.5 }}
            >
              {achievement.icon}
            </motion.div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className={clsx('text-lg', achievement.accentColor)} style={{ fontWeight: 800 }}>
                  {achievement.title}
                </h3>
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: achievement.stars }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.7 + i * 0.15 }}
                    >
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                    </motion.div>
                  ))}
                </div>
              </div>
              <p className="text-[12px] text-zinc-500">{achievement.subtitle}</p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/70 rounded-xl px-3 py-2.5 text-center border border-white shadow-sm">
              <motion.span
                className={clsx('text-[clamp(1.25rem,2.5vw,1.5rem)] block', achievement.accentColor)}
                style={{ fontWeight: 800 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                {score}%
              </motion.span>
              <span className="text-[9px] text-zinc-400 uppercase tracking-wider" style={{ fontWeight: 700 }}>
                Puntaje
              </span>
            </div>
            <div className="bg-white/70 rounded-xl px-3 py-2.5 text-center border border-white shadow-sm">
              <span className="text-[clamp(1.25rem,2.5vw,1.5rem)] text-zinc-700 block" style={{ fontWeight: 800 }}>
                {correctCount}/{totalQuestions}
              </span>
              <span className="text-[9px] text-zinc-400 uppercase tracking-wider" style={{ fontWeight: 700 }}>
                Correctas
              </span>
            </div>
            <div className="bg-white/70 rounded-xl px-3 py-2.5 text-center border border-white shadow-sm">
              <span className="text-[clamp(1.25rem,2.5vw,1.5rem)] text-zinc-700 block" style={{ fontWeight: 800 }}>
                {mins}:{String(secs).padStart(2, '0')}
              </span>
              <span className="text-[9px] text-zinc-400 uppercase tracking-wider" style={{ fontWeight: 700 }}>
                Tiempo
              </span>
            </div>
          </div>

          {/* Quiz name + date */}
          <div className="flex items-center justify-between border-t border-white/50 pt-3">
            <div>
              <p className="text-[10px] text-zinc-400 mb-0.5" style={{ fontWeight: 600 }}>QUIZ</p>
              <p className="text-[12px] text-zinc-600 truncate max-w-[280px]" style={{ fontWeight: 600 }}>
                {quizTitle}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-400 mb-0.5" style={{ fontWeight: 600 }}>FECHA</p>
              <p className="text-[11px] text-zinc-500" style={{ fontWeight: 500 }}>{dateStr}</p>
            </div>
          </div>

          {/* Axon branding */}
          <div className="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-white/40">
            <Award size={12} className="text-zinc-300" />
            <span className="text-[9px] text-zinc-300 uppercase tracking-widest" style={{ fontWeight: 700 }}>
              Certificado Axon
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});