// ============================================================
// Axon — StudyStreakCard
// Racha de dias consecutivos de estudio.
// Fuente: GET /student-stats → current_streak, longest_streak
// ============================================================
import React from 'react';
import { motion } from 'motion/react';
import { Flame } from 'lucide-react';
import clsx from 'clsx';
import { components } from '@/app/design-system';
import type { StudentStatsRecord } from '@/app/services/platformApi';

interface StudyStreakCardProps {
  stats: StudentStatsRecord | null;
  studiedToday: boolean;
  loading?: boolean;
}

function getStreakColor(streak: number): { icon: string; bg: string; glow: string } {
  if (streak >= 14) return { icon: 'text-red-500', bg: 'bg-red-500/10', glow: 'shadow-red-500/20' };
  if (streak >= 7)  return { icon: 'text-orange-500', bg: 'bg-orange-500/10', glow: 'shadow-orange-500/20' };
  if (streak >= 3)  return { icon: 'text-amber-500', bg: 'bg-amber-500/10', glow: 'shadow-amber-500/20' };
  return { icon: 'text-gray-400', bg: 'bg-gray-100', glow: '' };
}

export function StudyStreakCard({ stats, studiedToday, loading }: StudyStreakCardProps) {
  const streak = stats?.current_streak ?? 0;
  const longest = stats?.longest_streak ?? 0;
  const color = getStreakColor(streak);

  if (loading) {
    return (
      <div className={clsx(components.kpiCard.base, 'flex flex-col items-center justify-center py-8')}>
        <div className="w-14 h-14 rounded-2xl bg-gray-100 animate-pulse mb-3" />
        <div className="w-16 h-8 bg-gray-100 rounded-lg animate-pulse mb-2" />
        <div className="w-32 h-4 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={clsx(
        components.kpiCard.base,
        'flex flex-col items-center justify-center py-6 relative overflow-hidden'
      )}
    >
      {/* Fire icon */}
      <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center mb-3', color.bg, color.glow && `shadow-lg ${color.glow}`)}>
        <Flame className={clsx('w-7 h-7', color.icon)} />
      </div>

      {/* Big number */}
      <motion.span
        key={streak}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={clsx(
          'text-4xl text-gray-900 tabular-nums',
          streak >= 7 && 'animate-pulse'
        )}
      >
        {streak}
      </motion.span>

      <span className="text-sm text-gray-500 mt-1">
        {streak === 1 ? 'dia de racha' : 'dias de racha'}
      </span>

      {/* Motivational text */}
      <p className="text-xs text-gray-400 mt-3 text-center px-4">
        {!studiedToday && streak > 0
          ? 'Estuda hoje para manter tua racha!'
          : streak >= 7
            ? `${streak} dias consecutivos!`
            : streak > 0
              ? `Melhor racha: ${longest} dias`
              : 'Comeca a estudar para iniciar tua racha'}
      </p>

      {/* Record badge */}
      {streak > 0 && streak >= longest && (
        <span className="mt-2 text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
          Recorde pessoal!
        </span>
      )}
    </motion.div>
  );
}
