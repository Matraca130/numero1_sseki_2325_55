// ============================================================
// Axon — Student: StudyTimer (Pomodoro)
//
// Draggable Pomodoro timer widget with study (25 min) and
// break (5 min) modes that auto-switch. Shows mm:ss countdown,
// progress bar, and play/pause/reset controls. User can drag
// the widget by its header to reposition it anywhere on screen;
// the chosen position is persisted in localStorage.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCw, X, Plus, Minus, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall } from '@/app/lib/api';

// ── Constants ────────────────────────────────────────────

const DEFAULT_STUDY_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;
const MIN_MINUTES = 1;
const MAX_STUDY_MINUTES = 120;
const MAX_BREAK_MINUTES = 30;
const STEP_MINUTES = 5;

// Persisted position (viewport coordinates in px, top-left origin)
const POSITION_STORAGE_KEY = 'axon:studyTimer:position';
// Approximate widget size used for bounds-clamping before layout is measured
const ESTIMATED_WIDGET_WIDTH = 220;
const ESTIMATED_WIDGET_HEIGHT = 180;
const EDGE_MARGIN = 8;

interface Position {
  x: number;
  y: number;
}

function loadSavedPosition(): Position | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Position>;
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null;
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

function clampToViewport(pos: Position, width: number, height: number): Position {
  if (typeof window === 'undefined') return pos;
  const maxX = Math.max(EDGE_MARGIN, window.innerWidth - width - EDGE_MARGIN);
  const maxY = Math.max(EDGE_MARGIN, window.innerHeight - height - EDGE_MARGIN);
  return {
    x: Math.min(Math.max(EDGE_MARGIN, pos.x), maxX),
    y: Math.min(Math.max(EDGE_MARGIN, pos.y), maxY),
  };
}

type TimerMode = 'study' | 'break';

// ── Props ────────────────────────────────────────────────

