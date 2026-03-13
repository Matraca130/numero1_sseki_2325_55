// ============================================================
// Axon v4.4 — Daily Goal Ring (Premium)
//
// Sprint G1→G3 AUDIT: Premium upgrade
// Props: xpToday, dailyGoalXp, compact
// ============================================================

import React from 'react';
import { Target, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface DailyGoalRingProps {
  xpToday: number;
  dailyGoalXp: number;
  compact?: boolean;
}

export const DailyGoalRing = React.memo(function DailyGoalRing({
  xpToday,
  dailyGoalXp,
  compact = false,
}: DailyGoalRingProps) {
  const goalXp = dailyGoalXp > 0 ? dailyGoalXp : 50;
  const progress = Math.min(1, xpToday / goalXp);
  const isComplete = progress >= 1;

  const size = compact ? 24 : 52;
  const strokeWidth = compact ? 2.5 : 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const ringColor = isComplete
    ? '#16a34a'
    : progress >= 0.7
      ? '#22c55e'
      : progress >= 0.4
        ? '#f59e0b'
        : '#3b82f6';

  if (compact) {
    return (
      <div
        className="relative flex items-center justify-center"
        title={`${xpToday}/${goalXp} XP hoy`}
        style={{ filter: isComplete ? 'drop-shadow(0 0 4px rgba(22,163,74,0.3))' : 'none' }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={ringColor}
            strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>
        {isComplete && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Check size={10} className="text-green-600" strokeWidth={3} />
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={ringColor}
            strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isComplete ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.6, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <Target size={18} className="text-green-600" />
            </motion.div>
          ) : (
            <span className="text-[12px] tabular-nums" style={{ fontWeight: 700, color: ringColor, letterSpacing: '-0.02em' }}>
              {Math.round(progress * 100)}%
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-gray-700" style={{ fontWeight: 600 }}>
          {isComplete ? 'Meta cumplida!' : 'Meta diaria'}
        </span>
        <span className="text-[11px] text-gray-500 tabular-nums">
          {xpToday} / {goalXp} XP
        </span>
      </div>
    </div>
  );
});
