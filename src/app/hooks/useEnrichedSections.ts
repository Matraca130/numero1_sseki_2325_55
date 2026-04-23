// ============================================================
// useEnrichedSections — Inject cached flashcards + mastery
// into the content-tree sections.
//
// Split out of useFlashcardNavigation (Finding #11).
// Owns:
//   - per-topic memoization ref (enrichedTopicCache)
//   - enrichedSections / allFlashcards
//   - enrichedSelectedSection / enrichedSelectedTopic
//   - cache reset on course change
//
// Mastery enrichment uses the shared study-queue data:
//   p_know (0-1) → mastery (0-5 bucket) for UI display.
//
// Scope note: this file only displays mastery values
// produced elsewhere — it does not define thresholds
// across systems A/B/C (see MASTERY-SYSTEMS.md).
// ============================================================

import { useEffect, useMemo, useRef } from 'react';
import type { Section, Topic, Flashcard } from '@/app/types/content';
import type { StudyQueueItem } from '@/app/lib/studyQueueApi';
import { lruGet, type LruCardCache } from './useCardCache';

// ── Helper: convert p_know (0-1) to mastery (0-5) ────────
// Display-only bucket (UI). Not a system-A/B/C threshold.

function pKnowToMastery(pKnow: number): number {
  if (pKnow >= 0.90) return 5;
  if (pKnow >= 0.75) return 4;
  if (pKnow >= 0.60) return 3;
  if (pKnow >= 0.40) return 2;
  if (pKnow >= 0.20) return 1;
  return 0;
}

// ── Helper: enrich cards with study-queue mastery data ────

function enrichCardWithMastery(
  card: Flashcard,
  sqMap: Map<string, StudyQueueItem>,
): Flashcard {
  const sq = sqMap.get(card.id);
  if (!sq) return card;
  return {
    ...card,
    mastery: pKnowToMastery(sq.p_know),
    fsrs_state: sq.fsrs_state,
    due_at: sq.due_at || undefined,
  };
}

export interface UseEnrichedSectionsArgs {
  allSections: Section[];
  cardCache: LruCardCache;
  masteryMap: Map<string, StudyQueueItem>;
  selectedSection: Section | null;
  selectedTopic: Topic | null;
  /** Used to reset the enrichedTopicCache on course change */
  currentCourseId: string;
}

export function useEnrichedSections({
  allSections,
  cardCache,
  masteryMap,
  selectedSection,
  selectedTopic,
  currentCourseId,
}: UseEnrichedSectionsArgs) {
  // ── Inject cached flashcards + mastery into sections ────
  const enrichedTopicCache = useRef(
    new Map<string, { cards: Flashcard[]; cacheRef: Flashcard[]; mapRef: Map<string, StudyQueueItem> }>(),
  );

  const enrichedSections = useMemo(() => {
    const topicCache = enrichedTopicCache.current;
    return allSections.map(section => ({
      ...section,
      topics: section.topics.map(topic => {
        const cached = lruGet(cardCache, topic.id) || [];
        const prev = topicCache.get(topic.id);

        if (prev && prev.cacheRef === cached && prev.mapRef === masteryMap) {
          return { ...topic, flashcards: prev.cards };
        }

        const enriched = cached.map(card => enrichCardWithMastery(card, masteryMap));
        topicCache.set(topic.id, { cards: enriched, cacheRef: cached, mapRef: masteryMap });
        return { ...topic, flashcards: enriched };
      }),
    }));
  }, [allSections, cardCache, masteryMap]);

  const allFlashcards = useMemo(
    () => enrichedSections.flatMap(sec => sec.topics.flatMap(t => t.flashcards || [])),
    [enrichedSections],
  );

  // Keep selectedSection/selectedTopic enriched
  const enrichedSelectedSection = useMemo(() => {
    if (!selectedSection) return null;
    return {
      ...selectedSection,
      topics: selectedSection.topics.map(t => ({
        ...t,
        flashcards: (lruGet(cardCache, t.id) || t.flashcards || []).map(
          card => enrichCardWithMastery(card, masteryMap),
        ),
      })),
    };
  }, [selectedSection, cardCache, masteryMap]);

  const enrichedSelectedTopic = useMemo(() => {
    if (!selectedTopic) return null;
    return {
      ...selectedTopic,
      flashcards: (lruGet(cardCache, selectedTopic.id) || selectedTopic.flashcards || []).map(
        card => enrichCardWithMastery(card, masteryMap),
      ),
    };
  }, [selectedTopic, cardCache, masteryMap]);

  // Reset per-topic memoization on course change
  useEffect(() => {
    enrichedTopicCache.current.clear();
  }, [currentCourseId]);

  return {
    enrichedSections,
    allFlashcards,
    enrichedSelectedSection,
    enrichedSelectedTopic,
    /** Exposed for consumers that need to enrich a single card ad-hoc */
    enrichCardWithMastery,
  };
}