export interface StudyTimerProps {
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────

export function StudyTimer({ onClose }: StudyTimerProps) {
  const [mode, setMode] = useState<TimerMode>('study');
  const [studyMinutes, setStudyMinutes] = useState(DEFAULT_STUDY_MINUTES);
  const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK_MINUTES);
  const [seconds, setSeconds] = useState(DEFAULT_STUDY_MINUTES * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // ── Draggable position state ─────────────────────────
  // `position` is null on first load (widget uses default bottom-right CSS).
  // Once the user drags, we switch to absolute x/y coordinates stored in localStorage.
  const [position, setPosition] = useState<Position | null>(() => loadSavedPosition());
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef<Position>({ x: 0, y: 0 });
  const didDragRef = useRef(false);

  const totalSeconds = mode === 'study' ? studyMinutes * 60 : breakMinutes * 60;
  const progress = 1 - seconds / totalSeconds;

  // ── Drag handlers ────────────────────────────────────

  const handleDragPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore clicks on interactive children (e.g., close button)
    if ((e.target as HTMLElement).closest('button')) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    didDragRef.current = false;
    setIsDragging(true);
    // Seed position from current on-screen rect so the first move is smooth
    // even when we were still using the default bottom/right CSS.
    setPosition({ x: rect.left, y: rect.top });
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const handleDragPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const container = containerRef.current;
    const width = container?.offsetWidth ?? ESTIMATED_WIDGET_WIDTH;
    const height = container?.offsetHeight ?? ESTIMATED_WIDGET_HEIGHT;
    const next = clampToViewport(
      {
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      },
      width,
      height,
    );
    didDragRef.current = true;
    setPosition(next);
  }, [isDragging]);

  const handleDragPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if pointer was not captured
    }
    if (didDragRef.current && position) {
      try {
        window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
      } catch {
        // localStorage unavailable — silently ignore
      }
    }
  }, [isDragging, position]);

  // ── Re-clamp on window resize so the widget never falls off-screen ──

  useEffect(() => {
    if (!position) return;
    const handleResize = () => {
      const container = containerRef.current;
      const width = container?.offsetWidth ?? ESTIMATED_WIDGET_WIDTH;
      const height = container?.offsetHeight ?? ESTIMATED_WIDGET_HEIGHT;
      setPosition((prev) => (prev ? clampToViewport(prev, width, height) : prev));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

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
      // Complete the study session via API (fire-and-forget).
      // Skip when the create-session POST is still in flight (sentinel
      // value 'pending'); otherwise we'd issue PUT /study-sessions/pending
      // (literal string in the URL) and get a 404. See issue #753.
      // Trade-off: in the rare case the POST takes longer than the timer
      // (>= 60s, only possible under network failure), the backend session
      // is left without a completed_at and relies on server-side cleanup.
      if (sessionIdRef.current && sessionIdRef.current !== 'pending') {
        const sid = sessionIdRef.current;
        sessionIdRef.current = null;
        apiCall(`/study-sessions/${sid}`, {
          method: 'PUT',
          body: JSON.stringify({ completed_at: new Date().toISOString() }),
        }).catch((err) => {
          console.warn('[StudyTimer] Failed to complete study session:', err);
        });
      }
      toast('Tiempo de estudio finalizado!');
      setMode('break');
      setSeconds(breakMinutes * 60);
    } else {
      toast('Descanso finalizado!');
      setMode('study');
      setSeconds(studyMinutes * 60);
    }
  }, [seconds, mode]);

  // ── Handlers ─────────────────────────────────────────

  const toggleRunning = useCallback(() => {
    // Fire API call outside state updater to avoid double-fire in StrictMode
    // Set ref to sentinel immediately to prevent race condition on rapid clicks
    if (!running && mode === 'study' && !sessionIdRef.current) {
      sessionIdRef.current = 'pending';
      apiCall<{ id: string }>('/study-sessions', {
        method: 'POST',
        body: JSON.stringify({
          session_type: 'reading',
          started_at: new Date().toISOString(),
        }),
      })
        .then((res) => {
          sessionIdRef.current = res?.id ?? null;
        })
        .catch((err) => {
          console.warn('[StudyTimer] Failed to create study session:', err);
          sessionIdRef.current = null;
        });
    }
    setRunning((prev) => !prev);
  }, [mode, running]);

  const handleReset = useCallback(() => {
    setRunning(false);
    sessionIdRef.current = null;
    setSeconds(mode === 'study' ? studyMinutes * 60 : breakMinutes * 60);
  }, [mode, studyMinutes, breakMinutes]);

  const handleAdjustTime = useCallback((delta: number) => {
    if (running) return;
    if (mode === 'study') {
      const next = Math.max(MIN_MINUTES, Math.min(MAX_STUDY_MINUTES, studyMinutes + delta));
      setStudyMinutes(next);
      setSeconds(next * 60);
    } else {
      const next = Math.max(MIN_MINUTES, Math.min(MAX_BREAK_MINUTES, breakMinutes + delta));
      setBreakMinutes(next);
      setSeconds(next * 60);
    }
  }, [running, mode, studyMinutes, breakMinutes]);

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

  // If the user has dragged the widget we use absolute x/y; otherwise we fall
  // back to the original bottom-right CSS anchor so first-time users see it
  // exactly where it used to be.
  const positionStyle: React.CSSProperties = position
    ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' }
    : { right: '20px', bottom: '20px' };

  return (
    <div
      ref={containerRef}
      className={`fixed z-[400] min-w-[180px] rounded-2xl border border-gray-200 bg-white shadow-lg ${isDragging ? 'select-none shadow-xl' : ''}`}
      style={positionStyle}
      role="timer"
      aria-label={`${mode === 'study' ? 'Estudio' : 'Descanso'} ${display}`}
    >
      {/* Header — doubles as drag handle */}
      <div
        className="flex items-center justify-between px-3 pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handleDragPointerDown}
        onPointerMove={handleDragPointerMove}
        onPointerUp={handleDragPointerUp}
        onPointerCancel={handleDragPointerUp}
        title="Arrastrar para mover"
      >
        <div className="flex items-center gap-1">
          <GripVertical size={12} className="text-gray-300" aria-hidden="true" />
          <span className={`text-xs font-semibold uppercase tracking-wide ${labelColor}`}>
            {mode === 'study' ? 'Estudio' : 'Descanso'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Cerrar timer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Time display with +/- controls */}
      <div className="flex items-center justify-center gap-2 px-3 py-2">
        <button
          onClick={() => handleAdjustTime(-STEP_MINUTES)}
          disabled={running || (mode === 'study' ? studyMinutes <= MIN_MINUTES : breakMinutes <= MIN_MINUTES)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={`Reducir ${STEP_MINUTES} minutos`}
        >
          <Minus size={14} />
        </button>
        <span className="font-mono font-bold tabular-nums text-gray-800" style={{ fontSize: 'clamp(1.5rem, 3vw, 1.875rem)', minWidth: 80, textAlign: 'center' }}>
          {display}
        </span>
        <button
          onClick={() => handleAdjustTime(STEP_MINUTES)}
          disabled={running || (mode === 'study' ? studyMinutes >= MAX_STUDY_MINUTES : breakMinutes >= MAX_BREAK_MINUTES)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={`Aumentar ${STEP_MINUTES} minutos`}
        >
          <Plus size={14} />
        </button>
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
