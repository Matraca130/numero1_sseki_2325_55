// ============================================================
// Axon — StreakPanel (Gamification Dashboard)
// Shows current streak status with repair option.
// ============================================================

import { Flame, Shield, AlertTriangle, Wrench } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { StreakStatus } from '@/app/services/gamificationApi';

interface StreakPanelProps {
  streak: StreakStatus | null | undefined;
  onRepair: () => void;
  repairing: boolean;
}

export function StreakPanel({ streak, onRepair, repairing }: StreakPanelProps) {
  const shouldReduce = useReducedMotion();
  const current = streak?.current_streak ?? 0;
  const longest = streak?.longest_streak ?? 0;
  const atRisk = streak?.streak_at_risk ?? false;
  const canRepair = streak?.repair_eligible ?? false;
  const freezes = streak?.freezes_available ?? 0;
  const studiedToday = streak?.studied_today ?? false;

  const borderColor = atRisk ? '#fbbf24' : studiedToday ? '#22c55e' : '#e5e7eb';

  return (
    <motion.div
      className="rounded-2xl border bg-white p-5"
      style={{ borderColor }}
      initial={shouldReduce ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: atRisk ? '#fef3c7' : '#fff7ed' }}
        >
          <Flame className="w-4 h-4" style={{ color: atRisk ? '#f59e0b' : '#f97316' }} />
        </div>
        <div>
          <h3 className="text-sm" style={{ color: '#111827', fontWeight: 700 }}>
            Racha
          </h3>
          {atRisk && (
            <span className="text-[10px] flex items-center gap-1" style={{ color: '#f59e0b' }}>
              <AlertTriangle className="w-3 h-3" />
              En riesgo
            </span>
          )}
        </div>
      </div>

      {/* Streak number */}
      <div className="text-center mb-4">
        <motion.span
          className="text-4xl inline-block"
          style={{ color: '#111827', fontWeight: 900 }}
          animate={
            !shouldReduce && current > 0
              ? { scale: [1, 1.05, 1] }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {current}
        </motion.span>
        <p className="text-[11px]" style={{ color: '#6b7280' }}>
          {current === 1 ? 'dia seguido' : 'dias seguidos'}
        </p>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-[11px] mb-3 px-1">
        <div className="flex items-center gap-1" style={{ color: '#6b7280' }}>
          <Flame className="w-3 h-3" style={{ color: '#ef4444' }} />
          Record: {longest}d
        </div>
        <div className="flex items-center gap-1" style={{ color: '#6b7280' }}>
          <Shield className="w-3 h-3" style={{ color: '#3b82f6' }} />
          Freezes: {freezes}
        </div>
      </div>

      {/* Status indicator */}
      {studiedToday && (
        <div
          className="text-center text-[11px] py-1.5 rounded-lg mb-2"
          style={{ backgroundColor: '#f0fdf4', color: '#16a34a', fontWeight: 600 }}
        >
          Ya estudiaste hoy
        </div>
      )}

      {/* Repair button */}
      {canRepair && atRisk && (
        <button
          onClick={onRepair}
          disabled={repairing}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] cursor-pointer transition-colors"
          style={{
            backgroundColor: repairing ? '#e5e7eb' : '#fef3c7',
            color: repairing ? '#9ca3af' : '#92400e',
            fontWeight: 600,
          }}
        >
          <Wrench className="w-3 h-3" />
          {repairing ? 'Reparando...' : 'Reparar racha'}
        </button>
      )}
    </motion.div>
  );
}

export default StreakPanel;
