import React from 'react';
import { AnimatePresence } from 'motion/react';
import { useFlashcardNavigation } from '@/app/hooks/useFlashcardNavigation';
import { useFlashcardEngine } from '@/app/hooks/useFlashcardEngine';
import { useAuth } from '@/app/context/AuthContext';

// ── Extracted sub-screens ──
import { HubScreen, SectionScreen, DeckScreen, SessionScreen, SummaryScreen } from './flashcard';

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export function FlashcardView() {
  // Use real auth user ID (not StudentDataContext mock)
  const { user } = useAuth();
  const studentId = user?.id || null;

  const nav = useFlashcardNavigation();

  const engine = useFlashcardEngine({
    studentId,
    courseId: nav.currentCourse.id,
    topicId: nav.selectedTopic?.id,
    onFinish: () => nav.setViewState('summary'),
  });

  return (
    <div className="flex flex-col h-full bg-surface-dashboard relative overflow-hidden">
      <AnimatePresence mode="wait">
        {nav.viewState === 'hub' && (
          <HubScreen
            key="hub"
            sections={nav.allSections}
            allCards={nav.allFlashcards}
            courseColor={nav.currentCourse.color}
            courseName={nav.currentCourse.name}
            onOpenSection={nav.openSection}
            onStartAll={() => { engine.startSession(nav.allFlashcards); nav.setViewState('session'); }}
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
            onStartSection={(cards) => { engine.startSession(cards); nav.setViewState('session'); }}
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
            onStart={(cards) => { engine.startSession(cards); nav.setViewState('session'); }}
            onBack={nav.goBack}
            onStudyTopic={nav.studySelectedTopic}
          />
        )}
        {nav.viewState === 'session' && (
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
            onRestart={() => { engine.restartSession(); nav.setViewState('session'); }}
            onExit={nav.goBack}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
