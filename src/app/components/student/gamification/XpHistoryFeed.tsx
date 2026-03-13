// ============================================================
// Axon — XpHistoryFeed (Gamification Dashboard)
// Day-grouped list of XP transactions with icons per action.
// ============================================================

import { useMemo } from 'react';
import {
  Zap,
  Brain,
  BookOpen,
  Video,
  Flame,
  Target,
  CheckCircle,
  HelpCircle,
  History,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { XPTransaction } from '@/app/services/gamificationApi';

interface XpHistoryFeedProps {
  transactions: XPTransaction[];
  isLoading: boolean;
  maxItems?: number;
}

const actionConfig: Record<string, { icon: typeof Zap; color: string; label: string }> = {
  review_flashcard: { icon: Brain, color: '#0d9488', label: 'Flashcard revisada' },
  review_correct:   { icon: Brain, color: '#16a34a', label: 'Flashcard correcta' },
  quiz_answer:      { icon: Target, color: '#6366f1', label: 'Respuesta de quiz' },
  quiz_correct:     { icon: CheckCircle, color: '#16a34a', label: 'Quiz correcto' },
  complete_session: { icon: Zap, color: '#f59e0b', label: 'Sesion completada' },
  complete_reading: { icon: BookOpen, color: '#3b82f6', label: 'Lectura completada' },
  complete_video:   { icon: Video, color: '#8b5cf6', label: 'Video completado' },
  streak_daily:     { icon: Flame, color: '#f97316', label: 'Bonus de racha' },
  complete_plan_task: { icon: CheckCircle, color: '#0d9488', label: 'Tarea del plan' },
  complete_plan:    { icon: Target, color: '#f59e0b', label: 'Plan completado' },
  rag_question:     { icon: HelpCircle, color: '#6366f1', label: 'Pregunta AI' },
};

function formatDay(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const d = date.toISOString().slice(0, 10);
  const t = today.toISOString().slice(0, 10);
  const y = yesterday.toISOString().slice(0, 10);

  if (d === t) return 'Hoy';
  if (d === y) return 'Ayer';

  return date.toLocaleDateString('es', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function XpHistoryFeed({ transactions, isLoading, maxItems = 30 }: XpHistoryFeedProps) {
  const shouldReduce = useReducedMotion();

  const grouped = useMemo(() => {
    const sliced = transactions.slice(0, maxItems);
    const groups: { day: string; items: XPTransaction[] }[] = [];
    const dayMap = new Map<string, XPTransaction[]>();

    for (const tx of sliced) {
      const dayKey = tx.created_at.slice(0, 10);
      if (!dayMap.has(dayKey)) dayMap.set(dayKey, []);
      dayMap.get(dayKey)!.push(tx);
    }

    for (const [day, items] of dayMap) {
      groups.push({ day, items });
    }

    return groups;
  }, [transactions, maxItems]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse" />
              <div className="flex-1">
                <div className="h-3 w-28 bg-gray-100 rounded animate-pulse mb-1" />
                <div className="h-2 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="w-10 h-3 bg-gray-100 rounded animate-pulse" />
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
      transition={{ delay: 0.25 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: '#ecfdf5' }}
        >
          <History className="w-4 h-4" style={{ color: '#0d9488' }} />
        </div>
        <h3 className="text-sm" style={{ color: '#111827', fontWeight: 700 }}>
          Historial de XP
        </h3>
        {transactions.length > 0 && (
          <span className="ml-auto text-[10px]" style={{ color: '#9ca3af' }}>
            {transactions.length} eventos
          </span>
        )}
      </div>

      {/* Content */}
      {grouped.length === 0 ? (
        <div className="text-center py-6">
          <History className="w-6 h-6 mx-auto mb-1.5" style={{ color: '#d1d5db' }} />
          <p className="text-[11px]" style={{ color: '#9ca3af' }}>
            Tu historial de XP aparecera aqui
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(group => {
            const dayXP = group.items.reduce((s, tx) => s + tx.xp_final, 0);
            return (
              <div key={group.day}>
                {/* Day header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px]" style={{ color: '#6b7280', fontWeight: 600 }}>
                    {formatDay(group.items[0].created_at)}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: '#f0fdf4', color: '#16a34a', fontWeight: 700 }}
                  >
                    +{dayXP} XP
                  </span>
                </div>

                {/* Transactions */}
                <div className="space-y-1.5">
                  {group.items.map((tx, idx) => {
                    const config = actionConfig[tx.action] ?? {
                      icon: Zap,
                      color: '#6b7280',
                      label: tx.action.replace(/_/g, ' '),
                    };
                    const Icon = config.icon;

                    return (
                      <motion.div
                        key={tx.id}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                        initial={shouldReduce ? {} : { opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.02 * idx }}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${config.color}15` }}
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] truncate" style={{ color: '#374151', fontWeight: 500 }}>
                            {config.label}
                          </p>
                          <p className="text-[9px]" style={{ color: '#d1d5db' }}>
                            {formatTime(tx.created_at)}
                            {tx.multiplier > 1 && (
                              <span style={{ color: '#f59e0b' }}> x{tx.multiplier}</span>
                            )}
                          </p>
                        </div>
                        <span className="text-[11px] shrink-0" style={{ color: config.color, fontWeight: 700 }}>
                          +{tx.xp_final}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default XpHistoryFeed;
