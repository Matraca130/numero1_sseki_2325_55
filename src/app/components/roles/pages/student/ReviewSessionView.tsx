// ============================================================
// Axon — ReviewSessionView (FSRS-based Spaced Repetition)
//
// DIFERENCIA CON FlashcardReviewer (EV-4B):
// - FlashcardReviewer: "Revisar TODAS las flashcards de un summary" (manual)
// - ReviewSessionView: "Revisar solo las que TOCAN HOY segun FSRS" (algoritmico)
//
// Flow:
// 1. GET /fsrs-states → filter due_at <= now OR due_at null
// 2. GET /flashcards/:id for each due state
// 3. POST /study-sessions → create session
// 4. Review cards with flip + grade 1-4
// 5. grade=1 → re-insert at end of queue
// 6. queueReview (sync, 0 POSTs) per card
// 7. Session end:
//    a. submitBatch → 1 POST /review-batch
//    b. closeStudySession → 1 POST
//    c. daily-activities → 1 POST
//    d. student-stats → 1 POST
//
// v4.4.4 — Migrated to useReviewBatch:
//   Previously used persistCardReview (3×N POSTs) + submitReview
//   (1×N POSTs) = 4×N total. Now: queueReview (sync) during
//   session + submitBatch (1 POST) at end.
//   Also passes REAL existingFsrs from FsrsStateRow (unlike
//   FlashcardReviewer which passes undefined for new-card state).
//
// Backend: FLAT routes via studySessionApi + flashcardApi + apiCall.
// ============================================================
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiCall } from '@/app/lib/api';
import * as flashcardApi from '@/app/services/flashcardApi';
import * as sessionApi from '@/app/services/studySessionApi';
import type { FlashcardItem } from '@/app/services/flashcardApi';
import type { FsrsStateRow } from '@/app/services/studySessionApi';
import { FlashcardCard } from '@/app/components/student/FlashcardCard';
import { useReviewBatch } from '@/app/hooks/useReviewBatch';
import {
  Loader2, X, CheckCircle,
  Trophy, BarChart3, ChevronRight, Clock, Calendar,
  Play,
} from 'lucide-react';
import { GRADES } from '@/app/hooks/flashcard-types';

// ── Queue item: card + its FSRS state ─────────────────────

interface ReviewQueueItem {
  card: FlashcardItem;
  fsrsState: FsrsStateRow;
}

// ── Props ─────────────────────────────────────────────────

interface ReviewSessionViewProps {
  onClose?: () => void;
  /**
   * Optional mastery map: flashcard_id → { p_know }.
   * If provided, queueReview uses real p_know values for BKT.
   * If omitted, defaults to 0 (first pass) — intra-session
   * accumulation still works via useReviewBatch's sessionBktRef.
   */
  masteryMap?: Map<string, { p_know: number }>;
}

type ReviewPhase = 'loading' | 'idle' | 'reviewing' | 'finished';

// ── Component ─────────────────────────────────────────────

