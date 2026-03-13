// ============================================================
// Axon v4.4 — Gamification Bar (Header Integration)
//
// Sprint G1→G3: Compact gamification strip for the student header.
// Uses GamificationContext instead of direct hook.
// ============================================================

import React from 'react';
import { motion } from 'motion/react';
import { useGamification } from '@/app/context/GamificationContext';
import { XpLevelBar } from './XpLevelBar';
import { StreakCounter } from './StreakCounter';
import { DailyGoalRing } from './DailyGoalRing';
import { XpToast } from './XpToast';

interface GamificationBarProps {
  onClick?: () => void;
}

export const GamificationBar = React.memo(function GamificationBar({
  onClick,
}: GamificationBarProps) {
  const { profile, streak, loading, error, xpDelta } = useGamification();

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 animate-pulse">
          <div className="w-5 h-5 rounded-full bg-white/10" />
          <div className="w-16 h-1.5 rounded-full bg-white/10" />
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div className="w-8 h-5 rounded-full bg-white/10 animate-pulse" />
        <div className="w-px h-4 bg-white/10" />
        <div className="w-6 h-6 rounded-full bg-white/10 animate-pulse" />
      </div>
    );
  }

  if (error || !profile) return null;

  return (
    <>
      <motion.button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2.5 px-2 py-1 -mx-2 rounded-lg transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        aria-label="Ver detalles de gamificacion"
      >
        <XpLevelBar totalXp={profile.total_xp} currentLevel={profile.current_level} compact />
        <div className="w-px h-4 bg-gray-300/30" />
        {streak && <StreakCounter streak={streak} compact />}
        <div className="w-px h-4 bg-gray-300/30" />
        <DailyGoalRing xpToday={profile.xp_today} dailyGoalXp={profile.daily_goal_xp} compact />
      </motion.button>
      <XpToast xpDelta={xpDelta} />
    </>
  );
});
