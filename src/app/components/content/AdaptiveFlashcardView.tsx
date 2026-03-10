// ============================================================
// AdaptiveFlashcardView — Self-contained adaptive flashcard session
//
// ARCHITECTURE DECISION: This is a SEPARATE route component, NOT
// a modification of FlashcardView. Reasons:
//
//   1. FlashcardView uses useFlashcardEngine (single-round, auto-close).
//      The adaptive flow needs multi-round with manual close.
//      Modifying FlashcardView would violate the S2 rule (don't change
//      useFlashcardEngine signature) and risk regressions in the
//      primary flashcard study flow.
//
//   2. Maximum modularity: this view owns its lifecycle completely.
//      It loads its own cards, manages its own session, and renders
//      its own screens. Zero coupling with FlashcardView.
//
//   3. Independent entry point: routed at /student/adaptive-session
//      with query params ?topicId=xxx&courseId=yyy. Can be linked
//      from DeckScreen, SummaryScreen, StudyHub, or anywhere.
//
// COMPOSITION:
//   useAdaptiveSession (hook)  → session lifecycle + batch reviews
//   SessionScreen (existing)   → card review UI (reused, not copied)
//   AdaptivePartialSummary     → between-rounds summary + generate
//   AdaptiveGenerationScreen   → AI generation loading view
//   AdaptiveCompletedScreen    → final session summary (extracted)
//   AdaptiveIdleLanding        → pre-session landing (extracted)
//
// DATA FLOW:
//   URL params → getFlashcardsByTopic() → map to Flashcard[] →
//   useAdaptiveSession.startSession(cards) → phase-based rendering
//
// WHAT THIS FILE DOES NOT DO:
//   - Does NOT import/modify FlashcardView or useFlashcardNavigation
//   - Does NOT import/modify useFlashcardEngine
//   - Does NOT touch any Layout or Context files
//   - Does NOT duplicate SessionScreen (imports it from barrel)
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { useAuth } from '@/app/context/AuthContext';
import { useAdaptiveSession } from '@/app/hooks/useAdaptiveSession';
import { getFlashcardsByTopic } from '@/app/services/flashcardApi';
import type { Flashcard } from '@/app/types/content';
import type { FlashcardItem } from '@/app/services/flashcardApi';
import { useStudyQueueData } from '@/app/hooks/useStudyQueueData';

// Reuse existing SessionScreen for the review phase (zero duplication)
import { SessionScreen } from './flashcard';

// Adaptive-specific screens (Phase 4 components)
import {
  AdaptivePartialSummary,
  AdaptiveGenerationScreen,
  AdaptiveCompletedScreen,
  AdaptiveIdleLanding,
} from './flashcard/adaptive';

// ── Helper: Map API FlashcardItem → UI Flashcard type ─────
// SessionScreen expects `question`/`answer` aliases.
// useAdaptiveSession needs `subtopic_id` for BKT tracking.
// We preserve both in the mapped object.

function mapApiToFlashcard(item: FlashcardItem): Flashcard & { subtopic_id?: string | null } {
  return {
    id: item.id,
    front: item.front,
    back: item.back,
    question: item.front,
    answer: item.back,
    mastery: 0,
    summary_id: item.summary_id,
    keyword_id: item.keyword_id,
    subtopic_id: item.subtopic_id,
    source: item.source,
    frontImageUrl: item.front_image_url,
    backImageUrl: item.back_image_url,
    fsrs_state: undefined,
  };
}

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════

