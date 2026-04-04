// ============================================================
// FlashcardView — Student flashcard study area
//
// v4.5.0 (Fase 5): Adaptive session extracted to AdaptiveFlashcardView.
//   DeckScreen "Con IA" button navigates to /student/adaptive-session.
// ============================================================

import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence } from 'motion/react';
import { useFlashcardNavigation, type KeywordProgress } from '@/app/hooks/useFlashcardNavigation';
import { apiCall } from '@/app/lib/api';
import { useFlashcardEngine } from '@/app/hooks/useFlashcardEngine';
import { useAuth } from '@/app/context/AuthContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { useFlashcardCoverage } from '@/app/hooks/useFlashcardCoverage';
import { useUI } from '@/app/context/UIContext';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';

import { HubScreen, SectionScreen, DeckScreen, SessionScreen, SummaryScreen } from './flashcard';

export function FlashcardView() {
  const { user } = useAuth();
  const studentId = user?.id || null;
  const navigate = useNavigate();
  const { setActiveSummaryId } = useUI();

  const nav = useFlashcardNavigation();
  const { selectedTopicId } = useContentTree();

  // T-01: Topic mastery from flashcard-mappings + FSRS
  // Reuse nav hook's sqData (already handles multi-course fetch)
  const coverage = useFlashcardCoverage(nav.sqData.queue, nav.sqData.loading);

  const engine = useFlashcardEngine({
    studentId,
    courseId: nav.currentCourse.id,
    topicId: nav.selectedTopic?.id,
    masteryMap: nav.masteryMap,
    onFinish: () => {
      nav.applyOptimisticMastery(engine.optimisticUpdates.current);
      nav.invalidateKeywordMastery(nav.selectedTopic?.id);
      nav.setViewState('summary');
      nav.refreshMastery();
    },
  });

  // Sync TopicSidebar selection
  const prevSyncedTopicId = useRef<string | null>(null);
  useEffect(() => {
    if (selectedTopicId === null && prevSyncedTopicId.current !== null) {
      prevSyncedTopicId.current = null; nav.goToHub(); return;
    }
    if (!selectedTopicId) return;
    if (selectedTopicId === prevSyncedTopicId.current) return;
    if (selectedTopicId === nav.selectedTopic?.id) return;
    prevSyncedTopicId.current = selectedTopicId;
    for (const section of nav.allSections) {
      const topic = section.topics.find(t => t.id === selectedTopicId);
      if (topic) { nav.openDeck(topic); return; }
    }
    if (import.meta.env.DEV) console.warn(`[FlashcardView] Topic ${selectedTopicId} not found`);
  }, [selectedTopicId, nav.allSections]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartAll = useCallback(() => { engine.startSession(nav.allFlashcards); nav.setViewState('session'); }, [engine, nav]);
  const handleStartSection = useCallback((cards: import('@/app/types/content').Flashcard[]) => { engine.startSession(cards); nav.setViewState('session'); }, [engine, nav]);
  const handleStartDeck = useCallback((cards: import('@/app/types/content').Flashcard[]) => { engine.startSession(cards); nav.setViewState('session'); }, [engine, nav]);
  const handleRestart = useCallback(() => { engine.restartSession(); nav.setViewState('session'); }, [engine, nav]);

  const realMasteryPercent = useMemo(() => {
    if (nav.viewState !== 'summary') return undefined;
    const deltas = engine.masteryDeltas.current;
    if (deltas.length === 0) return undefined;
    const allZeroDelta = deltas.every(d => d.after === 0 && d.before === 0);
    if (allZeroDelta) return undefined;
    return Math.round((deltas.reduce((s, d) => s + d.after, 0) / deltas.length) * 100);
  }, [nav.viewState, engine.masteryDeltas]);

  const handleStartAdaptive = useCallback(() => {
    const topic = nav.selectedTopic;
    if (!topic) return;
    const params = new URLSearchParams({ topicId: topic.id, courseId: nav.currentCourse.id, topicTitle: topic.title || 'Sesión Adaptativa' });
    navigate(`/student/adaptive-session?${params.toString()}`);
  }, [nav.selectedTopic, nav.currentCourse.id, navigate]);

  // ── Derived props for StudentCreateModal ──
  // Prefer summary_id from existing cards; fallback to fetching for empty decks
  const [fetchedSummaryId, setFetchedSummaryId] = useState<string>('');
  const cardSummaryId = nav.selectedTopic?.flashcards?.[0]?.summary_id || '';
  const currentSummaryId = cardSummaryId || fetchedSummaryId;

  // Lift summaryId to layout so AI assistant can use it (AXO-131)
  useEffect(() => {
    setActiveSummaryId(currentSummaryId || undefined);
    return () => setActiveSummaryId(undefined);
  }, [currentSummaryId, setActiveSummaryId]);

  useEffect(() => {
    const topicId = nav.selectedTopic?.id;
    if (!topicId || cardSummaryId) { return; }
    let cancelled = false;
    apiCall<any>(`/summaries?topic_id=${topicId}`)
      .then(data => {
        if (cancelled) return;
        const items = Array.isArray(data) ? data : data?.items || [];
        if (items[0]?.id) setFetchedSummaryId(items[0].id);
      })
      .catch(() => { /* non-fatal: button stays hidden */ });
    return () => { cancelled = true; };
  }, [nav.selectedTopic?.id, cardSummaryId]);

  const currentKeywords = useMemo((): Array<{ id: string; name: string }> => {
    const topicId = nav.selectedTopic?.id;
    if (!topicId) return [];
    const summary = nav.kwMasteryCache.current.get(topicId);
    if (!summary) return [];
    return summary.allKeywordsByMastery.map(kw => ({ id: kw.keyword_id, name: kw.name }));
  }, [nav.selectedTopic?.id, nav.kwProgressVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCardCreated = useCallback(() => {
    const topicId = nav.selectedTopic?.id;
    if (topicId) nav.reloadTopicCards(topicId);
  }, [nav]);

  // Keyword progress for DeckScreen (Fase 6)
  const currentKeywordProgress = useMemo((): KeywordProgress | undefined => {
    const topicId = nav.selectedTopic?.id;
    if (!topicId) return undefined;
    void nav.kwProgressVersion;
    const summary = nav.kwMasteryCache.current.get(topicId);
    if (!summary) return undefined;

    let fsrsCoverage: KeywordProgress['fsrsCoverage'];
    if (!coverage.loading && coverage.keywordStats.size > 0) {
      const topicCards = nav.selectedTopic?.flashcards || [];
      const topicKeywordIds = new Set(topicCards.map(c => c.keyword_id).filter(Boolean));
      let totalMapped = 0, scheduledCards = 0, dueCards = 0, newCards = 0;
      for (const kwId of topicKeywordIds) {
        const stats = coverage.keywordStats.get(kwId!);
        if (stats) { totalMapped += stats.totalCards; scheduledCards += stats.scheduledCards; dueCards += stats.dueCards; newCards += stats.newCards; }
      }
      fsrsCoverage = { totalMapped, scheduledCards, dueCards, newCards, coverage: totalMapped > 0 ? scheduledCards / totalMapped : 0 };
    }

    return {
      keywordsMastered: summary.keywordsMastered, keywordsTotal: summary.keywordsTotal,
      overallMastery: summary.overallMastery, weakestKeywordName: summary.weakestKeywords[0]?.name, fsrsCoverage,
    };
  }, [nav.selectedTopic?.id, nav.kwProgressVersion, nav.kwMasteryCache, coverage.loading, coverage.keywordStats, nav.selectedTopic?.flashcards]);

  return (
    <ErrorBoundary>
      <div className="flex h-full bg-surface-dashboard relative overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {nav.viewState === 'hub' && (
              <HubScreen key="hub" sections={nav.allSections} allCards={nav.allFlashcards} courseColor={nav.currentCourse.color} courseName={nav.currentCourse.name} userName={user?.name || 'Estudiante'} onOpenSection={nav.openSection} onOpenDeck={nav.openDeck} onStartAll={handleStartAll} onBack={nav.goBack} />
            )}
            {nav.viewState === 'section' && nav.selectedSection && (
              <SectionScreen key="section" section={nav.selectedSection} sectionIdx={nav.selectedSectionIdx} courseColor={nav.currentCourse.color} onOpenDeck={nav.openDeck} onStartSection={handleStartSection} onBack={nav.goBack} />
            )}
            {nav.viewState === 'deck' && nav.selectedTopic && (
              <DeckScreen key="deck" topic={nav.selectedTopic} sectionIdx={nav.selectedSectionIdx} sectionName={nav.selectedSection?.title || ''} onStart={handleStartDeck} onBack={nav.goBack} onStudyTopic={nav.studySelectedTopic} onStartAdaptive={handleStartAdaptive} keywordProgress={currentKeywordProgress} summaryId={currentSummaryId} keywords={currentKeywords} onCardCreated={handleCardCreated} />
            )}
            {nav.viewState === 'session' && engine.sessionCards.length > 0 && (
              <SessionScreen key="session" cards={engine.sessionCards} currentIndex={engine.currentIndex} isRevealed={engine.isRevealed} setIsRevealed={engine.setIsRevealed} handleRate={engine.handleRate} sessionStats={engine.sessionStats} courseColor={nav.currentCourse.color} onBack={nav.goBack} masteryMap={nav.masteryMap} />
            )}
            {nav.viewState === 'summary' && (
              <SummaryScreen key="summary" stats={engine.sessionStats} courseColor={nav.currentCourse.color} courseId={nav.currentCourse.id} courseName={nav.currentCourse.name} topicId={nav.selectedTopic?.id || null} topicTitle={nav.selectedTopic?.title || null} realMasteryPercent={realMasteryPercent} totalMastered={nav.allFlashcards.filter(c => c.mastery >= 4).length} totalCards={nav.allFlashcards.length} masteryDeltas={engine.masteryDeltas.current} onRestart={handleRestart} onExit={nav.goBack} onStartAdaptive={handleStartAdaptive} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </ErrorBoundary>
  );
}