export function ReviewSessionView({ onClose, masteryMap }: ReviewSessionViewProps) {
  // ── Data ────────────────────────────────────────────────
  const [phase, setPhase] = useState<ReviewPhase>('loading');
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [totalDueCount, setTotalDueCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Session state ───────────────────────────────────────
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [grades, setGrades] = useState<number[]>([]);
  const sessionStartRef = useRef<Date | null>(null);

  // ── Timing per card (for response_time_ms) ──────────────
  const cardStartTime = useRef<number>(Date.now());

  // ── Batch review hook ──────────────────────────────────
  // Replaces the old persistCardReview + submitReview pattern.
  // queueReview: sync, zero POSTs — queues locally
  // submitBatch: async, 1 POST /review-batch at session end
  const { queueReview, submitBatch, reset: batchReset } = useReviewBatch();

  // ── Timer ───────────────────────────────────────────────
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === 'reviewing' && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formattedTime = useMemo(() => {
    const m = Math.floor(elapsedSeconds / 60);
    const s = elapsedSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [elapsedSeconds]);

  // ── Load due FSRS states + flashcards ───────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadDueCards() {
      try {
        // 1. Get all FSRS states
        const allStates = await sessionApi.getFsrsStates({
          limit: 500,
        });

        const now = new Date().toISOString();

        // 2. Filter: due_at <= now OR due_at is null. Ignore null flashcard_id.
        const dueStates = allStates.filter(s => {
          if (!s.flashcard_id) return false; // orphan
          if (!s.due_at) return true; // never reviewed = due
          return s.due_at <= now;
        });

        if (cancelled) return;

        if (dueStates.length === 0) {
          setTotalDueCount(0);
          setQueue([]);
          setPhase('idle');
          return;
        }

        // 3. Fetch each flashcard (parallel, batched)
        const items: ReviewQueueItem[] = [];
        const batchSize = 10;
        for (let i = 0; i < dueStates.length; i += batchSize) {
          const batch = dueStates.slice(i, i + batchSize);
          const results = await Promise.allSettled(
            batch.map(s => flashcardApi.getFlashcard(s.flashcard_id!))
          );
          for (let j = 0; j < results.length; j++) {
            const result = results[j];
            if (result.status === 'fulfilled') {
              const card = result.value;
              // Only include active, non-deleted
              if (card.is_active && !card.deleted_at) {
                items.push({ card, fsrsState: batch[j] });
              }
            }
          }
        }

        if (cancelled) return;

        setQueue(items);
        setTotalDueCount(items.length);
        setPhase('idle');
      } catch (err: any) {
        console.error('[ReviewSession] Load error:', err);
        if (!cancelled) {
          setLoadError(err.message || 'Error al cargar repasos');
          setPhase('idle');
        }
      }
    }

    loadDueCards();
    return () => { cancelled = true; };
  }, []);

  // ── Current item ────────────────────────────────────────
  const currentItem = queue[currentIdx] || null;
  const reviewedCount = grades.length;

  // ── Start session ───────────────────────────────────────
  const startSession = useCallback(async () => {
    try {
      const session = await sessionApi.createStudySession({
        session_type: 'flashcard',
      });
      setSessionId(session.id);
      sessionStartRef.current = new Date();
      cardStartTime.current = Date.now();
      setCurrentIdx(0);
      setIsFlipped(false);
      setGrades([]);
      setElapsedSeconds(0);
      batchReset();
      setPhase('reviewing');
    } catch (err: any) {
      console.error('[ReviewSession] Session create error:', err);
    }
  }, [batchReset]);

  // ── Grade a card ────────────────────────────────────────
  // NOW SYNC: queueReview does zero network calls.
  // Batch submission + analytics happen ONLY at session end.
  const handleGrade = useCallback((grade: number) => {
    if (!sessionId || !currentItem) return;

    // 1. Compute response time
    const responseTimeMs = Date.now() - cardStartTime.current;

    // 2. Queue review via useReviewBatch (sync, zero POSTs)
    //    ADVANTAGE over FlashcardReviewer: we have REAL FSRS state
    //    from the FsrsStateRow, so scheduling is accurate.
    const masteryEntry = masteryMap?.get(currentItem.card.id);
    queueReview({
      card: currentItem.card,
      grade,
      responseTimeMs,
      existingFsrs: {
        stability: currentItem.fsrsState.stability || 1,
        difficulty: currentItem.fsrsState.difficulty || 5,
        reps: currentItem.fsrsState.reps || 0,
        lapses: currentItem.fsrsState.lapses || 0,
        state: currentItem.fsrsState.state || 'new',
      },
      currentPKnow: masteryEntry?.p_know,
    });

    // 3. Update local grades state
    const newGrades = [...grades, grade];
    setGrades(newGrades);

    // 4. grade=1 → re-insert at end of queue (spaced repetition re-queue)
    if (grade === 1) {
      setQueue(prev => [...prev, currentItem]);
    }

    // 5. Move to next card or finish
    //    Must account for potential queue growth from grade=1 re-queue
    const updatedQueueLength = grade === 1 ? queue.length + 1 : queue.length;

    if (currentIdx + 1 < updatedQueueLength) {
      // ── Next card ──
      setCurrentIdx(currentIdx + 1);
      setIsFlipped(false);
      cardStartTime.current = Date.now();
    } else {
      // ── Session complete ──
      stopTimer();
      setPhase('finished');

      // Fire batch submit + close + analytics in background (non-blocking)
      const sid = sessionId;
      const startTime = sessionStartRef.current;
      (async () => {
        // a. Submit all reviews in ONE batch request
        await submitBatch(sid);

        // b. Close session on backend
        const now = new Date();
        const durationSeconds = startTime
          ? Math.round((now.getTime() - startTime.getTime()) / 1000)
          : 0;
        const correctReviews = newGrades.filter(g => g >= 3).length;

        try {
          await sessionApi.closeStudySession(sid, {
            completed_at: now.toISOString(),
            total_reviews: newGrades.length,
            correct_reviews: correctReviews,
          });
        } catch (err) {
          console.error('[ReviewSession] Session close error:', err);
        }

        // c. POST /daily-activities (UPSERT) — analytics/gamification
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
        try {
          await apiCall('/daily-activities', {
            method: 'POST',
            body: JSON.stringify({
              activity_date: today,
              reviews_count: newGrades.length,
              correct_count: correctReviews,
              time_spent_seconds: durationSeconds,
              sessions_count: 1,
            }),
          });
        } catch (err) {
          console.error('[ReviewSession] Daily activity update failed:', err);
        }

        // d. POST /student-stats (UPSERT) — analytics/gamification
        try {
          await apiCall('/student-stats', {
            method: 'POST',
            body: JSON.stringify({
              total_reviews: newGrades.length,
              total_time_seconds: durationSeconds,
              total_sessions: 1,
              last_study_date: today,
            }),
          });
        } catch (err) {
          console.error('[ReviewSession] Student stats update failed:', err);
        }
      })();
    }
  }, [sessionId, currentItem, currentIdx, queue, grades, queueReview, submitBatch, stopTimer, masteryMap]);
  // ^^^ REMOVED elapsedSeconds from deps — was causing handleGrade recreation every second.
  //     Duration is computed from sessionStartRef (ref, not state) instead.

  // ── Keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    if (phase !== 'reviewing') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!isFlipped) setIsFlipped(true);
      }
      if (isFlipped) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 4) {
          e.preventDefault();
          handleGrade(num);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, isFlipped, handleGrade]);

  // ── Grade distribution ──────────────────────────────────
  const gradeDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0];
    for (const g of grades) {
      if (g >= 1 && g <= 4) dist[g - 1]++;
    }
    return dist;
  }, [grades]);

  const correctPercentage = useMemo(() => {
    if (grades.length === 0) return 0;
    return Math.round((grades.filter(g => g >= 3).length / grades.length) * 100);
  }, [grades]);

  // ── Next review estimate ────────────────────────────────
  const nextDueEstimate = useMemo(() => {
    if (grades.length === 0) return '';
    const hasAgain = grades.some(g => g === 1);
    if (hasAgain) return 'pronto (algunas tarjetas necesitan repaso)';
    return 'manana o despues';
  }, [grades]);

  // ══════════════════════════════════════════
  // PHASE: LOADING
  // ══════════════════════════════════════════
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0a0a0f]">
        <Loader2 size={32} className="animate-spin text-violet-400 mb-4" />
        <p className="text-sm text-zinc-400">Buscando flashcards pendientes...</p>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // PHASE: IDLE — No due cards or ready to start
  // ══════════════════════════════════════════
  if (phase === 'idle') {
    if (loadError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-[#0a0a0f] px-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <X size={28} className="text-red-400" />
          </div>
          <h3 className="font-bold text-zinc-200 mb-2">Error al cargar</h3>
          <p className="text-sm text-zinc-500 text-center max-w-md mb-4">{loadError}</p>
          {onClose && (
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:bg-zinc-800 transition-all">
              Volver
            </button>
          )}
        </div>
      );
    }

    if (totalDueCount === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-[#0a0a0f] px-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6"
          >
            <CheckCircle size={36} className="text-emerald-400" />
          </motion.div>
          <h3 className="text-xl font-bold text-zinc-100 mb-2">Todo al dia!</h3>
          <p className="text-sm text-zinc-400 max-w-md text-center mb-2">
            No hay repasos pendientes. Vuelve manana!
          </p>
          <p className="text-xs text-zinc-600 mb-8">
            Las flashcards se programan automaticamente segun tu rendimiento
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-all"
            >
              Volver al dashboard
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      );
    }

    // Has due cards — show start screen
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0a0a0f] px-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-6">
          <Calendar size={36} className="text-violet-400" />
        </div>
        <h3 className="text-xl font-bold text-zinc-100 mb-2">Repaso del dia</h3>
        <p className="text-sm text-zinc-400 max-w-md text-center mb-1">
          {totalDueCount} flashcard{totalDueCount !== 1 ? 's' : ''} para repasar hoy
        </p>
        <p className="text-xs text-zinc-500 mb-8">
          Basado en el algoritmo FSRS de repeticion espaciada
        </p>

        <button
          onClick={startSession}
          className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/25"
        >
          <Play size={18} />
          Comenzar repaso
        </button>

        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
          >
            Cancelar
          </button>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════
  // PHASE: REVIEWING — Flip cards + grade
  // ══════════════════════════════════════════
  if (phase === 'reviewing' && currentItem) {
    const progressPercent = (reviewedCount / Math.max(queue.length, 1)) * 100;

    return (
      <div className="flex flex-col h-full min-h-0 bg-[#0a0a0f]">
        {/* ── Top bar ── */}
        <div className="shrink-0 px-5 py-3 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm('Salir del repaso? El progreso se perdera.')) {
                stopTimer();
                onClose?.();
              }
            }}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-zinc-300">
              {reviewedCount + 1}/{queue.length}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Clock size={12} />
              {formattedTime}
            </span>
          </div>

          <div className="w-10" />
        </div>

        {/* ── Progress bar ── */}
        <div className="shrink-0 px-5 pb-4">
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* ── Card area ── */}
        <div className="flex-1 flex items-center justify-center px-5 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentItem.card.id}-${currentIdx}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <FlashcardCard
                front={currentItem.card.front}
                back={currentItem.card.back}
                frontImageUrl={currentItem.card.front_image_url}
                backImageUrl={currentItem.card.back_image_url}
                keywordName={null}
                isFlipped={isFlipped}
                onFlip={() => { if (!isFlipped) setIsFlipped(true); }}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Grade buttons ── */}
        <div className="shrink-0 px-5 pb-6 pt-4">
          <AnimatePresence>
            {isFlipped && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center gap-3"
              >
                {GRADES.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => handleGrade(g.value)}
                    className={`flex flex-col items-center gap-1 px-5 py-3 rounded-xl text-white font-semibold transition-all ${g.color} shadow-lg`}
                  >
                    <span className="text-sm">{g.label}</span>
                    <span className="text-[10px] opacity-70">{g.value}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {!isFlipped && (
            <div className="text-center">
              <p className="text-xs text-zinc-600">
                Toca la tarjeta o presiona espacio para ver la respuesta
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // PHASE: FINISHED — Summary screen
  // ══════════════════════════════════════════
  if (phase === 'finished') {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const maxGradeCount = Math.max(...gradeDistribution, 1);

    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-[#0a0a0f] min-h-full overflow-y-auto">
        {/* Trophy */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 border border-amber-400/20 flex items-center justify-center mb-6"
        >
          <Trophy size={36} className="text-amber-400" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-zinc-100 mb-2"
        >
          Repaso completado!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-zinc-400 mb-8"
        >
          {grades.length} tarjeta{grades.length !== 1 ? 's' : ''} revisada{grades.length !== 1 ? 's' : ''} en {minutes > 0 ? `${minutes}m ` : ''}{seconds}s
        </motion.p>

        {/* Stats cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-3 gap-4 mb-8 w-full max-w-sm"
        >
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-violet-400">{grades.length}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Revisadas</p>
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{correctPercentage}%</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Correctas</p>
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">
              {minutes > 0 ? `${minutes}m` : `${seconds}s`}
            </p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Tiempo</p>
          </div>
        </motion.div>

        {/* Grade distribution */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-sm bg-zinc-800/30 border border-zinc-700/40 rounded-xl p-5 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Distribucion de calidad
            </span>
          </div>
          <div className="space-y-2.5">
            {GRADES.map((g, idx) => (
              <div key={g.value} className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-16 shrink-0">{g.label}</span>
                <div className="flex-1 h-5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      g.value === 1 ? 'bg-red-500' :
                      g.value === 2 ? 'bg-orange-500' :
                      g.value === 3 ? 'bg-emerald-500' :
                      'bg-blue-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(gradeDistribution[idx] / maxGradeCount) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.5 + idx * 0.1 }}
                  />
                </div>
                <span className="text-xs font-semibold text-zinc-300 w-6 text-right">
                  {gradeDistribution[idx]}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Next review estimate */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="flex items-center gap-2 text-xs text-zinc-500 mb-8"
        >
          <Calendar size={12} />
          <span>Proxima revision: {nextDueEstimate}</span>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-3"
        >
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-all"
            >
              Volver al dashboard
              <ChevronRight size={16} />
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return null;
}

export default ReviewSessionView;