export function AdaptiveFlashcardView() {
  const { user } = useAuth();
  const studentId = user?.id || null;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const topicId = searchParams.get('topicId');
  const courseId = searchParams.get('courseId') || '';
  const topicTitle = searchParams.get('topicTitle') || 'Sesión Adaptativa';

  // ── Card loading state ──
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Study-queue data for real FSRS state ──
  // FIX: Without this, ALL cards in adaptive sessions are treated as new.
  // useStudyQueueData provides the real FSRS state (stability, difficulty,
  // fsrs_state) for each flashcard, enabling correct scheduling updates
  // for cards the student has already reviewed.
  const sqData = useStudyQueueData(courseId || null);

  // ── Round ratings tracker (for SessionScreen progress bar) ──
  // SessionScreen needs sessionStats[i] = rating for card i in current round.
  // useAdaptiveSession's allStats is cross-round, so we track per-round locally.
  const [roundRatings, setRoundRatings] = useState<number[]>([]);

  // ── Adaptive session hook ──
  const session = useAdaptiveSession({
    studentId,
    courseId,
    topicId,
    masteryMap: sqData.byFlashcardId,
  });

  // ── Load flashcards on mount ──
  useEffect(() => {
    if (!topicId) {
      setLoadError('No se especificó un tema. Vuelve al deck y selecciona un tema.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadCards() {
      try {
        setLoading(true);
        setLoadError(null);
        const response = await getFlashcardsByTopic(topicId!);
        if (cancelled) return;

        const mapped = response.items
          .filter(item => item.is_active && !item.deleted_at)
          .map(mapApiToFlashcard);

        if (mapped.length === 0) {
          setLoadError('No hay flashcards activas para este tema. Pide a tu profesor que las cree.');
          setLoading(false);
          return;
        }

        setCards(mapped);
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        console.error('[AdaptiveView] Failed to load cards:', err);
        setLoadError(
          err?.status === 404
            ? 'No se encontraron flashcards para este tema.'
            : 'Error al cargar flashcards. Intenta de nuevo.'
        );
        setLoading(false);
      }
    }

    loadCards();
    return () => { cancelled = true; };
  }, [topicId]);

  // ── Reset round ratings when entering a new review round ──
  useEffect(() => {
    if (session.phase === 'reviewing') {
      setRoundRatings([]);
    }
  }, [session.phase]);

  // ── EC-3 fix: prevent accidental tab close during active session ──
  useEffect(() => {
    const isActive = session.phase === 'reviewing'
      || session.phase === 'partial-summary'
      || session.phase === 'generating';

    if (!isActive) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [session.phase]);

  // ── Wrapped handleRate: tracks per-round ratings for SessionScreen ──
  const handleRate = useCallback((rating: number) => {
    setRoundRatings(prev => [...prev, rating]);
    session.handleRate(rating);
  }, [session.handleRate]);

  // ── Start session handler ──
  const handleStart = useCallback(() => {
    session.startSession(cards);
  }, [session.startSession, cards]);

  // ── Back navigation ──
  const handleBack = useCallback(() => {
    if (session.phase === 'reviewing' || session.phase === 'partial-summary' || session.phase === 'generating') {
      const confirmed = window.confirm(
        '¿Seguro que quieres salir? Se perderá el progreso de esta sesión.'
      );
      if (!confirmed) return;
    }
    navigate('/student/flashcards');
  }, [session.phase, navigate]);

  // ── Completed: navigate back ──
  const handleExitCompleted = useCallback(() => {
    navigate('/student/flashcards');
  }, [navigate]);

  // ── Restart: reload cards and start fresh ──
  const handleRestart = useCallback(() => {
    setRoundRatings([]);
    session.startSession(cards);
  }, [session.startSession, cards]);

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════

  return (
    <div className="flex h-full bg-surface-dashboard relative overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AnimatePresence mode="wait">

          {/* ── LOADING ── */}
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4"
            >
              <Loader2 size={32} className="animate-spin text-teal-500" />
              <p className="text-sm text-gray-500">Cargando flashcards...</p>
            </motion.div>
          )}

          {/* ── ERROR ── */}
          {!loading && loadError && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 p-8"
            >
              <AlertCircle size={40} className="text-rose-400" />
              <p className="text-sm text-gray-600 text-center max-w-sm">{loadError}</p>
              <button
                onClick={() => navigate('/student/flashcards')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/70 border border-gray-200 text-sm text-gray-700 hover:bg-white transition-colors"
                style={{ fontWeight: 500 }}
              >
                <ArrowLeft size={14} />
                Volver a Flashcards
              </button>
            </motion.div>
          )}

          {/* ── IDLE: Landing screen ── */}
          {!loading && !loadError && session.phase === 'idle' && (
            <AdaptiveIdleLanding
              key="idle"
              topicTitle={topicTitle}
              cardCount={cards.length}
              onStart={handleStart}
              onBack={handleBack}
            />
          )}

          {/* ── REVIEWING: Reuse existing SessionScreen ── */}
          {session.phase === 'reviewing' && session.sessionCards.length > 0 && (
            <SessionScreen
              key={`review-round-${session.roundCount}`}
              cards={session.sessionCards}
              currentIndex={session.currentIndex}
              isRevealed={session.isRevealed}
              setIsRevealed={session.setIsRevealed}
              handleRate={handleRate}
              sessionStats={roundRatings}
              courseColor="#0d9488"
              onBack={handleBack}
            />
          )}

          {/* ── PARTIAL SUMMARY: Between-rounds ── */}
          {session.phase === 'partial-summary' && (
            <AdaptivePartialSummary
              key="partial-summary"
              allStats={session.allStats}
              completedRounds={session.completedRounds}
              keywordMastery={session.keywordMastery}
              topicSummary={session.topicSummary}
              masteryLoading={session.masteryLoading}
              masteryDeltas={session.masteryDeltas.current}
              lastGenerationResult={session.lastGenerationResult}
              generationError={session.generationError}
              onGenerateMore={session.generateMore}
              onFinish={session.finishSession}
            />
          )}

          {/* ── GENERATING: AI loading screen ── */}
          {session.phase === 'generating' && session.generationProgress && (
            <AdaptiveGenerationScreen
              key="generating"
              progress={session.generationProgress}
              onCancel={session.abortGeneration}
            />
          )}

          {/* ── COMPLETED: Final summary ── */}
          {session.phase === 'completed' && (
            <AdaptiveCompletedScreen
              key="completed"
              allStats={session.allStats}
              completedRounds={session.completedRounds}
              masteryDeltas={session.masteryDeltas.current}
              topicSummary={session.topicSummary}
              onRestart={handleRestart}
              onExit={handleExitCompleted}
            />
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}