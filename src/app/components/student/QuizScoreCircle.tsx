// ============================================================
// Axon — Student Quiz: Animated Score Circle (R3 Extraction)
//
// Extracted from QuizResults.tsx — self-contained animated SVG
// showing quiz score as percentage with smooth motion animation.
//
// Reusable in QuizHistoryPanel, QuizCertificate, dashboards, etc.
// ============================================================

import { motion } from 'motion/react';

// ── Constants ───────────────────────────────────────────
const RADIUS = 84;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CX = 96;
const CY = 96;

// ── Props ───────────────────────────────────────────────

export interface QuizScoreCircleProps {
  /** Score percentage (0–100) */
  pct: number;
  /** Stroke color for the progress arc */
  color: string;
  /** Number of correct answers */
  correctCount: number;
  /** Total number of questions */
  total: number;
  /** Delay before animation starts (seconds, default 0.4) */
  entryDelay?: number;
}

// ── Component ───────────────────────────────────────────

export function QuizScoreCircle({
  pct,
  color,
  correctCount,
  total,
  entryDelay = 0.4,
}: QuizScoreCircleProps) {
  return (
    <motion.div
      className="relative w-48 h-48"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: entryDelay, type: 'spring' }}
    >
      <svg className="w-full h-full transform -rotate-90">
        {/* Background track */}
        <circle
          cx={CX} cy={CY} r={RADIUS}
          stroke="#e4e4e7" strokeWidth="12" fill="none"
        />
        {/* Animated progress arc */}
        <motion.circle
          cx={CX} cy={CY} r={RADIUS}
          stroke={color}
          strokeWidth="12" fill="none" strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - pct / 100) }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl text-zinc-900"
          style={{ fontWeight: 700 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: entryDelay + 0.4 }}
        >
          {pct.toFixed(0)}%
        </motion.span>
        <span
          className="text-xs text-zinc-400 uppercase tracking-wider mt-1"
          style={{ fontWeight: 700 }}
        >
          {correctCount}/{total}
        </span>
      </div>
    </motion.div>
  );
}
