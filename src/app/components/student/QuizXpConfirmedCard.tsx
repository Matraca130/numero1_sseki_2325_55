// ============================================================
// Axon v4.4 — Quiz XP Confirmed Card (Q-UX1 Premium)
//
// Premium upgrade of the G4 XP estimate card.
// Shows a 2-phase animation:
//   Phase 1 (0-0.8s): XP estimate with shimmer "verificando..."
//   Phase 2 (after confirm): Morphs to confirmed amount + check
//
// Gradient + spring physics + particle sparkles.
// ============================================================

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap, CheckCircle2, Loader2, Sparkles,
  TrendingUp, Award,
} from 'lucide-react';
import clsx from 'clsx';

// ── Props ────────────────────────────────────────────────

interface QuizXpConfirmedCardProps {
  /** Estimated XP from local XP_TABLE calculation */
  xpEstimate: number;
  /** Real XP delta from server (0 while loading) */
  confirmedXp: number;
  /** Whether server confirmation is complete */
  isConfirmed: boolean;
  /** Whether server fetch is in progress */
  isLoading: boolean;
  /** Stats for breakdown display */
  answeredCount: number;
  correctCount: number;
}

// ── Component ────────────────────────────────────────────

export const QuizXpConfirmedCard = React.memo(function QuizXpConfirmedCard({
  xpEstimate,
  confirmedXp,
  isConfirmed,
  isLoading,
  answeredCount,
  correctCount,
}: QuizXpConfirmedCardProps) {
  const displayXp = isConfirmed && confirmedXp > 0 ? confirmedXp : xpEstimate;
  const hasBonus = isConfirmed && confirmedXp > xpEstimate;
  const bonusDiff = hasBonus ? confirmedXp - xpEstimate : 0;

  if (xpEstimate <= 0 && confirmedXp <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.7, type: 'spring', stiffness: 400, damping: 28 }}
      className="relative overflow-hidden rounded-2xl mx-auto max-w-sm mb-6"
      style={{
        background: 'linear-gradient(135deg, rgba(15,23,42,0.03) 0%, rgba(15,23,42,0.01) 100%)',
      }}
    >
      {/* Glass card */}
      <div
        className="relative z-10 px-5 py-4 rounded-2xl"
        style={{
          background: isConfirmed
            ? 'linear-gradient(135deg, rgba(236,253,245,0.9) 0%, rgba(209,250,229,0.85) 50%, rgba(167,243,208,0.8) 100%)'
            : 'linear-gradient(135deg, rgba(254,243,199,0.85) 0%, rgba(253,230,138,0.8) 50%, rgba(252,211,77,0.75) 100%)',
          border: isConfirmed
            ? '1px solid rgba(16,185,129,0.35)'
            : '1px solid rgba(253,224,71,0.5)',
          boxShadow: isConfirmed
            ? '0 8px 32px -4px rgba(16,185,129,0.15), 0 0 0 1px rgba(16,185,129,0.05), inset 0 1px 0 rgba(255,255,255,0.6)'
            : '0 8px 32px -4px rgba(245,158,11,0.18), 0 0 0 1px rgba(245,158,11,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="flex items-center justify-between">
          {/* Left: Icon + breakdown */}
          <div className="flex items-center gap-3">
            {/* Animated icon */}
            <motion.div
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={{
                background: isConfirmed
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                boxShadow: isConfirmed
                  ? '0 4px 12px rgba(16,185,129,0.35)'
                  : '0 4px 12px rgba(245,158,11,0.3)',
                transition: 'all 0.5s ease',
              }}
              animate={isConfirmed ? { rotate: [0, -10, 10, 0] } : { rotate: [0, -6, 6, 0] }}
              transition={{ delay: isConfirmed ? 0.2 : 1.0, duration: 0.5 }}
            >
              <AnimatePresence mode="wait">
                {isConfirmed ? (
                  <motion.div
                    key="confirmed"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  >
                    <CheckCircle2 size={20} className="text-white" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="pending"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                  >
                    <Zap size={20} className="text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Text breakdown */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span
                  className={clsx(
                    'text-[11px]',
                    isConfirmed ? 'text-emerald-800' : 'text-amber-800',
                  )}
                  style={{ fontWeight: 600 }}
                >
                  {isConfirmed ? 'XP confirmado' : 'XP ganado en este quiz'}
                </span>
                {isLoading && (
                  <Loader2
                    size={10}
                    className="animate-spin text-amber-500"
                  />
                )}
                {isConfirmed && !isLoading && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, delay: 0.1 }}
                  >
                    <Sparkles size={10} className="text-emerald-500" />
                  </motion.div>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={clsx(
                    'text-[10px]',
                    isConfirmed ? 'text-emerald-600' : 'text-amber-600',
                  )}
                  style={{ fontWeight: 500 }}
                >
                  {answeredCount} respuestas + {correctCount} correctas
                </span>
                {hasBonus && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-0.5 text-[9px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full border border-emerald-200"
                    style={{ fontWeight: 700 }}
                  >
                    <TrendingUp size={8} />
                    +{bonusDiff} bonus
                  </motion.span>
                )}
              </div>
            </div>
          </div>

          {/* Right: XP amount */}
          <motion.div
            className="flex flex-col items-end"
            key={displayXp}
          >
            <motion.span
              className={clsx(
                'tabular-nums',
                isConfirmed ? 'text-emerald-900' : 'text-amber-900',
              )}
              style={{ fontWeight: 800, fontSize: '22px', letterSpacing: '-0.03em' }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.9, type: 'spring', stiffness: 300, damping: 15 }}
            >
              +{displayXp}
              <span
                className={clsx(
                  'text-xs ml-0.5',
                  isConfirmed ? 'text-emerald-700' : 'text-amber-700',
                )}
                style={{ fontWeight: 600 }}
              >
                XP
              </span>
            </motion.span>
            {isConfirmed && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="flex items-center gap-1 text-[9px] text-emerald-600"
                style={{ fontWeight: 600 }}
              >
                <Award size={8} />
                verificado por servidor
              </motion.span>
            )}
          </motion.div>
        </div>
      </div>

      {/* Shimmer overlay while loading */}
      {isLoading && (
        <motion.div
          className="absolute inset-0 z-20 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
          }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
});
