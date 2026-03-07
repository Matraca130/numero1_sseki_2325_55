// ============================================================
// FlashcardView — Student flashcard study area
//
// NAVIGATION:
//   TopicSidebar (from StudentLayout) handles topic selection.
//   FlashcardView reads selectedTopicId from ContentTreeContext
//   and syncs with useFlashcardNavigation's internal state.
//
// PERF v4.4.3:
//   [L1] Inline closures extracted to useCallback to stabilize
//        child prop references across renders.
//   [L2] realMasteryPercent computed only when viewState === 'summary',
//        avoiding wasted computation on every render.
// ============================================================

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { useFlashcardNavigation } from '@/app/hooks/useFlashcardNavigation';
import { useFlashcardEngine } from '@/app/hooks/useFlashcardEngine';
import { useAuth } from '@/app/context/AuthContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import { getTopicKeywords, getCourseKeywords } from '@/app/services/studentApi';

// ── Extracted sub-screens ──
import { HubScreen, SectionScreen, DeckScreen, SessionScreen, SummaryScreen } from './flashcard';

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export function FlashcardView() {
  // Use real auth user ID (not StudentDataContext mock)
  const { user } = useAuth();
  const studentId = user?.id || null;

  const nav = useFlashcardNavigation();
  const { selectedTopicId } = useContentTree();

  const engine = useFlashcardEngine({
    studentId,
    courseId: nav.currentCourse.id,
    topicId: nav.selectedTopic?.id,
    masteryMap: nav.masteryMap,
    onFinish: () => {
      // 1. Apply optimistic mastery FIRST (instant UI update)
      nav.applyOptimisticMastery(engine.optimisticUpdates.current);

      // 2. Navigate to summary
      nav.setViewState('summary');

      // 3. Refresh from backend (authoritative data, replaces optimistic)
      nav.refreshMastery();
    },
  });

  // ── Sync TopicSidebar selection → FlashcardNavigation ──
  // When the user clicks a topic in TopicSidebar (ContentTreeContext),
  // sync that selection into useFlashcardNavigation's internal state.
  // When selectedTopicId is cleared (null), reset to hub landing.
  const prevSyncedTopicId = useRef<string | null>(null);

  useEffect(() => {
    // If selectedTopicId was cleared → reset to hub landing page
    if (selectedTopicId === null && prevSyncedTopicId.current !== null) {
      prevSyncedTopicId.current = null;
      nav.goToHub();
      return;
    }

    if (!selectedTopicId) return;
    if (selectedTopicId === prevSyncedTopicId.current) return;
    if (selectedTopicId === nav.selectedTopic?.id) return;

    prevSyncedTopicId.current = selectedTopicId;

    // Find the topic in the enriched sections
    for (const section of nav.allSections) {
      const topic = section.topics.find(t => t.id === selectedTopicId);
      if (topic) {
        nav.openDeck(topic);
        return;
      }
    }

    // Topic not found in loaded sections — might still be loading
    if (import.meta.env.DEV) {
      console.warn(`[FlashcardView] Topic ${selectedTopicId} not found in sections`);
    }
  }, [selectedTopicId, nav.allSections]); // eslint-disable-line react-hooks/exhaustive-deps

  // [L1] Extracted inline closures to useCallback for stable references
  const handleStartAll = useCallback(() => {
    engine.startSession(nav.allFlashcards);
    nav.setViewState('session');
  }, [engine, nav]);

  const handleStartSection = useCallback((cards: import('@/app/types/content').Flashcard[]) => {
    engine.startSession(cards);
    nav.setViewState('session');
  }, [engine, nav]);

  const handleStartDeck = useCallback((cards: import('@/app/types/content').Flashcard[]) => {
    engine.startSession(cards);
    nav.setViewState('session');
  }, [engine, nav]);

  const handleRestart = useCallback(() => {
    engine.restartSession();
    nav.setViewState('session');
  }, [engine, nav]);

  const handleLoadKeywords = useCallback(async (cId: string, tId: string | null) => {
    if (tId) {
      return getTopicKeywords(cId, tId, studentId || undefined);
    }
    return getCourseKeywords(cId, studentId || undefined);
  }, [studentId]);

  // [L2] Compute realMasteryPercent only when summary is shown
  const realMasteryPercent = useMemo(() => {
    if (nav.viewState !== 'summary') return undefined;
    const deltas = engine.masteryDeltas.current;
    if (deltas.length === 0) return undefined;
    const allZeroDelta = deltas.every(d => d.after === 0 && d.before === 0);
    if (allZeroDelta) return undefined;
    return Math.round(
      (deltas.reduce((s, d) => s + d.after, 0) / deltas.length) * 100,
    );
  }, [nav.viewState, engine.masteryDeltas]);

  return (
    <ErrorBoundary>
      <div className="flex h-full bg-surface-dashboard relative overflow-hidden">
        {/* ── Main content area (full width — sidebar is in StudentLayout) ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {nav.viewState === 'hub' && (
              <HubScreen
                key="hub"
                sections={nav.allSections}
                allCards={nav.allFlashcards}
                courseColor={nav.currentCourse.color}
                courseName={nav.currentCourse.name}
                userName={user?.name || 'Estudiante'}
                onOpenSection={nav.openSection}
                onOpenDeck={nav.openDeck}
                onStartAll={handleStartAll}
                onBack={nav.goBack}
              />
            )}
            {nav.viewState === 'section' && nav.selectedSection && (
              <SectionScreen
                key="section"
                section={nav.selectedSection}
                sectionIdx={nav.selectedSectionIdx}
                courseColor={nav.currentCourse.color}
                onOpenDeck={nav.openDeck}
                onStartSection={handleStartSection}
                onBack={nav.goBack}
              />
            )}
            {nav.viewState === 'deck' && nav.selectedTopic && (
              <DeckScreen
                key="deck"
                topic={nav.selectedTopic}
                sectionIdx={nav.selectedSectionIdx}
                sectionName={nav.selectedSection?.title || ''}
                courseColor={nav.currentCourse.color}
                onStart={handleStartDeck}
                onBack={nav.goBack}
                onStudyTopic={nav.studySelectedTopic}
              />
            )}
            {nav.viewState === 'session' && engine.sessionCards.length > 0 && (
              <SessionScreen
                key="session"
                cards={engine.sessionCards}
                currentIndex={engine.currentIndex}
                isRevealed={engine.isRevealed}
                setIsRevealed={engine.setIsRevealed}
                handleRate={engine.handleRate}
                sessionStats={engine.sessionStats}
                courseColor={nav.currentCourse.color}
                onBack={nav.goBack}
              />
            )}
            {nav.viewState === 'summary' && (
              <SummaryScreen
                key="summary"
                stats={engine.sessionStats}
                courseColor={nav.currentCourse.color}
                courseId={nav.currentCourse.id}
                courseName={nav.currentCourse.name}
                topicId={nav.selectedTopic?.id || null}
                topicTitle={nav.selectedTopic?.title || null}
                realMasteryPercent={realMasteryPercent}
                totalMastered={nav.allFlashcards.filter(c => c.mastery >= 4).length}
                totalCards={nav.allFlashcards.length}
                masteryDeltas={engine.masteryDeltas.current}
                onRestart={handleRestart}
                onExit={nav.goBack}
                onLoadKeywords={handleLoadKeywords}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </ErrorBoundary>
  );
}