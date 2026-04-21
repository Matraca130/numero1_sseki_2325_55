// ============================================================
// Axon v4.4 — Leaderboard Page (G6: Dedicated Student Page)
// /student/leaderboard — Weekly/daily competitive ranking
// Imports from main's gamificationApi.ts signatures
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { Trophy, Crown, Medal, Loader2, AlertTriangle, TrendingUp, User } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { getLeaderboard } from '@/app/services/gamificationApi';
import type { LeaderboardResponse, LeaderboardEntry } from '@/app/services/gamificationApi';
import { gradients } from '@/app/design-system';

type Period = 'weekly' | 'daily';

const PODIUM = [
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', gradient: gradients.gold.css },
  { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300', gradient: gradients.silver.css },
  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', gradient: gradients.bronze.css },
];

// Shared empty array so identity is stable across renders when data is absent.
const EMPTY_ENTRIES: LeaderboardEntry[] = [];

export function LeaderboardPage() {
  const { selectedInstitution, user } = useAuth();
  const institutionId = selectedInstitution?.id;
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('weekly');

  const fetchData = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true); setError(null);
    try {
      // main API: getLeaderboard(institutionId, opts?)
      const res = await getLeaderboard(institutionId, { limit: 50, period });
      setData(res);
    } catch (err) { setError(err instanceof Error ? err.message : 'Error cargando leaderboard'); }
    finally { setLoading(false); }
  }, [institutionId, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getXp = useCallback(
    (e: LeaderboardEntry) => period === 'daily' ? e.xp_today ?? 0 : e.xp_this_week ?? e.total_xp,
    [period],
  );
  const { top3, rest } = useMemo(() => ({
    top3: data?.leaderboard.slice(0, 3) ?? EMPTY_ENTRIES,
    rest: data?.leaderboard.slice(3) ?? EMPTY_ENTRIES,
  }), [data]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center"><TrendingUp size={22} className="text-blue-600" /></div><div><h1 className="text-xl text-gray-900" style={{ fontWeight: 800 }}>Leaderboard</h1><p className="text-[12px] text-gray-500">Compite con tus companeros</p></div></div>
          <div className="flex items-center bg-gray-100 rounded-xl p-1">{(['weekly', 'daily'] as const).map(p => (<button key={p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 rounded-lg text-[11px] transition-all ${period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`} style={{ fontWeight: period === p ? 700 : 500 }}>{p === 'weekly' ? 'Semanal' : 'Hoy'}</button>))}</div>
        </div>
        {data?.my_rank && <div className="mb-6 flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: gradients.userRankBanner.css, border: `1px solid ${gradients.userRankBanner.border}` }}><div className="flex items-center gap-2"><User size={14} className="text-blue-600" /><span className="text-[12px] text-blue-800" style={{ fontWeight: 600 }}>Tu posicion</span></div><span className="text-lg text-blue-700 tabular-nums" style={{ fontWeight: 800 }}>#{data.my_rank}</span></div>}
        {loading ? <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
        : error ? <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl border border-red-200 text-[12px] text-red-700"><AlertTriangle size={14} />{error}</div>
        : <>
          {top3.length > 0 && <div className="flex items-end justify-center gap-3 mb-8 pt-4">
            {[1, 0, 2].map(idx => top3[idx] && <PodiumCard key={top3[idx].student_id} entry={top3[idx]} rank={(idx === 1 ? 2 : idx === 0 ? 1 : 3) as 1|2|3} xp={getXp(top3[idx])} isMe={top3[idx].student_id === user?.id} />)}
          </div>}
          {rest.length > 0 && <div className="space-y-1.5">{rest.map((entry, i) => (
            <LeaderboardRow key={entry.student_id} entry={entry} rank={i + 4} delay={Math.min(i * 0.03, 0.3)} isMe={entry.student_id === user?.id} xp={getXp(entry)} />
          ))}</div>}
          {data?.leaderboard.length === 0 && <div className="flex flex-col items-center justify-center py-20 text-gray-400"><Trophy size={32} className="opacity-30 mb-3" /><p className="text-sm">No hay datos para este periodo</p></div>}
        </>}
      </div>
    </div>
  );
}

const PODIUM_HEIGHTS = { 1: 'h-28', 2: 'h-20', 3: 'h-16' } as const;

const PodiumCard = React.memo(function PodiumCard({ entry, rank, xp, isMe }: { entry: LeaderboardEntry; rank: 1|2|3; xp: number; isMe: boolean }) {
  const s = PODIUM[rank - 1];
  return (<motion.div className="flex flex-col items-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: rank * 0.1 }}>
    <div className="relative mb-2"><div className={`w-14 h-14 rounded-full ${s.bg} border-2 ${s.border} flex items-center justify-center ${isMe ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}><User size={20} className={s.text} /></div><div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: s.gradient }}><span className="text-white text-[10px]" style={{ fontWeight: 800 }}>{rank}</span></div></div>
    <p className="text-[11px] text-gray-700 mb-0.5 text-center" style={{ fontWeight: 600 }}>{isMe ? 'Tu' : `Est. ${entry.student_id.substring(0, 4)}`}</p>
    <p className={`text-[11px] tabular-nums ${s.text}`} style={{ fontWeight: 700 }}>{xp.toLocaleString()} XP</p>
    <p className="text-[9px] text-gray-400">Lv.{entry.current_level}</p>
    <div className={`${PODIUM_HEIGHTS[rank]} w-20 mt-2 rounded-t-xl ${s.bg} border ${s.border} border-b-0 flex items-start justify-center pt-2`}>{rank === 1 ? <Crown size={16} className={s.text} /> : <Medal size={16} className={s.text} />}</div>
  </motion.div>);
});

const LeaderboardRow = React.memo(function LeaderboardRow({ entry, rank, delay, isMe, xp }: { entry: LeaderboardEntry; rank: number; delay: number; isMe: boolean; xp: number }) {
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isMe ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-100 hover:bg-gray-50'}`}>
      <span className="text-[12px] text-gray-400 w-8 text-center tabular-nums" style={{ fontWeight: 700 }}>{rank}</span>
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><User size={14} className="text-gray-400" /></div>
      <div className="flex-1 min-w-0"><p className="text-[12px] text-gray-800 truncate" style={{ fontWeight: 600 }}>{isMe ? 'Tu' : `Estudiante ${entry.student_id.substring(0, 6)}`}</p><p className="text-[10px] text-gray-400">Nivel {entry.current_level}</p></div>
      <span className="text-[12px] text-gray-700 tabular-nums" style={{ fontWeight: 700 }}>{xp.toLocaleString()} XP</span>
    </motion.div>
  );
});
