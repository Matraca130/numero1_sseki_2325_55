// ============================================================
// Axon v4.4 — XP History Page (G6: Dedicated Student Page)
// /student/xp-history — Paginated XP transaction timeline
// Imports from main's gamificationApi.ts signatures
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { History, Loader2, AlertTriangle, ChevronDown, Zap, Flame, Target, BookOpen, Brain, Award, CreditCard, CheckCircle, ListTodo } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { getXPHistory, getProfile } from '@/app/services/gamificationApi';
import type { XPTransaction, XPHistoryResponse, GamificationProfile } from '@/app/services/gamificationApi';

const ACTION_CFG: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  review_flashcard: { label: 'Flashcard revisada', icon: CreditCard, color: 'text-teal-500 bg-teal-50' },
  review_correct: { label: 'Flashcard correcta', icon: CheckCircle, color: 'text-emerald-500 bg-emerald-50' },
  quiz_answer: { label: 'Respuesta de quiz', icon: Target, color: 'text-teal-500 bg-teal-50' },
  quiz_correct: { label: 'Quiz correcto', icon: Award, color: 'text-amber-500 bg-amber-50' },
  complete_session: { label: 'Sesion completada', icon: CheckCircle, color: 'text-teal-500 bg-teal-50' },
  complete_reading: { label: 'Lectura completada', icon: BookOpen, color: 'text-teal-500 bg-teal-50' },
  complete_video: { label: 'Video completado', icon: BookOpen, color: 'text-pink-500 bg-pink-50' },
  streak_daily: { label: 'Racha diaria', icon: Flame, color: 'text-orange-500 bg-orange-50' },
  complete_plan_task: { label: 'Tarea de plan', icon: ListTodo, color: 'text-cyan-500 bg-cyan-50' },
  complete_plan: { label: 'Plan completado', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
  rag_question: { label: 'Pregunta IA', icon: Brain, color: 'text-teal-500 bg-teal-50' },
};

function getCfg(a: string) { return ACTION_CFG[a] ?? { label: a.replace(/_/g, ' '), icon: Zap, color: 'text-gray-500 bg-[#faf9f6]' }; }

function relTime(d: string): string {
  const ms = Date.now() - new Date(d).getTime(); const m = Math.floor(ms / 60000);
  if (m < 1) return 'Ahora'; if (m < 60) return `Hace ${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `Hace ${h}h`;
  const dd = Math.floor(h / 24); if (dd < 7) return `Hace ${dd}d`;
  return new Date(d).toLocaleDateString('es', { month: 'short', day: 'numeric' });
}

const PAGE = 20;

export function XpHistoryPage() {
  const { selectedInstitution } = useAuth();
  const iid = selectedInstitution?.id;
  const [txs, setTxs] = useState<XPTransaction[]>([]);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(async (offset: number, append: boolean) => {
    if (!iid) return;
    if (append) setLoadingMore(true); else setLoading(true);
    setError(null);
    try {
      // main API: returns XPHistoryResponse {items, total, limit, offset}
      const res: XPHistoryResponse = await getXPHistory(iid, { limit: PAGE, offset });
      if (append) setTxs(prev => [...prev, ...res.items]); else setTxs(res.items);
      setHasMore(res.items.length === PAGE);
    } catch (err) { setError(err instanceof Error ? err.message : 'Error cargando historial'); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [iid]);

  useEffect(() => {
    fetchPage(0, false);
    if (iid) getProfile(iid).then(p => setProfile(p));
  }, [fetchPage, iid]);

  const xpToday = profile?.xp.today ?? 0;
  const xpWeek = profile?.xp.this_week ?? 0;
  const xpTotal = profile?.xp.total ?? 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-green-100 flex items-center justify-center"><History size={22} className="text-green-600" /></div><div><h1 className="text-xl text-gray-900" style={{ fontWeight: 800 }}>Historial de XP</h1><p className="text-[12px] text-gray-500">Tu actividad de experiencia</p></div></div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <SC label="Hoy" value={`${xpToday}`} icon={<Zap size={14} />} color="text-amber-600 bg-amber-50 border-amber-200" />
          <SC label="Esta semana" value={`${xpWeek}`} icon={<Flame size={14} />} color="text-orange-600 bg-orange-50 border-orange-200" />
          <SC label="Total" value={`${xpTotal.toLocaleString()}`} icon={<Award size={14} />} color="text-emerald-600 bg-emerald-50 border-emerald-200" />
        </div>
        {loading ? <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-green-500" /></div>
        : error ? <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl border border-red-200 text-[12px] text-red-700"><AlertTriangle size={14} />{error}</div>
        : txs.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-gray-400"><History size={32} className="opacity-30 mb-3" /><p className="text-sm">Sin actividad registrada</p></div>
        : <><div className="space-y-1.5">{txs.map((tx, i) => { const c = getCfg(tx.action); const I = c.icon; return (
          <motion.div key={tx.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.2) }} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.color}`}><I size={16} /></div>
            <div className="flex-1 min-w-0"><p className="text-[12px] text-gray-800" style={{ fontWeight: 600 }}>{c.label}</p>
              <div className="flex items-center gap-2"><span className="text-[10px] text-gray-400">{relTime(tx.created_at)}</span>
                {tx.bonus_type && <span className="text-[9px] text-amber-600 px-1.5 py-0.5 bg-amber-50 rounded-full" style={{ fontWeight: 600 }}>{tx.bonus_type}</span>}
                {tx.multiplier > 1 && <span className="text-[9px] text-teal-600 px-1.5 py-0.5 bg-teal-50 rounded-full" style={{ fontWeight: 600 }}>x{tx.multiplier}</span>}</div></div>
            <div className="text-right shrink-0"><span className="text-[13px] text-green-600 tabular-nums" style={{ fontWeight: 700 }}>+{tx.xp_final}</span>
              {tx.xp_base !== tx.xp_final && <p className="text-[9px] text-gray-400 tabular-nums">base: {tx.xp_base}</p>}</div>
          </motion.div>); })}</div>
          {hasMore && <div className="flex justify-center mt-6"><button onClick={() => fetchPage(txs.length, true)} disabled={loadingMore} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[12px] text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50" style={{ fontWeight: 600 }}>{loadingMore ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}{loadingMore ? 'Cargando...' : 'Cargar mas'}</button></div>}
        </>}
      </div>
    </div>
  );
}

function SC({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return <div className={`rounded-xl px-4 py-3 border ${color}`}><div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-[10px] uppercase tracking-wider opacity-70" style={{ fontWeight: 600 }}>{label}</span></div><p className="text-lg tabular-nums" style={{ fontWeight: 800 }}>{value} XP</p></div>;
}
