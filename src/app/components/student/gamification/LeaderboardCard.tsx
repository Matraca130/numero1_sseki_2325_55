// ============================================================
// Axon — Leaderboard Card (weekly, anonymous with fun names)
// ============================================================

import { motion, useReducedMotion } from 'motion/react';
import { Trophy, TrendingUp, Crown, Medal } from 'lucide-react';
import { getLevelInfo } from '@/app/types/gamification';
import type { LeaderboardResponse } from '@/app/services/gamificationApi';

interface LeaderboardCardProps {
  data: LeaderboardResponse | null | undefined;
  currentUserId?: string;
  isLoading?: boolean;
  className?: string;
}

// Deterministic fun names based on rank position
const FUN_NAMES = [
  'Buho Sabio', 'Cerebro Veloz', 'Neurona Pro', 'Dr. Flash',
  'Raton de Biblio', 'Estetoscopio', 'Lector Nocturno', 'Atlas Humano',
  'Cafe y Libros', 'Sinapse Rapida', 'Bisturi Mental', 'Mente Clinica',
  'Corteza Pro', 'Pulso Firme', 'Dosis Exacta', 'Histologia Viva',
  'Axon Rapido', 'Plaqueta Feliz', 'Reflex Master', 'Neuro Star',
];

const RANK_STYLES: Record<number, { bg: string; text: string; icon: typeof Crown }> = {
  1: { bg: '#fef3c7', text: '#92400e', icon: Crown },
  2: { bg: '#f3f4f6', text: '#374151', icon: Medal },
  3: { bg: '#fff7ed', text: '#9a3412', icon: Medal },
};

function RankBadge({ rank }: { rank: number }) {
  const style = RANK_STYLES[rank];
  if (style) {
    const Icon = style.icon;
    return (
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: style.bg }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: style.text }} />
      </div>
    );
  }
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] shrink-0"
      style={{ backgroundColor: '#f3f4f6', color: '#6b7280', fontWeight: 600 }}
    >
      {rank}
    </div>
  );
}

interface DisplayEntry {
  rank: number;
  student_id: string;
  xp: number;
  level: number;
  total_xp: number;
  is_self: boolean;
  name: string;
}

function EntryRow({ entry, nextXp, index }: { entry: DisplayEntry; nextXp?: number; index: number }) {
  const shouldReduce = useReducedMotion();
  const levelInfo = getLevelInfo(entry.total_xp);
  const gap = nextXp != null && !entry.is_self ? nextXp - entry.xp : null;

  return (
    <motion.div
      className="flex items-center gap-2.5 py-2"
      style={{
        backgroundColor: entry.is_self ? '#f0fdf4' : 'transparent',
        borderRadius: 12,
        padding: entry.is_self ? '8px 10px' : '8px 4px',
        border: entry.is_self ? '1px solid #bbf7d0' : '1px solid transparent',
      }}
      initial={shouldReduce ? {} : { opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <RankBadge rank={entry.rank} />
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] text-white shrink-0"
        style={{
          backgroundColor: entry.is_self ? '#2a8c7a' : `hsl(${(entry.rank * 47) % 360}, 40%, 70%)`,
          fontWeight: 600,
        }}
      >
        {entry.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate" style={{ color: '#111827', fontWeight: entry.is_self ? 700 : 500 }}>
          {entry.is_self ? 'Tu' : entry.name}
        </p>
        <p className="text-[10px]" style={{ color: '#9ca3af' }}>
          Nivel {entry.level} — {levelInfo.title}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs" style={{ color: entry.is_self ? '#2a8c7a' : '#111827', fontWeight: 700 }}>
          {entry.xp.toLocaleString()}
        </p>
        <p className="text-[9px]" style={{ color: '#9ca3af' }}>XP</p>
      </div>
    </motion.div>
  );
}

export function LeaderboardCard({ data, currentUserId, isLoading, className = '' }: LeaderboardCardProps) {
  if (isLoading) {
    return (
      <div className={`rounded-2xl border border-gray-200 bg-white p-4 animate-pulse ${className}`}>
        <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="w-7 h-7 rounded-full bg-gray-200" />
            <div className="w-8 h-8 rounded-full bg-gray-200" />
            <div className="flex-1 h-3 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const rawEntries = data?.leaderboard ?? [];
  const entries: DisplayEntry[] = rawEntries.map((row: Record<string, unknown>, i: number) => {
    const isSelf = currentUserId ? row.student_id === currentUserId : false;
    return {
      rank: i + 1,
      student_id: (row.student_id as string) ?? '',
      xp: (row.xp_this_week as number) ?? (row.xp_today as number) ?? 0,
      level: (row.current_level as number) ?? 1,
      total_xp: (row.total_xp as number) ?? 0,
      is_self: isSelf,
      name: isSelf ? 'Tu' : FUN_NAMES[i % FUN_NAMES.length],
    };
  });

  const myRank = data?.my_rank;
  const myEntry = entries.find(e => e.is_self);
  const entryAbove = myEntry && myEntry.rank > 1 ? entries[myEntry.rank - 2] : null;
  const xpGap = entryAbove && myEntry ? entryAbove.xp - myEntry.xp : null;
  const periodLabel = data?.period === 'daily' ? 'Diaria' : 'Semanal';

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4" style={{ color: '#f59e0b' }} />
          <h3 className="text-sm" style={{ color: '#111827', fontWeight: 700 }}>
            Clasificacion {periodLabel}
          </h3>
        </div>
        {myRank && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
            style={{ backgroundColor: '#f0fdf4', color: '#16a34a', fontWeight: 600 }}
          >
            <TrendingUp className="w-3 h-3" />
            #{myRank}
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8">
          <Trophy className="w-8 h-8 mx-auto mb-2" style={{ color: '#d1d5db' }} />
          <p className="text-xs" style={{ color: '#9ca3af' }}>
            Aun no hay datos del leaderboard
          </p>
          <p className="text-[10px] mt-1" style={{ color: '#d1d5db' }}>
            Estudia para aparecer aqui
          </p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {entries.slice(0, 10).map((entry, i) => (
            <EntryRow
              key={entry.student_id || i}
              entry={entry}
              index={i}
            />
          ))}
        </div>
      )}

      {/* Motivational gap message */}
      {xpGap != null && xpGap > 0 && (
        <div
          className="mt-3 px-3 py-2 rounded-xl text-center text-[11px]"
          style={{ backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 500 }}
        >
          Solo {xpGap} XP te separan del #{(myEntry?.rank ?? 2) - 1}
        </div>
      )}

      {entries.length > 0 && (
        <p className="text-center text-[10px] mt-3" style={{ color: '#9ca3af' }}>
          {entries.length} estudiantes participando
        </p>
      )}
    </div>
  );
}
