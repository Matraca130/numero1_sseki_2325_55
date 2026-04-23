// ============================================================
// useFlashcardNavigation — View state machine + navigation
//
// REFACTORED v4.5 (Finding #11 — composer split):
//   Thin composer that wires together three focused sub-hooks:
//     - useViewStateMachine  (view + selection primitives)
//     - useCardCache         (LRU-bounded flashcard cache + loader)
//     - useEnrichedSections  (inject cards + mastery into tree)
//
//   This file keeps only cross-cutting concerns that need access
//   to multiple sub-hooks:
//     - buildCourseFromTree  (tree → Course adapter)
//     - studyQueueCourseId wiring + masteryMap/refreshMastery
//     - keyword-mastery cache (lazy, per-topic summaries)
//     - openSection / openDeck / studySelectedTopic
//     - applyOptimisticMastery (optimistic patches into sqData)
//
// The public return shape is UNCHANGED — 22 keys — so existing
// consumers keep working without edits.
//
// PERF / MASTERY notes:
//   [C1] Batch endpoint + N+1 fallback lives in useCardCache.
//   [C2] Per-topic memoization for enriched sections lives in
//        useEnrichedSections.
//   Mastery enrichment is DISPLAY-ONLY (p_know → 0-5 bucket);
//   it does not define system-A/B/C thresholds. See MASTERY-SYSTEMS.md.
//
// CONNECTED TO REAL BACKEND:
//   - Structure from ContentTreeContext (content-tree API)
//   - Flashcards from GET /flashcards?summary_id=xxx (or batch)
//   - Mastery from shared useStudyQueueData (FSRS+BKT)
// ============================================================

import { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { useNavigation } from '@/app/context/NavigationContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import {
  useStudyQueueData,
  invalidateStudyQueueCache,
  STUDY_QUEUE_ALL_COURSES,
} from '@/app/hooks/useStudyQueueData';
import {
  fetchKeywordMasteryByTopic,
  computeTopicMasterySummary,
  type TopicMasterySummary,
} from '@/app/services/keywordMasteryApi';
import type { StudyQueueItem } from '@/app/lib/studyQueueApi';
import type { OptimisticCardUpdate } from './useFlashcardEngine';
import type { Section, Topic, Course } from '@/app/types/content';

// Sub-hooks (Finding #11 split)
import { useCardCache, lruGet } from './useCardCache';
import { useViewStateMachine } from './useViewStateMachine';
import { useEnrichedSections } from './useEnrichedSections';

// ── Build Course from ContentTree ─────────────────────────

function buildCourseFromTree(tree: any): Course {
  if (!tree || !tree.courses || tree.courses.length === 0) {
    return {
      id: 'empty',
      name: 'Sin Curso',
      color: 'bg-[#2a8c7a]',
      accentColor: 'text-[#2a8c7a]',
      semesters: [],
    };
  }

  // Merge ALL courses into one virtual course for the flashcard hub.
  // The hub displays everything together — no need to separate by course.
  const allSemesters = tree.courses.flatMap((course: any) =>
    (course.semesters || []).map((sem: any) => ({
      id: sem.id,
      title: sem.name || 'Semestre',
      sections: (sem.sections || []).map((sec: any) => ({
        id: sec.id,
        title: sec.name || 'Seccion',
        imageUrl: undefined,
        topics: (sec.topics || []).map((t: any) => ({
          id: t.id,
          title: t.name || 'Topico',
          summary: '',
          flashcards: [], // will be loaded lazily
        })),
      })),
    }))
  );

  // Use first course with actual content for ID (study-queue compatibility).
  // Skip empty courses so mastery data loads for the right course.
  const firstCourseWithContent = tree.courses.find((c: any) =>
    (c.semesters || []).some((s: any) =>
      (s.sections || []).some((sec: any) =>
        (sec.topics || []).length > 0
      )
    )
  ) || tree.courses[0];

  return {
    id: firstCourseWithContent.id,
    name: firstCourseWithContent.name || 'Curso',
    color: 'bg-[#2a8c7a]',
    accentColor: 'text-[#2a8c7a]',
    semesters: allSemesters,
  };
}

// ── Keyword Progress type (for DeckScreen display) ────────

