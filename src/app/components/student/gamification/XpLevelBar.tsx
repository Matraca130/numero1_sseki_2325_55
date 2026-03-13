// ============================================================
// Axon — XP Level Bar Component
// Shows current XP, level progress, and title
// ============================================================

import { motion, useReducedMotion } from 'motion/react';
import { Zap, Star } from 'lucide-react';
import { getLevelInfo } from '@/app/types/gamification';
import type { GamificationProfile } from '@/app/services/gamificationApi';

interface XpLevelBarProps {
  xpData: GamificationProfile | null | undefined;
  compact?: boolean;
  className?: string;
}

const LEVEL_COLORS = [
  '#6b7280', '#2a8c7a', '#0d9488', '#059669', '#16a34a',
  '#ca8a04', '#ea580c', '#dc2626', '#9333ea', '#7c3aed',
  '#4f46e5', '#2563eb',
];

export function XpLevelBar({ xpData, compact = false, className = '' }: XpLevelBarProps) {
  const shouldReduce = useReducedMotion();
  const totalXP = xpData?.xp?.total ?? 0;
  const info = getLevelInfo(totalXP);
  const levelColor = LEVEL_COLORS[Math.min(info.level - 1, LEVEL_COLORS.length - 1)];

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs shrink-0"
          style={{ backgroundColor: levelColor, fontWeight: 700 }}
        >
          {info.level}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] truncate" style={{ color: '#374151', fontWeight: 600 }}>
              {info.title}
            </span>
            <span className="text-[10px] shrink-0 ml-1" style={{ color: '#9ca3af' }}>
              {totalXP.toLocaleString()} XP
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: levelColor }}
              initial={shouldReduce ? { width: `${info.progress * 100}%` } : { width: 0 }}
              animate={{ width: `${info.progress * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <motion.div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ backgroundColor: levelColor, fontWeight: 800, fontSize: '1.1rem' }}
          animate={!shouldReduce ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {info.level}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" style={{ color: levelColor }} fill={levelColor} />
            <h3 className="text-sm" style={{ color: '#111827', fontWeight: 700 }}>
              Nivel {info.level} — {info.title}
            </h3>
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>
            {totalXP.toLocaleString()} XP total
            {info.next && (
              <> — {info.xpForNext - info.xpInLevel} XP para Nivel {info.next.level}</>
            )}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden mb-2">
        <motion.div
          className="h-full rounded-full relative"
          style={{ backgroundColor: levelColor }}
          initial={shouldReduce ? { width: `${info.progress * 100}%` } : { width: 0 }}
          animate={{ width: `${info.progress * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        >
          {/* Shimmer effect */}
          {!shouldReduce && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            />
          )}
        </motion.div>
      </div>

      {/* Today's XP */}
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1" style={{ color: '#2a8c7a' }}>
          <Zap className="w-3 h-3" />
          <span style={{ fontWeight: 600 }}>
            +{xpData?.xp?.today ?? 0} XP hoy
          </span>
        </div>
        <span style={{ color: '#9ca3af' }}>
          {xpData?.xp?.this_week ?? 0} esta semana
        </span>
      </div>
    </div>
  );
}
