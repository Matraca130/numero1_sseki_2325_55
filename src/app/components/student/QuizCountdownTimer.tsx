// ============================================================
// Axon — Student Quiz: Countdown Timer (P7 Feature)
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';

interface QuizCountdownTimerProps {
  timeLimitSec: number;
  resetKey: number;
  onTimeout: () => void;
  paused?: boolean;
  compact?: boolean;
}

export const QuizCountdownTimer = React.memo(function QuizCountdownTimer({
  timeLimitSec, resetKey, onTimeout, paused = false, compact = false,
}: QuizCountdownTimerProps) {
  const [remaining, setRemaining] = useState(timeLimitSec);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;
  const hasFiredRef = useRef(false);

  useEffect(() => { setRemaining(timeLimitSec); hasFiredRef.current = false; }, [resetKey, timeLimitSec]);

  useEffect(() => {
    // Deps intentionally exclude `remaining`: including it would tear down
    // and recreate the interval on every tick, causing timer drift. The
    // functional updater already reads the latest value from closure, and
    // the zero-guard lives inside the updater so no effect re-run is needed.
    if (paused) return;
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 0) return 0;
        const next = prev - 1;
        if (next === 0 && !hasFiredRef.current) {
          hasFiredRef.current = true;
          setTimeout(() => onTimeoutRef.current(), 0);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [paused]);

  const pct = timeLimitSec > 0 ? remaining / timeLimitSec : 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const size = compact ? 36 : 44;
  const strokeWidth = compact ? 3 : 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);
  const color = pct > 0.5 ? '#0d9488' : pct > 0.25 ? '#f59e0b' : '#ef4444';
  const isUrgent = pct <= 0.25 && remaining > 0;

  return (
    <motion.div className={clsx('relative flex items-center justify-center', isUrgent && 'animate-pulse')} style={{ width: size, height: size }} title={`${mins}:${String(secs).padStart(2, '0')} restantes`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e4e4e7" strokeWidth={strokeWidth} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }} />
      </svg>
      <span className={clsx('absolute text-center tabular-nums', compact ? 'text-[8px]' : 'text-[10px]', remaining === 0 ? 'text-red-500' : 'text-zinc-600')} style={{ fontWeight: 700 }}>
        {remaining === 0 ? '!' : `${mins}:${String(secs).padStart(2, '0')}`}
      </span>
    </motion.div>
  );
});