// ============================================================
// useViewStateMachine — Flashcard hub navigation state machine
//
// Split out of useFlashcardNavigation (Finding #11).
// Owns the current view + selection primitives:
//   - viewState (hub / section / deck / session / summary)
//   - selectedSection / selectedTopic / selectedSectionIdx
//   - goBack / goToHub (pure transitions; navigateTo passed in)
//   - reset effect on course change
//
// Cross-cutting actions (openSection, openDeck) stay in the
// main composer because they close over cardCache + mastery.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import type { Section, Topic } from '@/app/types/content';
import type { FlashcardViewState } from './flashcard-types';

export interface UseViewStateMachineArgs {
  /** Used by goBack when viewState is 'hub' → delegates out of the flashcard section */
  navigateTo: (route: string) => void;
  /** Identity used to reset state when the active course changes */
  currentCourseId: string;
}

export function useViewStateMachine({ navigateTo, currentCourseId }: UseViewStateMachineArgs) {
  const [viewState, setViewState] = useState<FlashcardViewState>('hub');
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSectionIdx, setSelectedSectionIdx] = useState(0);

  const goBack = useCallback(() => {
    if (viewState === 'summary' || viewState === 'session') {
      setViewState('hub');
      setSelectedTopic(null);
      setSelectedSection(null);
    } else if (viewState === 'deck') {
      setViewState('hub');
      setSelectedTopic(null);
      setSelectedSection(null);
    } else if (viewState === 'section') {
      setViewState('hub');
      setSelectedSection(null);
    } else {
      navigateTo('study');
    }
  }, [viewState, navigateTo]);

  const goToHub = useCallback(() => {
    setViewState('hub');
    setSelectedTopic(null);
    setSelectedSection(null);
  }, []);

  // Reset on course change
  useEffect(() => {
    setViewState('hub');
    setSelectedSection(null);
    setSelectedTopic(null);
  }, [currentCourseId]);

  return {
    viewState,
    setViewState,
    selectedSection,
    setSelectedSection,
    selectedTopic,
    setSelectedTopic,
    selectedSectionIdx,
    setSelectedSectionIdx,
    goBack,
    goToHub,
  };
}
