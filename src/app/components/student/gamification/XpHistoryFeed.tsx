// ============================================================
// Axon — XP History Feed (transaction log)
// Premium: grouped by day with daily totals
// ============================================================

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Zap, Brain, FileText, Video, Flame, Target, MessageSquare, ClipboardCheck, CheckCircle2, Award, Shield, Wrench, Gift, Calendar } from 'lucide-react';
import type { XPTransaction } from '@/app/types/gamification';

interface XpHistoryFeedProps {
  transactions: XPTransaction[] | undefined;
  isLoading?: boolean;
  maxItems?: number;
  className?: string;
}

const ACTION_CONFIG: Record<string, { icon: typeof Zap; label: string; color: string; bg: string }> = {
  review_flashcard: { icon: Brain, label: 'Flashcard revisada', color: '#d97706', bg: '#fef3c7' },
  review_correct: { icon: Brain, label: 'Flashcard correcta', color: '#16a34a', bg: '#dcfce7' },
  quiz_answer: { icon: Zap, label: 'Quiz respondido', color: '#7c3aed', bg: '#ede9fe' },
  quiz_correct: { icon: Zap, label: 'Quiz correcto', color: '#059669', bg: '#d1fae5' },
  complete_session: { icon: CheckCircle2, label: 'Sesion completada', color: '#2563eb', bg: '#dbeafe' },
  complete_reading: { icon: FileText, label: 'Lectura completada', color: '#0d9488', bg: '#ccfbf1' },
  complete_video: { icon: Video, label: 'Video completado', color: '#7c3aed', bg: '#ede9fe' },
  streak_daily: { icon: Flame, label: 'Bonus racha diaria', color: '#f97316', bg: '#fff7ed' },
  complete_plan_task: { icon: ClipboardCheck, label: 'Tarea de plan completada', color: '#2a8c7a', bg: '#ccfbf1' },
  complete_plan: { icon: Target, label: 'Plan de estudio completado', color: '#dc2626', bg: '#fee2e2' },
  rag_question: { icon: MessageSquare, label: 'Pregunta al AI', color: '#6366f1', bg: '#eef2ff' },
  streak_freeze_buy: { icon: Shield, label: 'Streak freeze comprado', color: '#3b82f6', bg: '#dbeafe' },
  streak_repair: { icon: Wrench, label: 'Racha reparada', color: '#d97706', bg: '#fef3c7' },
};

const FALLBACK_CONFIG = { icon: Gift, label: 'Bonus', color: '#8b5cf6', bg: '#ede9fe' };

function getActionConfig(action: string) {
  if (ACTION_CONFIG[action]) return ACTION_CONFIG[action];
  if (action.startsWith('badge_')) return { icon: Award, label: 'Insignia obtenida', color: '#a78bfa', bg: '#ede9fe' };
  if (action.startsWith('goal_')) return { icon: Target, label: 'Meta completada', color: '#16a34a', bg: '#dcfce7' };
  return FALLBACK_CONFIG;
}

function getDayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const txDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - txDay.getTime()) / 86400000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return d.toLocaleDateString('es', { weekday: 'long' });
  return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

interface DayGroup {
  key: string;
  label: string;
  items: XPTransaction[];
  totalXp: number;
}

function BonusBadge({ bonusType }: { bonusType: string }) {
  const parts = bonusType.split('+');
  const labels: Record<string, string> = {
    on_time: 'A tiempo',
    flow_zone: 'Flow',
    variable: 'Suerte x2',
    streak: 'Racha 7+',
  };

  return (
    <div className="flex gap-1 flex-wrap">
      {parts.map(part => (
        <span
          key={part}
          className="text-[8px] px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 600 }}
        >
          {labels[part] ?? part}
        </span>
      ))}
    </div>
  );
}

export function XpHistoryFeed({ transactions, isLoading, maxItems = 30, className = '' }: XpHistoryFeedProps) {
  const shouldReduce = useReducedMotion();

  const dayGroups = useMemo<DayGroup[]>(() => {
    const items = (transactions ?? []).slice(0, maxItems);
    const groups: DayGroup[] = [];
    let currentKey = '';
    let currentGroup: DayGroup | null = null;
    for (const tx of items) {
      const key = getDayKey(tx.created_at);
      if (key !== currentKey) {
        currentKey = key;
        currentGroup = { key, label: getDayLabel(tx.created_at), items: [], totalXp: 0 };
        groups.push(currentGroup);
      }
      currentGroup!.items.push(tx);
      currentGroup!.totalXp += tx.xp_final;
    }
    return groups;
  }, [transactions, maxItems]);

  if (isLoading) {
    return (
      <div className={`rounded-2xl border border-gray-200 bg-white p-4 animate-pulse ${className}`}>
        <div className="h-4 w-28 bg-gray-200 rounded mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="w-8 h-8 rounded-lg bg-gray-200" />
            <div className="flex-1 h-3 bg-gray-200 rounded" />
            <div className="w-12 h-3 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Pre-compute group offsets to avoid O(n^2) globalIdx recalculation
  const groupOffsets = dayGroups.reduce<number[]>((acc, g) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : 0;
    const prevItems = acc.length > 0 ? dayGroups[acc.length - 1].items.length : 0;
    acc.push(acc.length === 0 ? 0 : prev + prevItems);
    return acc;
  }, []);

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4" style={{ color: '#2a8c7a' }} />
        <h3 className="text-sm" style={{ color: '#111827', fontWeight: 700 }}>
          Historial XP
        </h3>
      </div>

      {dayGroups.length === 0 ? (
        <div className="text-center py-6">
          <Zap className="w-8 h-8 mx-auto mb-2" style={{ color: '#d1d5db' }} />
          <p className="text-xs" style={{ color: '#9ca3af' }}>
            Tu historial de XP aparecera aqui
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {dayGroups.map((group, gi) => (
            <div key={group.key}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" style={{ color: '#9ca3af' }} />
                  <span className="text-[11px]" style={{ color: '#6b7280', fontWeight: 600 }}>
                    {group.label}
                  </span>
                </div>
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#f0fdf4', color: '#16a34a', fontWeight: 700 }}
                >
                  +{group.totalXp} XP
                </span>
              </div>

              <div className="divide-y divide-gray-50 ml-1 border-l-2 border-gray-100 pl-3">
                {group.items.map((tx, i) => {
                  const config = getActionConfig(tx.action);
                  const Icon = config.icon;
                  const hasBonus = tx.multiplier > 1;
                  const globalIdx = groupOffsets[gi] + i;

                  return (
                    <motion.div
                      key={tx.id}
                      className="flex items-center gap-3 py-2"
                      initial={shouldReduce ? {} : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: globalIdx * 0.02 }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: config.bg }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] truncate" style={{ color: '#374151', fontWeight: 500 }}>
                          {config.label}
                        </p>
                        {tx.bonus_type && <BonusBadge bonusType={tx.bonus_type} />}
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className="text-xs"
                          style={{
                            color: hasBonus ? '#f59e0b' : '#2a8c7a',
                            fontWeight: 700,
                          }}
                        >
                          +{tx.xp_final}
                          {hasBonus && (
                            <span className="text-[8px] ml-0.5">x{tx.multiplier.toFixed(1)}</span>
                          )}
                        </p>
                        <p className="text-[9px]" style={{ color: '#d1d5db' }}>
                          {formatTime(tx.created_at)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
