// ============================================================
// Axon v4.4 — XP History Timeline (Premium)
// Sprint G2→G3: Day grouping, bonus tags, multiplier display,
// load-more pagination, relative timestamps.
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { History, BookOpen, Brain, CheckCircle, Clock, Flame, MessageCircle, PlayCircle, Repeat, Sparkles, Target, Zap, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/app/context/AuthContext';
import { getXpHistory } from '@/app/services/gamificationApi';
import type { XpTransaction } from '@/app/types/gamification';

interface XpHistoryTimelineProps { pageSize?: number; }

interface ActionStyle { icon: LucideIcon; label: string; color: string; bg: string; }
const AC: Record<string, ActionStyle> = {
  review_flashcard: { icon: Repeat, label: 'Flashcard revisada', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
  review_correct: { icon: CheckCircle, label: 'Flashcard correcta', color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
  quiz_answer: { icon: Brain, label: 'Pregunta de quiz', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  quiz_correct: { icon: CheckCircle, label: 'Quiz correcto', color: '#16a34a', bg: 'rgba(22,163,74,0.08)' },
  complete_session: { icon: Clock, label: 'Sesion completada', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  complete_reading: { icon: BookOpen, label: 'Lectura completada', color: '#06b6d4', bg: 'rgba(6,182,212,0.08)' },
  complete_video: { icon: PlayCircle, label: 'Video completado', color: '#ec4899', bg: 'rgba(236,72,153,0.08)' },
  streak_daily: { icon: Flame, label: 'Racha diaria', color: '#ea580c', bg: 'rgba(234,88,12,0.08)' },
  complete_plan_task: { icon: Target, label: 'Tarea de plan', color: '#14b8a6', bg: 'rgba(20,184,166,0.08)' },
  complete_plan: { icon: Zap, label: 'Plan completado', color: '#eab308', bg: 'rgba(234,179,8,0.08)' },
  rag_question: { icon: MessageCircle, label: 'Pregunta IA', color: '#a855f7', bg: 'rgba(168,85,247,0.08)' },
  streak_freeze_buy: { icon: Sparkles, label: 'Streak freeze', color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
  streak_repair: { icon: Flame, label: 'Reparacion racha', color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
};

const BL: Record<string, string> = { on_time: 'A tiempo', flow_zone: 'Zona flow', variable: 'Suerte!', streak: 'Racha 7+' };
function fmtBonus(b: string) { return b.split('+').map((s) => BL[s.trim()] ?? s.trim()).join(' + '); }

function getDayKey(d: string): string {
  const date = new Date(d); const today = new Date(); const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
}
function relTime(d: string): string {
  const ms = Date.now() - new Date(d).getTime(); const m = Math.floor(ms / 60000); const h = Math.floor(ms / 3600000);
  if (m < 1) return 'ahora'; if (m < 60) return `hace ${m}m`; if (h < 24) return `hace ${h}h`;
  return new Date(d).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export const XpHistoryTimeline = React.memo(function XpHistoryTimeline({ pageSize = 15 }: XpHistoryTimelineProps) {
  const { selectedInstitution } = useAuth();
  const iid = selectedInstitution?.id ?? null;
  const [txs, setTxs] = useState<XpTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetch_ = useCallback(async (offset = 0, append = false) => {
    if (!iid) return;
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const items = await getXpHistory(iid, { limit: pageSize, offset });
      if (append) setTxs((p) => [...p, ...items]); else setTxs(items);
      setHasMore(items.length === pageSize);
    } catch { if (!append) setTxs([]); setHasMore(false); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [iid, pageSize]);

  useEffect(() => { fetch_(0, false); }, [fetch_]);
  const loadMore = () => { if (!loadingMore && hasMore) fetch_(txs.length, true); };

  const grouped = useMemo(() => {
    const g: { day: string; items: XpTransaction[] }[] = []; let cd = '';
    for (const tx of txs) { const day = getDayKey(tx.created_at); if (day !== cd) { cd = day; g.push({ day, items: [] }); } g[g.length - 1].items.push(tx); }
    return g;
  }, [txs]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)', border: '1px solid #e5e7eb' }}>
          <History size={14} className="text-gray-500" />
        </div>
        <span className="text-sm text-gray-800" style={{ fontWeight: 700 }}>Historial de XP</span>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: '#f9fafb' }} />)}</div>
      ) : txs.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #f9fafb 0%, #f3f4f6 100%)', border: '1px solid #e5e7eb' }}><History size={24} className="text-gray-300" /></div>
          <p className="text-xs text-gray-400" style={{ fontWeight: 500 }}>Sin actividad de XP aun</p>
        </div>
      ) : (
        <div role="feed" aria-label="Historial de XP">
          <AnimatePresence mode="popLayout">
            {grouped.map((group) => (
              <div key={group.day} className="mb-3">
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <span className="text-[10px] text-gray-400" style={{ fontWeight: 600 }}>{group.day}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="space-y-0.5">
                  {group.items.map((tx, idx) => {
                    const cfg = AC[tx.action] ?? { icon: Zap, label: tx.action.replace(/_/g, ' '), color: '#6b7280', bg: 'rgba(107,114,128,0.08)' };
                    const Icon = cfg.icon; const neg = tx.xp_final < 0;
                    return (
                      <motion.div key={tx.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50/80 transition-colors"
                        role="article" aria-label={`${cfg.label}: ${neg ? '' : '+'}${tx.xp_final} XP`}>
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" style={{ background: cfg.bg }}><Icon size={14} style={{ color: cfg.color }} /></div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-gray-700 block truncate" style={{ fontWeight: 500 }}>{cfg.label}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-gray-400">{relTime(tx.created_at)}</span>
                            {tx.bonus_type && <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid #fde68a', color: '#92400e', fontWeight: 600 }}>{fmtBonus(tx.bonus_type)}</span>}
                            {tx.multiplier > 1 && <span className="text-[8px] px-1 py-0.5 rounded-full bg-purple-50 text-purple-600" style={{ fontWeight: 600, border: '1px solid #e9d5ff' }}>x{tx.multiplier.toFixed(1)}</span>}
                          </div>
                        </div>
                        <span className="text-xs tabular-nums shrink-0" style={{ fontWeight: 700, color: neg ? '#dc2626' : '#16a34a' }}>{neg ? '' : '+'}{tx.xp_final}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </AnimatePresence>
          {hasMore && (
            <motion.button onClick={loadMore} disabled={loadingMore}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 mt-1 text-[11px] text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} style={{ fontWeight: 500 }}>
              {loadingMore ? <span className="text-gray-400">Cargando...</span> : <><ChevronDown size={12} /><span>Cargar mas</span></>}
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
});
