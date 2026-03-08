// ============================================================
// Axon — Student Quiz: TimerDisplay
//
// Per-question elapsed timer. Pauses when reviewing answered
// questions. Extracted from QuizTaker in Phase 3 refactor.
// ============================================================

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

// ── Props ────────────────────────────────────────────────

export interface TimerDisplayProps {
  startTime: number;
  paused: boolean;
}

// ── Component ────────────────────────────────────────────

export function TimerDisplay({ startTime, paused }: TimerDisplayProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, paused]);

  useEffect(() => {
    setElapsed(0);
  }, [startTime]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <span className="flex items-center gap-1 text-[11px] text-gray-400 tabular-nums">
      <Clock size={11} />
      {mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`}
    </span>
  );
}
