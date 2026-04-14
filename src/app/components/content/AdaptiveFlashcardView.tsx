// ============================================================
// AdaptiveFlashcardView — Host for the adaptive (AI-driven) flashcard
// session flow. Sibling of FlashcardView.tsx.
//
// v4.5.0 (Fase 5): Standalone route that consumes useAdaptiveSession
// and orchestrates the phase-specific screens from
// components/content/flashcard/adaptive/*.
//
// URL contract (from FlashcardView DeckScreen "Con IA" button):
//   /student/adaptive-session?topicId=...&courseId=...&topicTitle=...
//
// studentId is derived from useAuth() and the professor card list is
// loaded from /flashcards-by-topic — the URL does NOT carry cardCount
// or studentId (the view is self-sufficient).
//
// Phase → Screen mapping:
//   idle              → AdaptiveIdleLanding
//   reviewing         → FlashcardSessionScreen (SessionScreen)
//   generating        → AdaptiveGenerationScreen
//   partial-summary   → AdaptivePartialSummary
//   completed         → AdaptiveCompletedScreen
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence } from 'motion/react';

import { useAuth } from '@/app/context/AuthContext';
import { useAdaptiveSession } from '@/app/hooks/useAdaptiveSession';
import { getFlashcardsByTopic, type FlashcardItem } from '@/app/services/flashcardApi';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import { LoadingPage, EmptyState, ErrorState } from '@/app/components/shared/PageStates';
import type { Flashcard } from '@/app/types/content';

import { SessionScreen } from './flashcard';
import {
  AdaptiveIdleLanding,
  AdaptiveGenerationScreen,
  AdaptivePartialSummary,
  AdaptiveCompletedScreen,
} from './flashcard/adaptive';

// ── Constants ─────────────────────────────────────────────
const ADAPTIVE_ACCENT = '#14b8a6';
const BACK_ROUTE = '/student/flashcards';

// ── Helpers ───────────────────────────────────────────────
// Map FlashcardItem (API shape) → Flashcard (UI shape expected by
// useAdaptiveSession.startSession and SessionScreen). This mirrors the
// module-private mapApiCard() in useFlashcardNavigation.ts; we can't
// import that, so we duplicate the minimum shape.
function mapItemToCard(item: FlashcardItem): Flashcard {
  return {
    id: item.id,
    front: item.front || '',
    back: item.back || '',
    question: item.front || '',
    answer: item.back || '',
    mastery: 0,
    difficulty: 'normal',
    keywords: [],
    summary_id: item.summary_id,
    keyword_id: item.keyword_id,
    subtopic_id: item.subtopic_id ?? null,
    source: item.source,
    image: item.front_image_url || item.back_image_url || undefined,
    frontImageUrl: item.front_image_url ?? null,
    backImageUrl: item.back_image_url ?? null,
  };
}

// ══════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════

export function AdaptiveFlashcardView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.id ?? null;
  const [searchParams] = useSearchParams();

  const topicId = searchParams.get('topicId');
  const courseId = searchParams.get('courseId') ?? '';
  const topicTitle = searchParams.get('topicTitle') || 'Sesión Adaptativa';

  // ── Load professor cards for the topic ──
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCards = useCallback(async () => {
    if (!topicId) {
      setLoading(false);
      setLoadError('Falta el topic para iniciar la sesión adaptativa.');
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getFlashcardsByTopic(topicId);
      const items = Array.isArray(data) ? data : data?.items || [];
      const active = items
        .filter((c: FlashcardItem) => c.is_active !== false && !c.deleted_at)
        .map(mapItemToCard);
      setCards(active);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[AdaptiveFlashcardView] Failed to load cards:', err);
      setLoadError('No pudimos cargar las flashcards del tema. Intenta de nuevo.');
      setCards(null);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // ── Adaptive session hook ──
  const session = useAdaptiveSession({
    studentId,
    courseId,
    topicId,
  });

  const goBack = useCallback(() => {
    navigate(BACK_ROUTE);
  }, [navigate]);

  const handleStart = useCallback(() => {
    if (!cards || cards.length === 0) return;
    session.startSession(cards);
  }, [cards, session]);

  const handleRestart = useCallback(() => {
    // Re-run the flow from idle with the same card set
    if (cards && cards.length > 0) {
      session.startSession(cards);
    } else {
      loadCards();
    }
  }, [cards, session, loadCards]);

  const handleFinishAndExit = useCallback(async () => {
    await session.finishSession();
  }, [session]);

  const handleExitAfterCompletion = useCallback(() => {
    navigate(BACK_ROUTE);
  }, [navigate]);

  const totalCards = useMemo(() => cards?.length ?? 0, [cards]);

  // ── Early states ──
  if (!topicId) {
    return (
      <ErrorBoundary>
        <div className="flex h-full bg-surface-dashboard items-center justify-center">
          <EmptyState
            title="Tema no encontrado"
            description="La sesión adaptativa requiere un topic válido."
            actionLabel="Volver a Flashcards"
            onAction={goBack}
          />
        </div>
      </ErrorBoundary>
    );
  }

  if (loading && !cards) {
    return (
      <ErrorBoundary>
        <div className="flex h-full bg-surface-dashboard">
          <LoadingPage />
        </div>
      </ErrorBoundary>
    );
  }

  if (loadError) {
    return (
      <ErrorBoundary>
        <div className="flex h-full bg-surface-dashboard items-center justify-center">
          <ErrorState message={loadError} onRetry={loadCards} />
        </div>
      </ErrorBoundary>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <ErrorBoundary>
        <div className="flex h-full bg-surface-dashboard items-center justify-center">
          <EmptyState
            title="Sin flashcards"
            description="Este tema todavía no tiene flashcards del profesor. La sesión adaptativa necesita un punto de partida."
            actionLabel="Volver"
            onAction={goBack}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // ── Main phase-driven render ──
  return (
    <ErrorBoundary>
      <div className="flex h-full bg-surface-dashboard relative overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {session.phase === 'idle' && (
              <AdaptiveIdleLanding
                key="idle"
                topicTitle={topicTitle}
                cardCount={totalCards}
                onStart={handleStart}
                onBack={goBack}
              />
            )}

            {session.phase === 'reviewing' && session.currentCard && (
              <SessionScreen
                key={`session-round-${session.currentRound?.roundNumber ?? 0}`}
                cards={session.sessionCards}
                currentIndex={session.currentIndex}
                isRevealed={session.isRevealed}
                setIsRevealed={session.setIsRevealed}
                handleRate={session.handleRate}
                sessionStats={session.sessionStats}
                courseColor={ADAPTIVE_ACCENT}
                onBack={goBack}
              />
            )}

            {session.phase === 'generating' && session.generationProgress && (
              <AdaptiveGenerationScreen
                key="generating"
                progress={session.generationProgress}
                onCancel={session.abortGeneration}
              />
            )}

            {session.phase === 'partial-summary' && (
              <AdaptivePartialSummary
                key="partial"
                allStats={session.allStats}
                completedRounds={session.completedRounds}
                keywordMastery={session.keywordMastery}
                topicSummary={session.topicSummary}
                masteryLoading={session.masteryLoading}
                masteryDeltas={session.masteryDeltas.current}
                lastGenerationResult={session.lastGenerationResult}
                generationError={session.generationError}
                onGenerateMore={session.generateMore}
                onFinish={handleFinishAndExit}
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
                onExit={handleExitAfterCompletion}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default AdaptiveFlashcardView;
