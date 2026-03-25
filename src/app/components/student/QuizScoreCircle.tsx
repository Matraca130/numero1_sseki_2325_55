// ============================================================
// Axon — Student: QuizScoreCircle (R13)
//
// Extracted animated score circle from QuizResults.
// Shows percentage + count with animated SVG ring.
// P-PERF: React.memo to prevent re-render when parent state changes.
// ============================================================

import React, { memo, useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface QuizScoreCircleProps {
  correctCount: number;
  totalCount: number;
  percentage: number;
  color: string;
}

export const QuizScoreCircle = memo(function QuizScoreCircle({
  correctCount,
  totalCount,
  percentage,
  color,
}: QuizScoreCircleProps) {
  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const gradientId = useId();
  const shouldReduce = useReducedMotion();
  const target = circumference * (1 - percentage / 100);

  return (
    <motion.div
      className="relative w-48 h-48"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.4, type: 'spring' }}
    >
      <svg className="w-full h-full transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2dd4a8" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
        <circle
          cx="96"
          cy="96"
          r={radius}
          stroke="#e4e4e7"
          strokeWidth="12"
          fill="none"
        />
        <motion.circle
          cx="96"
          cy="96"
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={shouldReduce ? { strokeDashoffset: target } : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: target }}
          transition={{ duration: shouldReduce ? 0 : 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl text-zinc-900"
          style={{ fontWeight: 700 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {percentage.toFixed(0)}%
        </motion.span>
        <span className="text-xs text-axon-ring-label uppercase tracking-wider mt-1" style={{ fontWeight: 700 }}>
          {correctCount}/{totalCount}
        </span>
      </div>
    </motion.div>
  );
});
