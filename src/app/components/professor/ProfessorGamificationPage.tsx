// ============================================================
// Axon v4.4 — Professor Gamification View (G7)
// /professor/gamification — Read-only student monitoring
// Imports from main's gamificationApi.ts signatures
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, Trophy, Users, Award, Loader2, AlertTriangle, Crown, Medal, BarChart3, User } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartErrorBoundary } from '@/app/components/shared/ChartErrorBoundary';
import { useAuth } from '@/app/context/AuthContext';
import { getLeaderboard, getBadges } from '@/app/services/gamificationApi';
import type { LeaderboardResponse, LeaderboardEntry, BadgesResponse } from '@/app/services/gamificationApi';

type Period = 'weekly' | 'daily';
const CAT_COLORS: Record<string, string> = { consistency: '#f59e0b', study: '#3b82f6', mastery: '#8b5cf6', exploration: '#10b981', social: '#ec4899' };
const CAT_LABELS: Record<string, string> = { consistency: 'Consistencia', study: 'Estudio', mastery: 'Maestria', exploration: 'Exploracion', social: 'Social' };

export function ProfessorGamificationPage() {
  const { selectedInstitution } = useAuth();
  const iid = selectedInstitution?.id;
  const [lb, setLb] = useState<LeaderboardResponse | null>(null);
  const [bd, setBd] = useState<BadgesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('weekly');

  const fetchData = useCallback(async () => {
    if (!iid) return; setLoading(true); setError(null);
    try {
      const [r1, r2] = await Promise.allSettled([
        getLeaderboard(iid, { limit: 20, period }),
        getBadges(iid),
      ]);
      if (r1.status === 'fulfilled') setLb(r1.value);
      if (r2.status === 'fulfilled') setBd(r2.value);
      if (r1.status === 'rejected' && r2.status === 'rejected') setError('Error cargando datos');
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setLoading(false); }
  }, [iid, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const lvlDist = useMemo(() => {
    if (!lb) return []; const c: Record<number, number> = {};
    lb.leaderboard.forEach(e => { c[e.current_level] = (c[e.current_level] || 0) + 1; });
    return Object.entries(c).map(([l, v]) => ({ name: `Lv.${l}`, value: v })).sort((a, b) => parseInt(a.name.replace('Lv.', '')) - parseInt(b.name.replace('Lv.', '')));
  }, [lb]);

  const catData = useMemo(() => {
    if (!bd) return []; const m: Record<string, { t: number; e: number }> = {};
    bd.badges.forEach(b => { if (!m[b.category]) m[b.category] = { t: 0, e: 0 }; m[b.category].t++; if (b.earned) m[b.category].e++; });
    return Object.entries(m).map(([c, d]) => ({ name: CAT_LABELS[c] ?? c, total: d.t, earned: d.e, fill: CAT_COLORS[c] ?? '#6b7280' }));
  }, [bd]);

  const n = lb?.leaderboard.length ?? 0;
  const avgXp = n > 0 ? Math.round(lb!.leaderboard.reduce((s, e) => s + e.total_xp, 0) / n) : 0;
  const avgLvl = n > 0 ? (lb!.leaderboard.reduce((s, e) => s + e.current_level, 0) / n).toFixed(1) : '0';
  const top5 = lb?.leaderboard.slice(0, 5) ?? [];

  if (!iid) return <div className="flex items-center justify-center h-full text-gray-400"><p className="text-sm">Selecciona una institucion</p></div>;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center"><TrendingUp size={24} className="text-teal-600" /></div><div><h1 className="text-xl text-gray-900" style={{ fontWeight: 800 }}>Gamificacion de Estudiantes</h1><p className="text-[12px] text-gray-500">Monitorea el progreso y engagement</p></div></div>
          <div className="flex items-center bg-gray-100 rounded-xl p-1">{(['weekly', 'daily'] as const).map(p => (<button key={p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 rounded-lg text-[11px] transition-all ${period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`} style={{ fontWeight: period === p ? 700 : 500 }}>{p === 'weekly' ? 'Semanal' : 'Hoy'}</button>))}</div>
        </div>
        {loading ? <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-teal-500" /></div>
        : error ? <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl border border-red-200 text-[12px] text-red-700"><AlertTriangle size={14} />{error}</div>
        : <>
          <div className="grid grid-cols-4 gap-4 mb-8">
            <StatC icon={<Users size={16} />} label="Estudiantes activos" value={String(n)} color="purple" />
            <StatC icon={<TrendingUp size={16} />} label="XP promedio" value={`${avgXp.toLocaleString()}`} color="blue" />
            <StatC icon={<Award size={16} />} label="Nivel promedio" value={avgLvl} color="amber" />
            <StatC icon={<Trophy size={16} />} label="Insignias" value={String(bd?.total ?? 0)} color="emerald" />
          </div>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4"><Crown size={16} className="text-amber-500" /><h3 className="text-[13px] text-gray-800" style={{ fontWeight: 700 }}>Top 5</h3></div>
              {top5.length === 0 ? <p className="text-[12px] text-gray-400 text-center py-6">Sin datos</p> : <div className="space-y-2">{top5.map((e, i) => (<div key={e.student_id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50"><span className={`text-[12px] w-6 text-center ${i === 0 ? 'text-amber-600' : i === 1 ? 'text-gray-500' : i === 2 ? 'text-orange-500' : 'text-gray-400'}`} style={{ fontWeight: 800 }}>{i === 0 ? <Crown size={14} /> : `#${i + 1}`}</span><div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center"><User size={12} className="text-gray-400" /></div><div className="flex-1 min-w-0"><p className="text-[11px] text-gray-700 truncate" style={{ fontWeight: 600 }}>Estudiante {e.student_id.substring(0, 8)}</p><p className="text-[9px] text-gray-400">Nivel {e.current_level}</p></div><span className="text-[11px] text-purple-600 tabular-nums" style={{ fontWeight: 700 }}>{e.total_xp.toLocaleString()} XP</span></div>))}</div>}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4"><BarChart3 size={16} className="text-blue-500" /><h3 className="text-[13px] text-gray-800" style={{ fontWeight: 700 }}>Por nivel</h3></div>
              {lvlDist.length === 0 ? <p className="text-[12px] text-gray-400 text-center py-6">Sin datos</p> : <ChartErrorBoundary height={180}><ResponsiveContainer width="100%" height={180}><BarChart data={lvlDist}><XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis hide allowDecimals={false} /><Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} /><Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#8b5cf6" isAnimationActive={false} /></BarChart></ResponsiveContainer></ChartErrorBoundary>}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-8">
            <div className="flex items-center gap-2 mb-4"><Trophy size={16} className="text-amber-500" /><h3 className="text-[13px] text-gray-800" style={{ fontWeight: 700 }}>Insignias por categoria</h3></div>
            {catData.length === 0 ? <p className="text-[12px] text-gray-400 text-center py-6">Sin datos</p> : <div className="grid grid-cols-5 gap-4">{catData.map(c => (<div key={c.name} className="text-center"><div className="w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: `${c.fill}15`, border: `2px solid ${c.fill}30` }}><span className="text-sm" style={{ color: c.fill, fontWeight: 800 }}>{c.total}</span></div><p className="text-[11px] text-gray-700" style={{ fontWeight: 600 }}>{c.name}</p><p className="text-[9px] text-gray-400">{c.earned} desbloq.</p></div>))}</div>}
          </div>
          {lb && lb.leaderboard.length > 5 && <div className="bg-white rounded-2xl border border-gray-100 p-5"><div className="flex items-center gap-2 mb-4"><Medal size={16} className="text-gray-500" /><h3 className="text-[13px] text-gray-800" style={{ fontWeight: 700 }}>Ranking ({lb.leaderboard.length})</h3></div><div className="space-y-1">{lb.leaderboard.map((e, i) => (<div key={e.student_id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"><span className="text-[11px] text-gray-400 w-8 text-center tabular-nums" style={{ fontWeight: 700 }}>{i + 1}</span><div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"><User size={10} className="text-gray-400" /></div><span className="text-[11px] text-gray-700 flex-1" style={{ fontWeight: 500 }}>{e.student_id.substring(0, 12)}...</span><span className="text-[10px] text-gray-400 w-12 text-center">Lv.{e.current_level}</span><span className="text-[11px] text-purple-600 w-20 text-right tabular-nums" style={{ fontWeight: 700 }}>{e.total_xp.toLocaleString()} XP</span></div>))}</div></div>}
        </>}
      </div>
    </div>
  );
}

function StatC({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const cm: Record<string, string> = { purple: 'text-teal-600 bg-teal-50 border-teal-200', blue: 'text-teal-600 bg-teal-50 border-teal-200', amber: 'text-amber-600 bg-amber-50 border-amber-200', emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
  return <div className={`rounded-2xl px-4 py-4 border ${cm[color] ?? cm.purple}`}><div className="flex items-center gap-1.5 mb-2">{icon}</div><p className="text-2xl tabular-nums" style={{ fontWeight: 800 }}>{value}</p><p className="text-[10px] opacity-70 mt-0.5" style={{ fontWeight: 500 }}>{label}</p></div>;
}
