// ============================================================
// Axon v4.4 — Streak Counter (Premium)
//
// Sprint G1→G3 AUDIT: Premium upgrade with:
//   - Gradient backgrounds per state instead of flat colors
//   - Refined pulse animation for at_risk (not jarring)
//   - Subtle particle-like flame glow on active streaks
//   - Micro-animation on state transitions
//   - Accessibility: aria-labels on all states
//
// States:
//   1. studied_today=true     → Green (safe)
//   2. streak_at_risk=true    → Red pulse (danger!)
//   3. repair_eligible=true   → Yellow wrench (repairable)
//   4. freezes_available > 0  → Blue snowflake (protected)
//   5. current_streak=0       → Gray (no streak)
//   6. Normal                 → Orange flame (active)
//
// Props:
//   streak   — StreakStatus from backend
//   compact  — If true, inline mini version for header
// ============================================================

import React from 'react';
import { Flame, Snowflake, AlertTriangle, Shield, Wrench } from 'lucide-react';
import type { StreakStatus } from '@/app/types/gamification';
import { motion, AnimatePresence } from 'motion/react';

interface StreakCounterProps {
  streak: StreakStatus;
  compact?: boolean;
}

type StreakVisualState =
  | 'studied_today'
  | 'at_risk'
  | 'repair_eligible'
  | 'freeze_protected'
  | 'no_streak'
  | 'active';

function resolveVisualState(s: StreakStatus): StreakVisualState {
  if (s.current_streak === 0 && !s.repair_eligible) return 'no_streak';
  if (s.studied_today) return 'studied_today';
  if (s.streak_at_risk) return 'at_risk';
  if (s.repair_eligible) return 'repair_eligible';
  if (s.freezes_available > 0 && !s.studied_today) return 'freeze_protected';
  return 'active';
}

interface StateConfig {
  icon: React.ElementType;
  color: string;
  bgGradient: string;
  borderColor: string;
  label: string;
  ariaLabel: string;
  pulse?: boolean;
}

const STATE_CONFIG: Record<StreakVisualState, StateConfig> = {
  studied_today: {
    icon: Flame,
    color: '#16a34a',
    bgGradient: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    borderColor: '#86efac',
    label: 'Racha segura',
    ariaLabel: 'Racha segura, ya estudiaste hoy',
  },
  at_risk: {
    icon: AlertTriangle,
    color: '#dc2626',
    bgGradient: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
    borderColor: '#fca5a5',
    label: 'En riesgo!',
    ariaLabel: 'Tu racha esta en riesgo, estudia hoy para no perderla',
    pulse: true,
  },
  repair_eligible: {
    icon: Wrench,
    color: '#ca8a04',
    bgGradient: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)',
    borderColor: '#fde047',
    label: 'Reparable',
    ariaLabel: 'Racha perdida pero puedes repararla dentro de 48 horas',
  },
  freeze_protected: {
    icon: Snowflake,
    color: '#2563eb',
    bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    borderColor: '#93c5fd',
    label: 'Protegida',
    ariaLabel: 'Racha protegida por streak freeze',
  },
  no_streak: {
    icon: Flame,
    color: '#9ca3af',
    bgGradient: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
    borderColor: '#e5e7eb',
    label: 'Sin racha',
    ariaLabel: 'No tienes una racha activa, empieza a estudiar',
  },
  active: {
    icon: Flame,
    color: '#ea580c',
    bgGradient: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
    borderColor: '#fdba74',
    label: 'Racha activa',
    ariaLabel: 'Tienes una racha activa',
  },
};

export const StreakCounter = React.memo(function StreakCounter({
  streak,
  compact = false,
}: StreakCounterProps) {
  const state = resolveVisualState(streak);
  const config = STATE_CONFIG[state];
  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
        style={{
          background: config.bgGradient,
          border: `1px solid ${config.borderColor}`,
        }}
        title={config.label}
        aria-label={config.ariaLabel}
        role="status"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: config.pulse ? [1, 1.15, 1] : 1,
              opacity: 1,
            }}
            transition={
              config.pulse
                ? { scale: { repeat: Infinity, duration: 2, ease: 'easeInOut' } }
                : { duration: 0.3 }
            }
          >
            <Icon size={13} style={{ color: config.color }} />
          </motion.div>
        </AnimatePresence>
        <span
          className="text-[11px] tabular-nums"
          style={{ color: config.color, fontWeight: 700 }}
        >
          {streak.current_streak}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5" role="status" aria-label={config.ariaLabel}>
      {/* Main counter */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{
            background: config.bgGradient,
            border: `1px solid ${config.borderColor}`,
            boxShadow: config.pulse ? `0 0 8px ${config.color}20` : 'none',
          }}
        >
          <motion.div
            animate={
              config.pulse
                ? { scale: [1, 1.12, 1] }
                : {}
            }
            transition={
              config.pulse
                ? { repeat: Infinity, duration: 2, ease: 'easeInOut' }
                : {}
            }
          >
            <Icon size={16} style={{ color: config.color }} />
          </motion.div>
        </div>
        <div className="flex flex-col">
          <span className="text-sm tabular-nums" style={{ fontWeight: 700, color: config.color }}>
            {streak.current_streak} {streak.current_streak === 1 ? 'dia' : 'dias'}
          </span>
          <span className="text-[10px] text-gray-500" style={{ fontWeight: 500 }}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Freeze indicator */}
      {streak.freezes_available > 0 && state !== 'freeze_protected' && (
        <div className="flex items-center gap-1 text-[10px] text-blue-500">
          <Shield size={10} />
          <span>
            {streak.freezes_available} freeze{streak.freezes_available > 1 ? 's' : ''} disponible{streak.freezes_available > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Longest streak */}
      {streak.longest_streak > streak.current_streak && (
        <span className="text-[10px] text-gray-400">
          Mejor racha: {streak.longest_streak} dias
        </span>
      )}
    </div>
  );
});
