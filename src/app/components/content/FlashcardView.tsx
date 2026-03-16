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
//
// v4.4.6: Removed old handleLoadKeywords (SmartFlashcardGenerator removed).
//
// v4.5.0 (Fase 5): Adaptive session extracted to AdaptiveFlashcardView.
//   DeckScreen "Con IA" button navigates to /student/adaptive-session.
//   No more dual-track pattern — FlashcardView only runs the normal engine.
// ============================================================

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence } from 'motion/react';
import { useFlashcardNavigation, type KeywordProgress } from '@/app/hooks/useFlashcardNavigation';
import { useFlashcardEngine } from '@/app/hooks/useFlashcardEngine';
import { useAuth } from '@/app/context/AuthContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { useStudyQueueData } from '@/app/hooks/useStudyQueueData';
import { useTopicMastery } from '@/app/hooks/useTopicMastery';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';

// ── Extracted sub-screens ──
import { HubScreen, SectionScreen, DeckScreen, SessionScreen, SummaryScreen } from './flashcard';

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export function FlashcardView() {
  const { user } = useAuth();
  const studentId = user?.id || null;
  const navigate = useNavigate();

  const nav = useFlashcardNavigation();
  const { selectedTopicId } = useContentTree();

  // ── T-01: Topic mastery from flashcard-mappings + FSRS ──
  const courseId = nav.currentCourse.id === 'empty' ? null : nav.currentCourse.id;
  const sqData = useStudyQueueData(courseId);
  const topicMastery = useTopicMastery(sqData.queue, sqData.loading);

  // ── Non-adaptive engine (existing, unchanged) ────────────
  const engine = useFlashcardEngine({
    studentId,
    courseId: nav.currentCourse.id,
    topicId: nav.selectedTopic?.id,
    masteryMap: nav.masteryMap,
    onFinish: () => {
      nav.applyOptimisticMastery(engine.optimisticUpdates.current);
      // Invalidate keyword mastery so DeckScreen re-fetches with fresh BKT data
      nav.invalidateKeywordMastery(nav.selectedTopic?.id);
      nav.setViewState('summary');
      nav.refreshMastery();
    },
  });

  // ── Sync TopicSidebar selection → FlashcardNavigation ──
  const prevSyncedTopicId = useRef<string | null>(null);

  useEffect(() => {
    if (selectedTopicId === null && prevSyncedTopicId.current !== null) {
      prevSyncedTopicId.current = null;
      nav.goToHub();
      return;
    }

    if (!selectedTopicId) return;
    if (selectedTopicId === prevSyncedTopicId.current) return;
    if (selectedTopicId === nav.selectedTopic?.id) return;

    prevSyncedTopicId.current = selectedTopicId;

    for (const section of nav.allSections) {
      const topic = section.topics.find(t => t.id === selectedTopicId);
      if (topic) {
        nav.openDeck(topic);
        return;
      }
    }

    if (import.meta.env.DEV) {
      console.warn(`[FlashcardView] Topic ${selectedTopicId} not found in sections`);
    }
  }, [selectedTopicId, nav.allSections]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Normal flow callbacks (unchanged) ──────────────────
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

  // ── Adaptive: navigate to separate route ───────────────
  const handleStartAdaptive = useCallback(() => {
    const topic = nav.selectedTopic;
    if (!topic) return;
    const params = new URLSearchParams({
      topicId: topic.id,
      courseId: nav.currentCourse.id,
      topicTitle: topic.title || 'Sesión Adaptativa',
    });
    navigate(`/student/adaptive-session?${params.toString()}`);
  }, [nav.selectedTopic, nav.currentCourse.id, navigate]);

  // ── Keyword progress for DeckScreen (Fase 6) ─────────
  const currentKeywordProgress = useMemo((): KeywordProgress | undefined => {
    const topicId = nav.selectedTopic?.id;
    if (!topicId) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    void nav.kwProgressVersion; // trigger recalc when cache updates
    const summary = nav.kwMasteryCache.current.get(topicId);
    if (!summary) return undefined;

    // T-01: Enrich with FSRS coverage stats from flashcard-mappings
    let fsrsCoverage: KeywordProgress['fsrsCoverage'];
    if (!topicMastery.loading && topicMastery.keywordStats.size > 0) {
      const topicCards = nav.selectedTopic?.flashcards || [];
      const topicKeywordIds = new Set(topicCards.map(c => c.keyword_id).filter(Boolean));

      let totalMapped = 0;
      let scheduledCards = 0;
      let dueCards = 0;
      let newCards = 0;

      for (const kwId of topicKeywordIds) {
        const stats = topicMastery.keywordStats.get(kwId!);
        if (stats) {
          totalMapped += stats.totalCards;
          scheduledCards += stats.scheduledCards;
          dueCards += stats.dueCards;
          newCards += stats.newCards;
        }
      }

      fsrsCoverage = {
        totalMapped,
        scheduledCards,
        dueCards,
        newCards,
        coverage: totalMapped > 0 ? scheduledCards / totalMapped : 0,
      };
    }

    return {
      keywordsMastered: summary.keywordsMastered,
      keywordsTotal: summary.keywordsTotal,
      overallMastery: summary.overallMastery,
      weakestKeywordName: summary.weakestKeywords[0]?.name,
      fsrsCoverage,
    };
  }, [nav.selectedTopic?.id, nav.kwProgressVersion, nav.kwMasteryCache, topicMastery.loading, topicMastery.keywordStats, nav.selectedTopic?.flashcards]);

  // ── Render ─────────────────────────────────────────

  return (
    <ErrorBoundary>
      <div className="flex h-full bg-surface-dashboard relative overflow-hidden">
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
                onStartAdaptive={handleStartAdaptive}
                keywordProgress={currentKeywordProgress}
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
                masteryMap={nav.masteryMap}
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
                onStartAdaptive={handleStartAdaptive}
              />
            )}

          </AnimatePresence>
        </div>
      </div>
    </ErrorBoundary>
  );
}