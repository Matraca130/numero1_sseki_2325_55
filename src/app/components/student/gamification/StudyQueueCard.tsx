// ============================================================
// Axon — Study Queue Card (prioritized flashcard queue)
// ============================================================

import { motion, useReducedMotion } from 'motion/react';
import { Brain, Clock, Sparkles, ArrowRight } from 'lucide-react';
import type { StudyQueueResponse, StudyQueueItem } from '@/app/types/gamification';

interface StudyQueueCardProps {
  data: StudyQueueResponse | null | undefined;
  isLoading?: boolean;
  onStartReview?: () => void;
  className?: string;
}

const COLOR_MAP: Record<string, { bg: string; text: string; label: string }> = {
  red:    { bg: '#fee2e2', text: '#dc2626', label: 'Urgente' },
  orange: { bg: '#fff7ed', text: '#ea580c', label: 'Prioridad' },
  yellow: { bg: '#fef9c3', text: '#ca8a04', label: 'Repasar' },
  green:  { bg: '#dcfce7', text: '#16a34a', label: 'Bien' },
  blue:   { bg: '#dbeafe', text: '#2563eb', label: 'Dominada' },
  gray:   { bg: '#f3f4f6', text: '#6b7280', label: 'Nueva' },
};

function estimateTime(totalDue: number): string {
  const minutes = Math.max(1, Math.round(totalDue * 0.5)); // ~30s per card
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

function QueueItem({ item, index }: { item: StudyQueueItem; index: number }) {
  const shouldReduce = useReducedMotion();
  const color = COLOR_MAP[item.mastery_color] ?? COLOR_MAP.gray;

  return (
    <motion.div
      className="flex items-center gap-2.5 py-2 px-2 rounded-xl"
      style={{ backgroundColor: index % 2 === 0 ? '#fafafa' : 'transparent' }}
      initial={shouldReduce ? {} : { opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      {/* Priority indicator */}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] shrink-0"
        style={{ backgroundColor: color.bg, color: color.text, fontWeight: 700 }}
      >
        {index + 1}
      </div>

      {/* Card preview */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] truncate" style={{ color: '#374151', fontWeight: 500 }}>
          {item.front}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-[8px] px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: color.bg, color: color.text, fontWeight: 600 }}
          >
            {color.label}
          </span>
          {item.is_new && (
            <span
              className="text-[8px] px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#ede9fe', color: '#7c3aed', fontWeight: 600 }}
            >
              Nuevo
            </span>
          )}
          {item.is_leech && (
            <span
              className="text-[8px] px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 600 }}
            >
              Leech
            </span>
          )}
        </div>
      </div>

      {/* NeedScore — human-readable priority */}
      <div className="text-right shrink-0">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: item.need_score >= 0.7 ? '#fee2e2' : item.need_score >= 0.4 ? '#fff7ed' : '#f3f4f6',
          }}
        >
          <span className="text-[8px]" style={{
            color: item.need_score >= 0.7 ? '#dc2626' : item.need_score >= 0.4 ? '#ea580c' : '#9ca3af',
            fontWeight: 700,
          }}>
            {item.need_score >= 0.7 ? '!!' : item.need_score >= 0.4 ? '!' : '-'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function StudyQueueCard({ data, isLoading, onStartReview, className = '' }: StudyQueueCardProps) {
  if (isLoading) {
    return (
      <div className={`rounded-2xl border border-gray-200 bg-white p-4 animate-pulse ${className}`}>
        <div className="h-4 w-36 bg-gray-200 rounded mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="w-6 h-6 rounded-full bg-gray-200" />
            <div className="flex-1 h-3 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const queue = data?.queue ?? [];
  const meta = data?.meta;

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: '#2a8c7a' }} />
          <h3 className="text-sm" style={{ color: '#111827', fontWeight: 700 }}>
            Cola de Estudio
          </h3>
        </div>
        {meta && meta.total_due > 0 && (
          <div className="flex items-center gap-2 text-[10px]" style={{ color: '#9ca3af' }}>
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {estimateTime(meta.total_due)}
            </span>
            <span className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#f3f4f6' }}>
              {meta.total_due} cards
            </span>
          </div>
        )}
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-6">
          <Brain className="w-8 h-8 mx-auto mb-2" style={{ color: '#d1d5db' }} />
          <p className="text-xs" style={{ color: '#9ca3af' }}>
            No hay flashcards pendientes
          </p>
          <p className="text-[10px] mt-1" style={{ color: '#d1d5db' }}>
            Todas las cards estan al dia
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-0.5 mb-3">
            {queue.slice(0, 5).map((item, i) => (
              <QueueItem key={item.flashcard_id} item={item} index={i} />
            ))}
          </div>

          {meta && meta.total_in_queue > 5 && (
            <p className="text-[10px] text-center mb-3" style={{ color: '#9ca3af' }}>
              +{meta.total_in_queue - 5} mas en la cola
            </p>
          )}

          {onStartReview && (
            <button
              onClick={onStartReview}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs transition-all cursor-pointer hover:opacity-90 hover:shadow-md active:scale-[0.98]"
              style={{
                backgroundColor: '#2a8c7a',
                color: '#ffffff',
                fontWeight: 600,
              }}
            >
              <Brain className="w-4 h-4" />
              Comenzar Revision
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
