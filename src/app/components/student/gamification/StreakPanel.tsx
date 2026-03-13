// ============================================================
// Axon — Streak Panel (with freeze indicators)
// ============================================================

import { motion, useReducedMotion } from 'motion/react';
import { Flame, Shield, AlertTriangle, Wrench } from 'lucide-react';
import type { StreakStatus } from '@/app/types/gamification';

interface StreakPanelProps {
  streak: StreakStatus | null | undefined;
  onRepair?: () => void;
  repairing?: boolean;
  compact?: boolean;
  className?: string;
}

export function StreakPanel({
  streak,
  onRepair,
  repairing,
  compact = false,
  className = '',
}: StreakPanelProps) {
  const shouldReduce = useReducedMotion();
  const current = streak?.current_streak ?? 0;
  const longest = streak?.longest_streak ?? 0;
  const freezes = streak?.freezes_available ?? 0;
  const atRisk = streak?.streak_at_risk ?? false;
  const canRepair = streak?.repair_eligible ?? false;
  const studiedToday = streak?.studied_today ?? false;

  const flameColor = current >= 30 ? '#ef4444' : current >= 7 ? '#f97316' : current > 0 ? '#fbbf24' : '#9ca3af';

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <motion.div
          animate={!shouldReduce && current > 0 ? { scale: [1, 1.12, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Flame
            className="w-5 h-5"
            style={{ color: flameColor }}
            fill={current > 0 ? flameColor : 'none'}
          />
        </motion.div>
        <span className="text-sm" style={{ color: '#111827', fontWeight: 700 }}>
          {current}
        </span>
        {atRisk && (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        )}
        {freezes > 0 && (
          <div className="flex items-center gap-0.5 text-[10px]" style={{ color: '#60a5fa' }}>
            <Shield className="w-3 h-3" />
            {freezes}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: current > 0 ? `${flameColor}15` : '#f3f4f6',
            }}
            animate={
              !shouldReduce && current > 0
                ? { scale: [1, 1.08, 1] }
                : {}
            }
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Flame
              className="w-6 h-6"
              style={{ color: flameColor }}
              fill={current > 0 ? flameColor : 'none'}
            />
          </motion.div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl" style={{ color: '#111827', fontWeight: 800 }}>
                {current}
              </span>
              <span className="text-xs" style={{ color: '#6b7280' }}>
                dia{current !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-[11px]" style={{ color: '#9ca3af' }}>
              Record: {longest} dias
            </p>
          </div>
        </div>

        {/* Freeze badges */}
        {freezes > 0 && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px]"
            style={{ backgroundColor: '#eff6ff', color: '#3b82f6', fontWeight: 600 }}
          >
            <Shield className="w-3.5 h-3.5" />
            {freezes} freeze{freezes > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Status messages */}
      {studiedToday && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px]"
          style={{ backgroundColor: '#f0fdf4', color: '#16a34a', fontWeight: 500 }}
        >
          <div className="w-2 h-2 rounded-full bg-green-500" />
          Racha segura hoy
        </div>
      )}

      {atRisk && !studiedToday && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px]"
          style={{ backgroundColor: '#fffbeb', color: '#d97706', fontWeight: 500 }}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Tu racha esta en riesgo. Estudia hoy para mantenerla.
        </div>
      )}

      {canRepair && onRepair && (
        <button
          onClick={onRepair}
          disabled={repairing}
          className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] transition-all cursor-pointer disabled:opacity-50 hover:brightness-95 active:scale-[0.98]"
          style={{
            backgroundColor: '#fef3c7',
            color: '#92400e',
            fontWeight: 600,
            border: '1px solid #fde68a',
          }}
        >
          <Wrench className="w-3.5 h-3.5" />
          {repairing ? 'Reparando...' : 'Reparar racha'}
        </button>
      )}

      {/* Week dots — only mark days covered by current streak */}
      <div className="flex justify-center gap-1.5 mt-3">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => {
          const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0
          const isToday = i === todayIdx;
          // Calculate how many days back from today this dot is
          const daysBack = todayIdx - i;
          // A day is "active" only if it falls within the current streak window
          const isActive = daysBack >= 0 && (
            (isToday && studiedToday) ||
            (daysBack > 0 && daysBack < current + (studiedToday ? 1 : 0))
          );
          const isFuture = i > todayIdx;
          return (
            <div
              key={day}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] transition-all"
              style={{
                backgroundColor: isActive ? `${flameColor}20` : '#f3f4f6',
                color: isActive ? flameColor : isFuture ? '#d1d5db' : '#9ca3af',
                fontWeight: isToday ? 700 : 500,
                border: isToday ? `2px solid ${flameColor}` : '2px solid transparent',
              }}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
