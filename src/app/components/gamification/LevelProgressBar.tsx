// ============================================================
// Axon — LevelProgressBar
//
// Shows current level + XP progress toward next level.
// Used in session summary and dashboard.
// ============================================================

import React from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import {
  calculateLevel,
  xpForNextLevel,
  xpForCurrentLevel,
  LEVEL_NAMES,
} from '@/app/lib/xp-constants';

interface LevelProgressBarProps {
  totalXP: number;
  currentLevel: number;
  animate?: boolean;
  compact?: boolean;
}

export function LevelProgressBar({
  totalXP,
  currentLevel,
  animate = true,
  compact = false,
}: LevelProgressBarProps) {
  const currentThreshold = xpForCurrentLevel(currentLevel);
  const nextThreshold = xpForNextLevel(currentLevel);
  const xpIntoLevel = totalXP - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const progress = xpNeeded > 0 ? Math.min(100, (xpIntoLevel / xpNeeded) * 100) : 100;
  const levelName = LEVEL_NAMES[currentLevel] || `Nivel ${currentLevel}`;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Star size={12} className="text-amber-400" />
          <span className="text-xs text-amber-400 tabular-nums" style={{ fontWeight: 700 }}>
            Lv.{currentLevel}
          </span>
        </div>
        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden min-w-[60px]">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
            initial={animate ? { width: 0 } : undefined}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
            <Star size={16} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-200" style={{ fontWeight: 600 }}>
              Nivel {currentLevel}
            </p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
              {levelName}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-300 tabular-nums" style={{ fontWeight: 600 }}>
            {totalXP.toLocaleString()} XP
          </p>
          <p className="text-[10px] text-zinc-500 tabular-nums">
            {xpIntoLevel}/{xpNeeded} para Lv.{currentLevel + 1}
          </p>
        </div>
      </div>
      <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
          initial={animate ? { width: 0 } : undefined}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
    </div>
  );
}
