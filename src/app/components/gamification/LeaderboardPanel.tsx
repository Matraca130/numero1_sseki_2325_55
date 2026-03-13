// ============================================================
// Axon v4.4 — Leaderboard Panel (Premium)
// Sprint G2→G3: Weekly/daily toggle, podium top 3,
// my_rank callout, staggered animations, a11y.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Crown, Medal, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/app/context/AuthContext';
import { getLeaderboard } from '@/app/services/gamificationApi';
import type { LeaderboardEntry, LeaderboardPeriod } from '@/app/types/gamification';

interface LeaderboardPanelProps { limit?: number; }

const PODIUM: Record<number, { bg: string; border: string; icon: React.ElementType; color: string }> = {
  1: { bg: 'linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%)', border: '#fcd34d', icon: Crown, color: '#d97706' },
  2: { bg: 'linear-gradient(145deg, #f9fafb 0%, #f3f4f6 100%)', border: '#d1d5db', icon: Medal, color: '#6b7280' },
  3: { bg: 'linear-gradient(145deg, #fff7ed 0%, #ffedd5 100%)', border: '#fdba74', icon: Medal, color: '#ea580c' },
};

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6', '#ef4444', '#22c55e', '#06b6d4', '#a855f7', '#f97316'];
function avatarColor(id: string): string { let h = 0; for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0; return COLORS[Math.abs(h) % COLORS.length]; }

export const LeaderboardPanel = React.memo(function LeaderboardPanel({ limit = 20 }: LeaderboardPanelProps) {
  const { selectedInstitution } = useAuth();
  const institutionId = selectedInstitution?.id ?? null;
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLb = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    try { const res = await getLeaderboard(institutionId, period, { limit }); setEntries(res.leaderboard); setMyRank(res.my_rank); }
    catch { setEntries([]); setMyRank(null); }
    finally { setLoading(false); }
  }, [institutionId, period, limit]);

  useEffect(() => { fetchLb(); }, [fetchLb]);

  const getXp = (e: LeaderboardEntry) => period === 'weekly' ? (e.xp_this_week ?? e.total_xp) : (e.xp_today ?? e.total_xp);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe' }}>
            <TrendingUp size={14} className="text-blue-600" />
          </div>
          <span className="text-sm text-gray-800" style={{ fontWeight: 700 }}>Leaderboard</span>
        </div>
        <div className="relative flex bg-gray-100 rounded-lg p-0.5">
          {(['weekly', 'daily'] as LeaderboardPeriod[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className="relative z-10 text-[11px] px-3 py-1 rounded-md transition-colors" style={{ fontWeight: period === p ? 600 : 400, color: period === p ? '#1f2937' : '#9ca3af' }}>
              {p === 'weekly' ? 'Semanal' : 'Diario'}
            </button>
          ))}
          <motion.div className="absolute top-0.5 h-[calc(100%-4px)] rounded-md bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }} animate={{ left: period === 'weekly' ? '2px' : '50%', width: 'calc(50% - 4px)' }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
        </div>
      </div>

      {myRank && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)', border: '1px solid #bae6fd', boxShadow: '0 2px 8px rgba(59,130,246,0.08)' }}>
          <span className="text-[11px] text-blue-700" style={{ fontWeight: 500 }}>Tu posicion</span>
          <span className="text-sm text-blue-800 tabular-nums" style={{ fontWeight: 800 }}>#{myRank}</span>
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: '#f9fafb' }} />)}</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #f9fafb 0%, #f3f4f6 100%)', border: '1px solid #e5e7eb' }}><Trophy size={24} className="text-gray-300" /></div>
          <p className="text-xs text-gray-400" style={{ fontWeight: 500 }}>Sin datos de leaderboard aun</p>
        </div>
      ) : (
        <div className="space-y-1" role="list" aria-label="Clasificacion">
          <AnimatePresence mode="popLayout">
            {entries.map((entry, index) => {
              const rank = index + 1;
              const podium = PODIUM[rank];
              const PIcon = podium?.icon;
              const xp = getXp(entry);
              const c = avatarColor(entry.student_id);
              return (
                <motion.div key={entry.student_id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors hover:bg-gray-50/50"
                  style={{ background: podium?.bg ?? 'transparent', border: podium ? `1px solid ${podium.border}` : '1px solid transparent' }}
                  role="listitem" aria-label={`Posicion ${rank}: ${xp} XP`}>
                  <div className="w-7 flex items-center justify-center shrink-0">
                    {PIcon ? <PIcon size={16} style={{ color: podium.color }} /> : <span className="text-xs text-gray-400 tabular-nums" style={{ fontWeight: 600 }}>{rank}</span>}
                  </div>
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] text-white shrink-0" style={{ background: `linear-gradient(135deg, ${c} 0%, ${c}cc 100%)`, fontWeight: 700, boxShadow: podium ? `0 2px 6px ${c}40` : 'none' }}>
                      {entry.student_id.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-gray-800 truncate" style={{ fontWeight: 600 }}>Estudiante {entry.student_id.substring(0, 6)}</span>
                      <span className="text-[9px] text-gray-400" style={{ fontWeight: 500 }}>Nivel {entry.current_level}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xs tabular-nums" style={{ color: podium?.color ?? '#374151', fontWeight: 700 }}>{xp.toLocaleString()}</span>
                    <span className="text-[9px] text-gray-400">XP</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
});
