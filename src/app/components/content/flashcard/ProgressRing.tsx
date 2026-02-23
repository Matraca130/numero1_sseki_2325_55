import React from 'react';
import { motion } from 'motion/react';

export function ProgressRing({ pct, size = 44, stroke = 4, color }: { pct: number; size?: number; stroke?: number; color: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size/2} cy={size/2} r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          className={color}
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-gray-700">{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}
