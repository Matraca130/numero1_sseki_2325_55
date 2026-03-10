import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { MASTERY_HEX_SCALE } from './mastery-colors';

export interface MasteryRingProps {
  value?: number;
  pct?: number;
  size?: number;
  stroke?: number;
  color?: string;
  colorClass?: string;
}

export function MasteryRing({ value, pct, size = 44, stroke = 3.5, color = MASTERY_HEX_SCALE[0], colorClass }: MasteryRingProps) {
  const shouldReduce = useReducedMotion();
  const normalized = value !== undefined ? value : pct !== undefined ? pct / 100 : 0;
  const clamped = Math.max(0, Math.min(1, normalized));
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const strokeColor = colorClass ? 'currentColor' : clamped >= 1 ? '#10b981' : color;

  return (
    <div className={`relative ${colorClass || ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e4e4e7" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={strokeColor} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ}
          initial={shouldReduce ? { strokeDashoffset: circ * (1 - clamped) } : { strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - clamped) }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {clamped >= 1 ? (
          <motion.div initial={shouldReduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.8 }}>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </motion.div>
        ) : (
          <span className="text-[10px] text-zinc-600" style={{ fontWeight: 700 }}>{Math.round(clamped * 100)}%</span>
        )}
      </div>
    </div>
  );
}
