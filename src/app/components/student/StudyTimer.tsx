// ============================================================
// Axon — Student: StudyTimer (Pomodoro)
//
// Fixed-position Pomodoro timer widget with study (25 min) and
// break (5 min) modes that auto-switch. Shows mm:ss countdown,
// progress bar, and play/pause/reset controls.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall } from '@/app/lib/api';

// ── Constants ────────────────────────────────────────────

const STUDY_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

type TimerMode = 'study' | 'break';

// ── Props ────────────────────────────────────────────────

export interface StudyTimerProps {
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────

export function StudyTimer({ onClose }: StudyTimerProps) {
  const [mode, setMode] = useState<TimerMode>('study');
  const [seconds, setSeconds] = useState(STUDY_SECONDS);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const totalSeconds = mode === 'study' ? STUDY_SECONDS : BREAK_SECONDS;
  const progress = 1 - seconds / totalSeconds;

  // ── Tick logic ───────────────────────────────────────

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  // ── Auto-switch when timer reaches 0 ────────────────

  useEffect(() => {
    if (seconds !== 0) return;

    setRunning(false);

    if (mode === 'study') {
      // Complete the study session via API (fire-and-forget)
      if (sessionIdRef.current) {
        const sid = sessionIdRef.current;
        sessionIdRef.current = null;
        apiCall(`/study-sessions/${sid}`, {
          method: 'PUT',
          body: JSON.stringify({ completed_at: new Date().toISOString() }),
        }).catch(() => {});
      }
      toast('Tempo de estudo finalizado!');
      setMode('break');
      setSeconds(BREAK_SECONDS);
    } else {
      toast('Descanso finalizado!');
      setMode('study');
      setSeconds(STUDY_SECONDS);
    }
  }, [seconds, mode]);

  // ── Handlers ─────────────────────────────────────────

  const toggleRunning = useCallback(() => {
    setRunning((prev) => {
      if (!prev && mode === 'study' && !sessionIdRef.current) {
        // Starting a study session — fire-and-forget API call
        apiCall<{ id: string }>('/study-sessions', {
          method: 'POST',
          body: JSON.stringify({
            session_type: 'reading',
            started_at: new Date().toISOString(),
          }),
        })
          .then((res) => {
            if (res?.id) sessionIdRef.current = res.id;
          })
          .catch(() => {
            // fire-and-forget — don't block UX
          });
      }
      return !prev;
    });
  }, [mode]);

  const handleReset = useCallback(() => {
    setRunning(false);
    setSeconds(mode === 'study' ? STUDY_SECONDS : BREAK_SECONDS);
  }, [mode]);

  // ── Format mm:ss ─────────────────────────────────────

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // ── Colors by mode ───────────────────────────────────

  const isBrk = mode === 'break';
  const accentBg = isBrk ? 'bg-amber-500' : 'bg-teal-500';
  const accentHover = isBrk ? 'hover:bg-amber-600' : 'hover:bg-teal-600';
  const barBg = isBrk ? 'bg-amber-400' : 'bg-teal-400';
  const labelColor = isBrk ? 'text-amber-600' : 'text-teal-600';

  return (
    <div
      className="fixed bottom-5 right-5 z-[400] min-w-[180px] rounded-2xl border border-gray-200 bg-white shadow-lg"
      role="timer"
      aria-label={`${mode === 'study' ? 'Estudo' : 'Descanso'} ${display}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <span className={`text-xs font-semibold uppercase tracking-wide ${labelColor}`}>
          {mode === 'study' ? 'Estudo' : 'Descanso'}
        </span>
        <button
          onClick={onClose}
          className="rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Fechar timer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Time display */}
      <div className="px-3 py-2 text-center">
        <span className="font-mono font-bold tabular-nums text-gray-800" style={{ fontSize: 'clamp(1.5rem, 3vw, 1.875rem)' }}>
          {display}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mx-3 mb-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barBg}`}
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 px-3 pb-3">
        <button
          onClick={toggleRunning}
          className={`flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors ${accentBg} ${accentHover}`}
          aria-label={running ? 'Pausar' : 'Iniciar'}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={handleReset}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          aria-label="Reiniciar"
        >
          <RotateCw size={16} />
        </button>
      </div>
    </div>
  );
}
