// ============================================================
// Axon — FlashcardReviewer (Student Review Session)
//
// Receives summaryId. Full review flow:
// 1. Load active flashcards for summary
// 2. Start study session (POST /study-sessions)
// 3. Flip cards, grade 1-4, submit reviews
// 4. Close session with stats
//
// Supports all 6 card types (text, text_image, image_text,
// image_image, text_both, cloze).
// Cloze cards: grade after all blanks revealed (not after flip).
// Image preloading for next card.
// Stats breakdown by card type.
//
// States: idle → reviewing → finished
// Used in SummaryView (EV-2) or standalone.
// Backend: FLAT routes via studySessionApi + flashcardApi.
// ============================================================
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiCall } from '@/app/lib/api';
import * as flashcardApi from '@/app/services/flashcardApi';
import * as sessionApi from '@/app/services/studySessionApi';
import type { FlashcardItem } from '@/app/services/flashcardApi';
import type { Keyword } from '@/app/types/platform';
import { FlashcardCard, detectCardType } from './FlashcardCard';
import type { CardType } from './FlashcardCard';
import { FlashcardImageZoom } from './FlashcardImageZoom';
import { computeFsrsUpdate, getInitialFsrsState } from '@/app/lib/fsrs-engine';
import type { FsrsState } from '@/app/lib/fsrs-engine';
import { updateBKT } from '@/app/lib/bkt-engine';
import {
  CreditCard, Play, Loader2, X, RotateCcw,
  Trophy, BarChart3, ChevronRight, Type, Image as ImageIcon,
  TextCursorInput,
} from 'lucide-react';

// ── Grade definitions ─────────────────────────────────────

const GRADES = [
  { value: 1, label: 'Otra vez', color: 'bg-red-500 hover:bg-red-600', desc: 'No la sabia' },
  { value: 2, label: 'Dificil', color: 'bg-orange-500 hover:bg-orange-600', desc: 'Con mucho esfuerzo' },
  { value: 3, label: 'Bien', color: 'bg-emerald-500 hover:bg-emerald-600', desc: 'Con algo de esfuerzo' },
  { value: 4, label: 'Facil', color: 'bg-blue-500 hover:bg-blue-600', desc: 'Muy facil' },
] as const;

// ── Props ─────────────────────────────────────────────────

interface FlashcardReviewerProps {
  summaryId: string;
  onClose?: () => void;
}

// ── Review state type ─────────────────────────────────────

type ReviewPhase = 'idle' | 'reviewing' | 'finished';

// ── Component ─────────────────────────────────────────────

