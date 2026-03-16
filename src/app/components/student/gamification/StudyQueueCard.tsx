// ============================================================
// Axon — StudyQueueCard (Gamification Dashboard)
// Compact card showing study queue status with start review CTA.
// ============================================================

import { Brain, Clock, Sparkles, ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { StudyQueueResponse } from '@/app/types/gamification';

interface StudyQueueCardProps {
  data: StudyQueueResponse | null | undefined;
  isLoading: boolean;
  onStartReview: () => void;
}

export function StudyQueueCard({ data, isLoading, onStartReview }: StudyQueueCardProps) {
  const shouldReduce = useReducedMotion();
  const totalDue = data?.meta?.total_due ?? 0;
  const totalNew = data?.meta?.total_new ?? 0;
  const totalInQueue = data?.meta?.total_in_queue ?? 0;
  const hasDue = totalDue > 0 || totalNew > 0;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="rounded-2xl border bg-white p-5"
      style={{ borderColor: hasDue ? '#bfdbfe' : '#e5e7eb' }}
      initial={shouldReduce ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: hasDue ? '#eff6ff' : '#f3f4f6' }}
        >
          <Brain className="w-4 h-4" style={{ color: hasDue ? '#3b82f6' : '#9ca3af' }} />
        </div>
        <div>
          <h3 className="text-sm" style={{ color: '#111827', fontWeight: 700 }}>
            Cola de Repaso
          </h3>
          {hasDue && (
            <span className="text-[10px]" style={{ color: '#3b82f6' }}>
              Tienes cards pendientes
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#f0fdf4' }}>
          <p className="text-lg" style={{ color: '#16a34a', fontWeight: 800 }}>
            {totalDue}
          </p>
          <p className="text-[9px]" style={{ color: '#6b7280' }}>Pendientes</p>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#eff6ff' }}>
          <p className="text-lg" style={{ color: '#3b82f6', fontWeight: 800 }}>
            {totalNew}
          </p>
          <p className="text-[9px]" style={{ color: '#6b7280' }}>Nuevas</p>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
          <p className="text-lg" style={{ color: '#6b7280', fontWeight: 800 }}>
            {totalInQueue}
          </p>
          <p className="text-[9px]" style={{ color: '#6b7280' }}>En cola</p>
        </div>
      </div>

      {/* CTA Button */}
      {hasDue ? (
        <button
          onClick={onStartReview}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] cursor-pointer transition-all hover:opacity-90 active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #2a8c7a, #0d9488)',
            color: '#ffffff',
            fontWeight: 700,
          }}
        >
          <Sparkles className="w-4 h-4" />
          Comenzar repaso
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="text-center py-2">
          <div className="flex items-center justify-center gap-1.5 text-[11px]" style={{ color: '#9ca3af' }}>
            <Clock className="w-3.5 h-3.5" />
            No hay cards pendientes ahora
          </div>
          <p className="text-[9px] mt-1" style={{ color: '#d1d5db' }}>
            Vuelve mas tarde o estudia nuevo contenido
          </p>
        </div>
      )}
    </motion.div>
  );
}

export default StudyQueueCard;
