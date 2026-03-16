// ============================================================
// Axon — LeaderboardCard (Gamification Dashboard)
// Shows weekly/daily XP leaderboard with current user highlight.
// ============================================================

import { Trophy, Medal, Crown, User } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { LeaderboardResponse } from '@/app/services/gamificationApi';

interface LeaderboardCardProps {
  data: LeaderboardResponse | null | undefined;
  currentUserId: string | undefined;
  isLoading: boolean;
}

const rankIcons = [
  { icon: Crown, color: '#f59e0b' },
  { icon: Medal, color: '#94a3b8' },
  { icon: Medal, color: '#d97706' },
];

export function LeaderboardCard({ data, currentUserId, isLoading }: LeaderboardCardProps) {
  const shouldReduce = useReducedMotion();
  const entries = data?.leaderboard ?? [];
  const myRank = data?.my_rank;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-100 animate-pulse" />
              <div className="flex-1 h-3 bg-gray-100 rounded animate-pulse" />
              <div className="w-12 h-3 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="rounded-2xl border border-gray-200 bg-white p-5"
      initial={shouldReduce ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: '#fef3c7' }}
        >
          <Trophy className="w-4 h-4" style={{ color: '#f59e0b' }} />
        </div>
        <div>
          <h3 className="text-sm" style={{ color: '#111827', fontWeight: 700 }}>
            Leaderboard
          </h3>
          <span className="text-[10px]" style={{ color: '#9ca3af' }}>
            {data?.period === 'daily' ? 'Hoy' : 'Esta semana'}
          </span>
        </div>
        {myRank && (
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#f0fdf4', color: '#16a34a', fontWeight: 700 }}
          >
            #{myRank}
          </span>
        )}
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="text-center py-6">
          <Trophy className="w-6 h-6 mx-auto mb-1.5" style={{ color: '#d1d5db' }} />
          <p className="text-[11px]" style={{ color: '#9ca3af' }}>
            Aun no hay datos del leaderboard
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.slice(0, 10).map((entry, idx) => {
            const isMe = entry.student_id === currentUserId;
            const rankInfo = rankIcons[idx];
            const RankIcon = rankInfo?.icon;
            const xp = entry.xp_this_week ?? entry.xp_today ?? 0;

            return (
              <motion.div
                key={entry.student_id}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors"
                style={{
                  backgroundColor: isMe ? '#f0fdf4' : 'transparent',
                  border: isMe ? '1px solid #bbf7d0' : '1px solid transparent',
                }}
                initial={shouldReduce ? {} : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx }}
              >
                {/* Rank */}
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: idx < 3 ? `${rankInfo?.color}20` : '#f3f4f6',
                  }}
                >
                  {RankIcon && idx < 3 ? (
                    <RankIcon className="w-3 h-3" style={{ color: rankInfo?.color }} />
                  ) : (
                    <span className="text-[10px]" style={{ color: '#6b7280', fontWeight: 700 }}>
                      {idx + 1}
                    </span>
                  )}
                </div>

                {/* Avatar placeholder */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: isMe ? '#dcfce7' : '#f3f4f6' }}
                >
                  <User className="w-3.5 h-3.5" style={{ color: isMe ? '#16a34a' : '#9ca3af' }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] truncate" style={{
                    color: isMe ? '#16a34a' : '#374151',
                    fontWeight: isMe ? 700 : 500,
                  }}>
                    {isMe ? 'Tu' : `Estudiante ${idx + 1}`}
                  </p>
                  <p className="text-[9px]" style={{ color: '#9ca3af' }}>
                    Nivel {entry.current_level}
                  </p>
                </div>

                {/* XP */}
                <span className="text-[11px] shrink-0" style={{
                  color: isMe ? '#16a34a' : '#2a8c7a',
                  fontWeight: 700,
                }}>
                  {xp.toLocaleString()} XP
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default LeaderboardCard;