export function FlashcardReviewer({ summaryId, onClose }: FlashcardReviewerProps) {
  // ── Data ────────────────────────────────────────────────
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Session state ───────────────────────────────────────
  const [phase, setPhase] = useState<ReviewPhase>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [grades, setGrades] = useState<number[]>([]);
  const [submittingGrade, setSubmittingGrade] = useState(false);
  const sessionStartRef = useRef<Date | null>(null);

  // ── Image zoom state ────────────────────────────────────
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // ── Cloze state ───────────────────────��─────────────────
  const [clozeReady, setClozeReady] = useState(false);

  // ── Current card (must be before currentCardType) ───────
  const currentCard = flashcards[currentIndex] || null;
  const totalCards = flashcards.length;
  const reviewedCount = grades.length;

  // ── Current card type helper ────────────────────────────
  const currentCardType = useMemo(() => {
    if (!currentCard) return 'text' as CardType;
    return detectCardType(currentCard.front, currentCard.back);
  }, [currentCard]);

  const isClozeCard = currentCardType === 'cloze';

  // ── Reset cloze state on card change ────────────────────
  useEffect(() => {
    setClozeReady(false);
  }, [currentIndex]);

  // ── Image preloading for next card ──────────────────────
  useEffect(() => {
    if (phase !== 'reviewing') return;
    const nextCard = flashcards[currentIndex + 1];
    if (!nextCard) return;
    // Preload images from next card
    const urls: string[] = [];
    // Explicit image URLs from backend columns
    if (nextCard.front_image_url) urls.push(nextCard.front_image_url);
    if (nextCard.back_image_url) urls.push(nextCard.back_image_url);
    // Content-embedded images
    const imgRegex = /!\[img\]\(([^)]+)\)/g;
    let match;
    while ((match = imgRegex.exec(nextCard.front)) !== null) urls.push(match[1]);
    while ((match = imgRegex.exec(nextCard.back)) !== null) urls.push(match[1]);
    for (const url of urls) {
      const img = new Image();
      img.src = url;
    }
  }, [phase, currentIndex, flashcards]);

  // ── FSRS/BKT tracking (non-blocking) ───────────────────
  const handleTrackingUpdate = useCallback(async (
    flashcard: FlashcardItem,
    grade: 1 | 2 | 3 | 4
  ) => {
    // 1. FSRS update (card-level scheduling)
    const fsrsInput = getInitialFsrsState();
    const fsrsResult = computeFsrsUpdate(fsrsInput, grade);
    try {
      await apiCall('/fsrs-states', {
        method: 'POST',
        body: JSON.stringify({
          flashcard_id: flashcard.id,
          stability: fsrsResult.stability,
          difficulty: fsrsResult.difficulty,
          state: fsrsResult.state,
          reps: fsrsResult.reps,
          lapses: fsrsResult.lapses,
          due_at: fsrsResult.due_at,
          last_review_at: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('[FlashcardReviewer] FSRS update failed (non-blocking):', err);
    }

    // 2. BKT update (concept-level, solo si tiene subtopic_id)
    if (flashcard.subtopic_id) {
      const isCorrect = grade >= 3;
      const newP = updateBKT(0, isCorrect, 'flashcard');
      try {
        await apiCall('/bkt-states', {
          method: 'POST',
          body: JSON.stringify({
            subtopic_id: flashcard.subtopic_id,
            p_know: newP,
            p_transit: 0.1,
            p_slip: 0.1,
            p_guess: 0.25,
            delta: newP,
            total_attempts: 1,
            correct_attempts: isCorrect ? 1 : 0,
            last_attempt_at: new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.error('[FlashcardReviewer] BKT update failed (non-blocking):', err);
      }
    }
  }, []);

  // ── Load flashcards + keywords ──────────────────────────
  useEffect(() => {
    if (!summaryId) return;
    setLoading(true);
    Promise.all([
      flashcardApi.getFlashcards(summaryId, undefined, { limit: 200 }),
      apiCall<any>(`/keywords?summary_id=${summaryId}`),
    ])
      .then(([fcResult, kwResult]) => {
        const fcItems = Array.isArray(fcResult) ? fcResult : fcResult.items || [];
        // Filter only active, non-deleted
        const active = fcItems.filter(
          (c: FlashcardItem) => c.is_active && !c.deleted_at
        );
        setFlashcards(active);

        const kwItems = Array.isArray(kwResult) ? kwResult : kwResult?.items || [];
        setKeywords(kwItems);
      })
      .catch(err => {
        console.error('[FlashcardReviewer] Load error:', err);
        setFlashcards([]);
        setKeywords([]);
      })
      .finally(() => setLoading(false));
  }, [summaryId]);

  // ── Keyword lookup ──────────────────────────────────────
  const keywordMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const kw of keywords) {
      map.set(kw.id, kw.term);
    }
    return map;
  }, [keywords]);

  // ── Start session ───────────────────────────────────────
  const startReview = useCallback(async () => {
    try {
      const session = await sessionApi.createStudySession({
        session_type: 'flashcard',
      });
      setSessionId(session.id);
      sessionStartRef.current = new Date();
      setCurrentIndex(0);
      setIsFlipped(false);
      setGrades([]);
      setPhase('reviewing');
    } catch (err: any) {
      console.error('[FlashcardReviewer] Session create error:', err);
    }
  }, []);

  // ── Grade a card ────────────────────────────────────────
  const handleGrade = useCallback(async (grade: number) => {
    if (!sessionId || !currentCard || submittingGrade) return;
    setSubmittingGrade(true);
    try {
      // POST /reviews — create-only, item_id is polymorphic (flashcard_id)
      await sessionApi.submitReview({
        session_id: sessionId,
        item_id: currentCard.id,
        instrument_type: 'flashcard',
        grade,
      });

      const newGrades = [...grades, grade];
      setGrades(newGrades);

      // Move to next card or finish
      if (currentIndex + 1 < totalCards) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
      } else {
        // Session complete — close it
        const now = new Date();
        const durationSeconds = sessionStartRef.current
          ? Math.round((now.getTime() - sessionStartRef.current.getTime()) / 1000)
          : 0;
        const correctReviews = newGrades.filter(g => g >= 3).length;

        try {
          await sessionApi.closeStudySession(sessionId, {
            ended_at: now.toISOString(),
            duration_seconds: durationSeconds,
            total_reviews: totalCards,
            correct_reviews: correctReviews,
          });
        } catch (err) {
          console.error('[FlashcardReviewer] Session close error:', err);
        }

        setPhase('finished');
      }

      // Non-blocking tracking update
      handleTrackingUpdate(currentCard, grade);
    } catch (err: any) {
      console.error('[FlashcardReviewer] Review submit error:', err);
    } finally {
      setSubmittingGrade(false);
    }
  }, [sessionId, currentCard, currentIndex, totalCards, grades, submittingGrade, handleTrackingUpdate]);

  // ── Keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    if (phase !== 'reviewing') return;
    const handler = (e: KeyboardEvent) => {
      // Don't handle if zoom modal is open
      if (zoomImageUrl) return;

      // Space: flip card (non-cloze) or reveal all (cloze)
      if (e.key === ' ') {
        e.preventDefault();
        if (!isFlipped) {
          setIsFlipped(true);
        }
      }

      // Enter: for non-cloze, flip; for cloze, handled by ClozeInteraction
      if (e.key === 'Enter' && !isClozeCard) {
        e.preventDefault();
        if (!isFlipped) {
          setIsFlipped(true);
        }
      }

      // Tab: for cloze cards, reveal all blanks (triggers clozeComplete → flip)
      if (e.key === 'Tab' && isClozeCard && !isFlipped) {
        e.preventDefault();
        // ClozeInteraction handles its own reveal-all via the button
        // We trigger flip + clozeReady as a shortcut
        setClozeReady(true);
        setIsFlipped(true);
      }

      // Number keys 1-4 for grading (only when flipped)
      if (isFlipped && !submittingGrade) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 4) {
          e.preventDefault();
          handleGrade(num);
        }
      }

      // Z: zoom current card's image (if it has one)
      if (e.key === 'z' || e.key === 'Z') {
        if (currentCard) {
          const imgRegex = /!\[img\]\(([^)]+)\)/;
          const side = isFlipped ? currentCard.back : currentCard.front;
          const match = side.match(imgRegex);
          if (match) {
            e.preventDefault();
            setZoomImageUrl(match[1]);
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, isFlipped, submittingGrade, handleGrade, zoomImageUrl, isClozeCard, currentCard]);

  // ── Restart ─────────────────────────────────────────────
  const restartReview = useCallback(() => {
    setPhase('idle');
    setSessionId(null);
    setCurrentIndex(0);
    setIsFlipped(false);
    setGrades([]);
    sessionStartRef.current = null;
  }, []);

  // ── Grade distribution for summary ─────────────────────
  const gradeDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0]; // indices 0-3 for grades 1-4
    for (const g of grades) {
      if (g >= 1 && g <= 4) dist[g - 1]++;
    }
    return dist;
  }, [grades]);

  const correctPercentage = useMemo(() => {
    if (grades.length === 0) return 0;
    return Math.round((grades.filter(g => g >= 3).length / grades.length) * 100);
  }, [grades]);

  // ── Card type distribution ─────────────────────────────
  const cardTypeDistribution = useMemo(() => {
    const dist: { [key in CardType]: number } = {
      text: 0,
      text_image: 0,
      image_text: 0,
      image_image: 0,
      text_both: 0,
      cloze: 0,
    };
    for (const card of flashcards) {
      const type = detectCardType(card.front, card.back);
      if (type in dist) {
        dist[type]++;
      }
    }
    return dist;
  }, [flashcards]);

  const totalCardTypes = Object.values(cardTypeDistribution).reduce((sum, count) => sum + count, 0);

  // ── Loading ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-violet-400" />
      </div>
    );
  }

  // ── No flashcards ───────────────────────────────────────
  if (totalCards === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
          <CreditCard size={28} className="text-zinc-500" />
        </div>
        <h3 className="font-bold text-zinc-200 mb-1">Sin flashcards</h3>
        <p className="text-sm text-zinc-500 max-w-md">
          Este resumen aun no tiene flashcards activas para revisar.
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 rounded-xl text-sm text-zinc-400 hover:bg-zinc-800 transition-all"
          >
            Volver
          </button>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════
  // PHASE: IDLE — Show card count + start
  // ══════════════════════════════════════════
  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-6">
          <CreditCard size={36} className="text-violet-400" />
        </div>
        <h3 className="text-xl font-bold text-zinc-100 mb-2">Revision de Flashcards</h3>
        <p className="text-sm text-zinc-400 max-w-md mb-1">
          {totalCards} flashcard{totalCards !== 1 ? 's' : ''} disponible{totalCards !== 1 ? 's' : ''} para revisar
        </p>
        <p className="text-xs text-zinc-500 mb-8">
          Voltea cada tarjeta y califica que tan bien recordaste la respuesta
        </p>

        <button
          onClick={startReview}
          className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/25"
        >
          <Play size={18} />
          Iniciar revision
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
  if (phase === 'reviewing' && currentCard) {
    const progressPercent = (reviewedCount / totalCards) * 100;

    return (
      <div className="flex flex-col h-full min-h-0 bg-[#0a0a0f]">
        {/* ── Top bar ── */}
        <div className="shrink-0 px-5 py-3 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm('Salir de la revision? El progreso se perdera.')) {
                restartReview();
                onClose?.();
              }
            }}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-zinc-300">
              {reviewedCount + 1}/{totalCards}
            </span>
          </div>

          <div className="w-10" /> {/* spacer */}
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
              key={currentCard.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <FlashcardCard
                front={currentCard.front}
                back={currentCard.back}
                frontImageUrl={currentCard.front_image_url}
                backImageUrl={currentCard.back_image_url}
                keywordName={keywordMap.get(currentCard.keyword_id) || null}
                isFlipped={isFlipped}
                onFlip={() => {
                  if (!isFlipped) setIsFlipped(true);
                }}
                onImageZoom={(url) => setZoomImageUrl(url)}
                onClozeComplete={() => {
                  setClozeReady(true);
                  setIsFlipped(true);
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Grade buttons (only visible when flipped) ── */}
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
                    disabled={submittingGrade}
                    className={`flex flex-col items-center gap-1 px-5 py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 ${g.color} shadow-lg`}
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

        {/* ── Image Zoom Modal ── */}
        <FlashcardImageZoom
          imageUrl={zoomImageUrl}
          onClose={() => setZoomImageUrl(null)}
        />
      </div>
    );
  }

  // ══════════════════════════════════════════
  // PHASE: FINISHED — Summary screen
  // ══════════════════════════════════════════
  if (phase === 'finished') {
    const durationSeconds = sessionStartRef.current
      ? Math.round((new Date().getTime() - sessionStartRef.current.getTime()) / 1000)
      : 0;
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const maxGradeCount = Math.max(...gradeDistribution, 1);

    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-[#0a0a0f] min-h-full">
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
          Revision completada!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-zinc-400 mb-8"
        >
          Revisaste {totalCards} flashcard{totalCards !== 1 ? 's' : ''} en {minutes > 0 ? `${minutes}m ` : ''}{seconds}s
        </motion.p>

        {/* Stats cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-3 gap-4 mb-8 w-full max-w-sm"
        >
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-violet-400">{totalCards}</p>
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

        {/* Grade distribution bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-sm bg-zinc-800/30 border border-zinc-700/40 rounded-xl p-5 mb-8"
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

        {/* Card type distribution bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="w-full max-w-sm bg-zinc-800/30 border border-zinc-700/40 rounded-xl p-5 mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Por tipo de tarjeta
            </span>
          </div>
          <div className="space-y-2.5">
            {([
              { type: 'text' as CardType, label: 'Texto', color: 'bg-violet-500', icon: <Type size={12} /> },
              { type: 'text_image' as CardType, label: 'Txt→Img', color: 'bg-indigo-500', icon: <Type size={12} /> },
              { type: 'image_text' as CardType, label: 'Img→Txt', color: 'bg-sky-500', icon: <ImageIcon size={12} /> },
              { type: 'image_image' as CardType, label: 'Img→Img', color: 'bg-teal-500', icon: <ImageIcon size={12} /> },
              { type: 'text_both' as CardType, label: 'Mixto', color: 'bg-purple-500', icon: <Type size={12} /> },
              { type: 'cloze' as CardType, label: 'Cloze', color: 'bg-cyan-500', icon: <TextCursorInput size={12} /> },
            ])
              .filter(item => cardTypeDistribution[item.type] > 0)
              .map((item, idx) => {
                const count = cardTypeDistribution[item.type];
                return (
                  <div key={item.type} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 w-16 shrink-0 flex items-center gap-1">
                      {item.icon}
                      {item.label}
                    </span>
                    <div className="flex-1 h-5 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${item.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / Math.max(totalCardTypes, 1)) * 100}%` }}
                        transition={{ duration: 0.5, delay: 0.5 + idx * 0.1 }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-zinc-300 w-6 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-3"
        >
          <button
            onClick={restartReview}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700 transition-all border border-zinc-700"
          >
            <RotateCcw size={16} />
            Repetir
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-all"
            >
              Continuar
              <ChevronRight size={16} />
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return null;
}

export default FlashcardReviewer;