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
import { logger } from '@/app/lib/logger';
import { hasHttpStatus } from '@/app/utils/getErrorMessage';

// Reuse existing SessionScreen for the review phase (zero duplication)
import { SessionScreen } from './flashcard';

// Adaptive-specific screens
import {
  AdaptivePartialSummary,
  AdaptiveGenerationScreen,
  AdaptiveCompletedScreen,
  AdaptiveIdleLanding,
} from './flashcard/adaptive';

// ── Helper: Map API FlashcardItem → UI Flashcard type ─────
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

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════

export function AdaptiveFlashcardView() {
  const { user } = useAuth();
  const studentId = user?.id || null;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const topicId = searchParams.get('topicId');
  const courseId = searchParams.get('courseId') || '';
  const topicTitle = searchParams.get('topicTitle') || 'Sesi\u00F3n Adaptativa';

  // ── Card loading state ──
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Study-queue data for real FSRS state ──
  const sqData = useStudyQueueData(courseId || null);

  // ── Round ratings tracker (for SessionScreen progress bar) ──
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
      setLoadError('No se especific\u00F3 un tema. Vuelve al deck y selecciona un tema.');
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
      } catch (err: unknown) {
        if (cancelled) return;
        logger.error('AdaptiveFlashcardView', 'Failed to load cards:', err);
        setLoadError(
          hasHttpStatus(err, 404)
            ? 'No se encontraron flashcards para este tema.'
            : 'Error al cargar flashcards. Int\u00E9ntalo de nuevo.'
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
  // EC-3 FIX (PR #286 review): Chrome/Edge require BOTH preventDefault()
  // AND setting e.returnValue to trigger the beforeunload prompt.
  // Safari mobile ignores beforeunload — window.confirm in handleBack
  // covers intentional navigation there.
  useEffect(() => {
    const isActive = session.phase === 'reviewing'
      || session.phase === 'partial-summary'
      || session.phase === 'generating';

    if (!isActive) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [session.phase]);

  // ── Wrapped handleRate: tracks per-round ratings for SessionScreen ──
  const handleRate = useCallback((rating: number) => {
    setRoundRatings(prev => [...prev, rating]);
    session.handleRate(rating);
  }, [session.handleRate]);

  const handleStart = useCallback(() => {
    session.startSession(cards);
  }, [session.startSession, cards]);

  const handleBack = useCallback(() => {
    if (session.phase === 'reviewing' || session.phase === 'partial-summary' || session.phase === 'generating') {
      const confirmed = window.confirm(
        '\u00BFSeguro que quieres salir? Se perder\u00E1 el progreso de esta sesi\u00F3n.'
      );
      if (!confirmed) return;
    }
    navigate('/student/flashcards');
  }, [session.phase, navigate]);

  const handleExitCompleted = useCallback(() => {
    navigate('/student/flashcards');
  }, [navigate]);

  const handleRestart = useCallback(() => {
    setRoundRatings([]);
    session.startSession(cards);
  }, [session.startSession, cards]);

  // ═══ RENDER ═══

  return (
    <div className="flex h-full bg-surface-dashboard relative overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AnimatePresence mode="wait">

          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4"
            >
              <Loader2 size={32} className="animate-spin text-[#2a8c7a]" />
              <p className="text-sm text-gray-500">Cargando flashcards...</p>
            </motion.div>
          )}

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

          {!loading && !loadError && session.phase === 'idle' && (
            <AdaptiveIdleLanding
              key="idle"
              topicTitle={topicTitle}
              cardCount={cards.length}
              onStart={handleStart}
              onBack={handleBack}
            />
          )}

          {session.phase === 'reviewing' && session.sessionCards.length > 0 && (
            <SessionScreen
              key={`review-round-${session.roundCount}`}
              cards={session.sessionCards}
              currentIndex={session.currentIndex}
              isRevealed={session.isRevealed}
              setIsRevealed={session.setIsRevealed}
              handleRate={handleRate}
              sessionStats={roundRatings}
              courseColor="#2a8c7a"
              onBack={handleBack}
              masteryMap={sqData.byFlashcardId}
            />
          )}

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

          {session.phase === 'generating' && session.generationProgress && (
            <AdaptiveGenerationScreen
              key="generating"
              progress={session.generationProgress}
              onCancel={session.abortGeneration}
            />
          )}

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