export interface KeywordProgress {
  keywordsMastered: number;
  keywordsTotal: number;
  overallMastery: number;
  weakestKeywordName?: string;
  /** T-01: Per-keyword FSRS coverage stats from flashcard-mappings */
  fsrsCoverage?: {
    /** Total flashcards mapped across all keywords in this topic */
    totalMapped: number;
    /** Cards with FSRS scheduling data (have been studied at least once) */
    scheduledCards: number;
    /** Cards due now */
    dueCards: number;
    /** New cards (never reviewed) */
    newCards: number;
    /** Coverage ratio [0-1] */
    coverage: number;
  };
}

// ══════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════

export function useFlashcardNavigation() {
  const { setCurrentTopic } = useNavigation();
  const { tree, loading: treeLoading } = useContentTree();
  const { navigateTo } = useStudentNav();

  // ── Course / tree adapter ──────────────────────────────
  const currentCourse = useMemo(() => buildCourseFromTree(tree), [tree]);

  // Derived: all sections (flattened from semesters)
  const allSections = useMemo(
    () => currentCourse.semesters.flatMap(sem => sem.sections),
    [currentCourse],
  );

  // ── Shared study-queue data ────────────────────────────
  // When multiple courses have content, fetch ALL study-queue data
  // (no course filter) so mastery is displayed for every course's
  // flashcards in the merged hub.
  // NOTE: coursesWithContentCount is a primitive (number), so
  // studyQueueCourseId won't recompute on unstable tree ref changes.
  const coursesWithContentCount = useMemo(() => {
    if (!tree?.courses) return 0;
    return tree.courses.filter((c: any) =>
      (c.semesters || []).some((s: any) =>
        (s.sections || []).some((sec: any) => (sec.topics || []).length > 0)
      )
    ).length;
  }, [tree]);

  const studyQueueCourseId = useMemo(() => {
    if (currentCourse.id === 'empty') return null;
    return coursesWithContentCount > 1 ? STUDY_QUEUE_ALL_COURSES : currentCourse.id;
  }, [currentCourse.id, coursesWithContentCount]);

  const sqData = useStudyQueueData(studyQueueCourseId);

  // Backward-compat: expose masteryMap as flashcard_id → StudyQueueItem
  const masteryMap = sqData.byFlashcardId;

  const refreshMastery = useCallback(async () => {
    invalidateStudyQueueCache();
    await sqData.refresh();
  }, [sqData]);

  // ── Sub-hook: view state machine ───────────────────────
  const {
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
  } = useViewStateMachine({
    navigateTo,
    currentCourseId: currentCourse.id,
  });

  // ── Sub-hook: LRU card cache + auto-load ───────────────
  const { cardCache, loadTopicCards, reloadTopicCards } = useCardCache(tree, treeLoading);

  // ── Sub-hook: enriched sections/topics ─────────────────
  const {
    enrichedSections,
    allFlashcards,
    enrichedSelectedSection,
    enrichedSelectedTopic,
    enrichCardWithMastery,
  } = useEnrichedSections({
    allSections,
    cardCache,
    masteryMap,
    selectedSection,
    selectedTopic,
    currentCourseId: currentCourse.id,
  });

  // ── Keyword mastery cache (lazy, fetched on openDeck) ──
  const kwMasteryCache = useRef(new Map<string, TopicMasterySummary>());
  const kwMasteryPending = useRef(new Set<string>());
  const [kwProgressVersion, setKwProgressVersion] = useState(0);

  // ── Load keyword mastery for a topic (lazy, non-blocking) ──
  const loadKeywordMastery = useCallback(async (topicId: string) => {
    if (kwMasteryCache.current.has(topicId)) return;
    if (kwMasteryPending.current.has(topicId)) return;

    kwMasteryPending.current.add(topicId);
    try {
      const masteryData = await fetchKeywordMasteryByTopic(topicId);
      const summary = computeTopicMasterySummary(masteryData);
      kwMasteryCache.current.set(topicId, summary);
      setKwProgressVersion(v => v + 1);
    } catch (err) {
      // Non-fatal: DeckScreen works without keyword progress
      if (import.meta.env.DEV) {
        console.warn(`[FlashcardNav] Keyword mastery fetch failed for topic ${topicId}:`, err);
      }
    } finally {
      kwMasteryPending.current.delete(topicId);
    }
  }, []);

  // Invalidate keyword mastery cache for a topic (after session completes)
  const invalidateKeywordMastery = useCallback((topicId?: string) => {
    if (topicId) {
      kwMasteryCache.current.delete(topicId);
    } else {
      kwMasteryCache.current.clear();
    }
    setKwProgressVersion(v => v + 1);
  }, []);

  // ── Cross-cutting actions ──────────────────────────────
  // These close over multiple sub-hooks (cardCache + enrichedSections +
  // loadTopicCards + masteryMap) so they live in the composer.

  const openSection = useCallback((section: Section, idx: number) => {
    section.topics.forEach(t => loadTopicCards(t.id));
    const enriched = enrichedSections.find(s => s.id === section.id) || section;
    setSelectedSection(enriched);
    setSelectedSectionIdx(idx);
    setViewState('section');
  }, [
    enrichedSections,
    loadTopicCards,
    setSelectedSection,
    setSelectedSectionIdx,
    setViewState,
  ]);

  const openDeck = useCallback((topic: Topic) => {
    loadTopicCards(topic.id);
    loadKeywordMastery(topic.id); // Fase 6: lazy fetch, non-blocking
    const cached = lruGet(cardCache, topic.id) || topic.flashcards || [];
    const enrichedCards = cached.map(card => enrichCardWithMastery(card, masteryMap));
    const enriched = { ...topic, flashcards: enrichedCards };
    setSelectedTopic(enriched);
    setViewState('deck');
  }, [
    cardCache,
    loadTopicCards,
    loadKeywordMastery,
    masteryMap,
    enrichCardWithMastery,
    setSelectedTopic,
    setViewState,
  ]);

  const studySelectedTopic = useCallback(() => {
    if (selectedTopic) {
      setCurrentTopic(selectedTopic);
      navigateTo('study');
    }
  }, [selectedTopic, setCurrentTopic, navigateTo]);

  // ── Apply optimistic mastery updates ───────────────────
  const applyOptimisticMastery = useCallback(
    (updates: Map<string, OptimisticCardUpdate>) => {
      if (updates.size === 0) return;

      const patchedItems: StudyQueueItem[] = [];
      for (const [cardId, upd] of updates) {
        const existing = sqData.byFlashcardId.get(cardId);
        if (existing) {
          patchedItems.push({
            ...existing,
            p_know: upd.p_know,
            fsrs_state: upd.fsrs_state as any,
            stability: upd.stability,
            difficulty: upd.difficulty,
            due_at: upd.due_at,
          });
        } else {
          patchedItems.push({
            flashcard_id: cardId,
            summary_id: '',
            keyword_id: '',
            subtopic_id: null,
            front: '',
            back: '',
            front_image_url: null,
            back_image_url: null,
            need_score: 0,
            retention: 0,
            mastery_color: upd.p_know >= 0.75 ? 'green' : upd.p_know >= 0.40 ? 'yellow' : upd.p_know > 0 ? 'red' : 'gray',
            p_know: upd.p_know,
            fsrs_state: upd.fsrs_state as any,
            due_at: upd.due_at,
            stability: upd.stability,
            difficulty: upd.difficulty,
            is_new: true,
            reps: 0,
            lapses: 0,
            last_review_at: null,
            max_p_know: 0,
            clinical_priority: 0,
            consecutive_lapses: 0,
            is_leech: false,
          });
        }
      }

      if (patchedItems.length > 0) {
        sqData.applyOptimisticBatch(patchedItems);
      }
    },
    [sqData],
  );

  // Silence the unused-effect deps warning: treeLoading is consumed by useCardCache.
  // (No-op effect kept intentionally as documentation.)
  useEffect(() => {
    // useCardCache handles auto-load on tree ready; nothing to do here.
  }, [treeLoading]);

  return {
    viewState,
    setViewState,
    selectedSection: enrichedSelectedSection,
    selectedTopic: enrichedSelectedTopic,
    selectedSectionIdx,
    allSections: enrichedSections,
    allFlashcards,
    currentCourse,
    masteryMap,
    refreshMastery,
    applyOptimisticMastery,
    openSection,
    openDeck,
    goBack,
    goToHub,
    studySelectedTopic,
    loadKeywordMastery,
    invalidateKeywordMastery,
    reloadTopicCards,
    kwMasteryCache,
    kwProgressVersion,
    sqData,
  };
}
