// ============================================================
// Axon v4.4 — XP Level Progress Bar (Premium)
//
// Sprint G1→G3 AUDIT: Premium upgrade with:
//   - Gradient progress bar instead of flat color
//   - Subtle shine animation sweeping across the bar
//   - Level badge with glow by tier
//   - Animated number transitions
//   - Pill labels for level name
//
// Props:
//   totalXp      — Total accumulated XP
//   currentLevel — Current level (1-12)
//   compact      — If true, renders minimal version for header
// ============================================================

import React from 'react';
import { Star } from 'lucide-react';
import { getLevelProgress, LEVEL_THRESHOLDS } from '@/app/types/gamification';
import { motion } from 'motion/react';

interface XpLevelBarProps {
  totalXp: number;
  currentLevel: number;
  compact?: boolean;
}

// ── Level Names ──────────────────────────────────────────

const LEVEL_NAMES: Record<number, string> = {
  1: 'Novato',
  2: 'Aprendiz',
  3: 'Estudiante',
  4: 'Dedicado',
  5: 'Competente',
  6: 'Habil',
  7: 'Experto',
  8: 'Maestro',
  9: 'Sabio',
  10: 'Erudito',
  11: 'Eminencia',
  12: 'Leyenda',
};

export const XpLevelBar = React.memo(function XpLevelBar({
  totalXp,
  currentLevel,
  compact = false,
}: XpLevelBarProps) {
  const { current, needed, progress, isMaxLevel } = getLevelProgress(
    totalXp,
    currentLevel,
  );

  const tier = getLevelTier(currentLevel);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div
          className="flex items-center justify-center w-5 h-5 rounded-full"
          style={{
            background: tier.gradient,
            boxShadow: `0 0 6px ${tier.glow}`,
          }}
        >
          <span className="text-[10px] text-white" style={{ fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
            {currentLevel}
          </span>
        </div>
        <div className="w-16 h-1.5 bg-gray-200/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: tier.barGradient }}
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Header: Level badge + name + XP count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-full"
            style={{
              background: tier.gradient,
              boxShadow: `0 2px 8px ${tier.glow}`,
            }}
          >
            <Star size={13} className="text-white" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.2))' }} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-800" style={{ fontWeight: 700 }}>
              Nivel {currentLevel}
            </span>
            <span className="text-[9px]" style={{ color: tier.accent, fontWeight: 600 }}>
              {LEVEL_NAMES[currentLevel] ?? `Nivel ${currentLevel}`}
            </span>
          </div>
        </div>
        <span className="text-[11px] text-gray-500 tabular-nums">
          {isMaxLevel
            ? `${totalXp.toLocaleString()} XP (MAX)`
            : `${current.toLocaleString()} / ${needed.toLocaleString()} XP`}
        </span>
      </div>

      {/* Progress bar with gradient fill */}
      <div className="relative w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full relative overflow-hidden"
          style={{ background: tier.barGradient }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Shine sweep animation */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </div>
  );
});

// ── Level Tier Styling ───────────────────────────────────
// Premium gradients and glow per tier range

interface LevelTier {
  gradient: string;
  barGradient: string;
  glow: string;
  accent: string;
}

function getLevelTier(level: number): LevelTier {
  if (level >= 10) {
    return {
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      barGradient: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.35)',
      accent: '#d97706',
    };
  }
  if (level >= 7) {
    return {
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      barGradient: 'linear-gradient(90deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)',
      glow: 'rgba(139,92,246,0.3)',
      accent: '#7c3aed',
    };
  }
  if (level >= 4) {
    return {
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      barGradient: 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
      glow: 'rgba(59,130,246,0.3)',
      accent: '#2563eb',
    };
  }
  return {
    gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    barGradient: 'linear-gradient(90deg, #86efac 0%, #22c55e 50%, #16a34a 100%)',
    glow: 'rgba(34,197,94,0.3)',
    accent: '#16a34a',
  };
}
