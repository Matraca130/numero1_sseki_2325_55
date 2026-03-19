// ============================================================
// useFlashcardNavigation — View state machine + navigation
//
// REFACTORED v4.4.1:
//   - Uses shared useStudyQueueData (eliminates duplicate study-queue fetch)
//   - LRU-bounded cardCache (max 30 topics, ~6000 cards at ~200/topic)
//   - Stable loadTopicCards ref (no stale closure issue)
//   - enrichedSections: per-topic memoization instead of full rebuild
//   - Avoids N+1 cascade for already-cached topics
//
// PERF v4.4.3:
//   [C2] enrichedSections now uses granular per-topic memoization.
//        Instead of re-enriching ALL cards when masteryMap changes,
//        only topics whose mastery data actually changed are rebuilt.
//        This reduces O(N×M) → O(changed×M) spreads after each session.
//   [C1] loadFlashcardsForTopic now tries a batch endpoint first (1 request).
//        Falls back to the old N+1 pattern if the endpoint doesn't exist (404)
//        or fails for any reason. This allows gradual backend deployment.
//
// CONNECTED TO REAL BACKEND:
//   - Structure from ContentTreeContext (content-tree API)
//   - Flashcards from GET /flashcards?summary_id=xxx
//   - Mastery from shared useStudyQueueData (FSRS+BKT)
//   - Topics/Sections built from real tree, not stub courses[]
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigation } from '@/app/context/NavigationContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useStudyQueueData, invalidateStudyQueueCache } from '@/app/hooks/useStudyQueueData';
import { apiCall } from '@/app/lib/api';
import { getFlashcardsByTopic } from '@/app/services/flashcardApi';
import {
  fetchKeywordMasteryByTopic,
  computeTopicMasterySummary,
  type TopicMasterySummary,
} from '@/app/services/keywordMasteryApi';
import type { StudyQueueItem } from '@/app/lib/studyQueueApi';
import type { OptimisticCardUpdate } from './useFlashcardEngine';
import type { Section, Topic, Flashcard, Course } from '@/app/types/content';
import type { FlashcardViewState } from './flashcard-types';

// ── Constants ─────────────────────────────────────────────────

/** Max topics to keep in cardCache before evicting oldest */
const CARD_CACHE_MAX_TOPICS = 30;

/** Batch size for loading flashcards (avoids saturating connections) */
const LOAD_BATCH_SIZE = 5;

/** Delay between batches (ms) */
const LOAD_BATCH_DELAY = 200;

// ── Helper: map API flashcard → UI Flashcard ──────────────

function mapApiCard(card: any): Flashcard {
  return {
    id: card.id,
    front: card.front || '',
    back: card.back || '',
    question: card.front || '',
    answer: card.back || '',
    mastery: 0,
    difficulty: 'normal',
    keywords: [],
    summary_id: card.summary_id,
    keyword_id: card.keyword_id,
    subtopic_id: card.subtopic_id || null,
    source: card.source,
    image: card.front_image_url || card.back_image_url || undefined,
    frontImageUrl: card.front_image_url || null,
    backImageUrl: card.back_image_url || null,
  };
}

// ── Helper: convert p_know (0-1) to mastery (0-5) ────────

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

// ── Helper: load flashcards for a topic ───────────────────
// [C1] PERF v4.4.3: Try the batch endpoint first (1 request).
// Falls back to the old N+1 pattern if the endpoint doesn't exist (404)
// or fails for any reason. This allows gradual backend deployment.

async function loadFlashcardsForTopic(topicId: string): Promise<Flashcard[]> {
  // ── Strategy 1: Batch endpoint (PERF C1) ──
  try {
    const data = await getFlashcardsByTopic(topicId);
    const items = Array.isArray(data) ? data : data?.items || [];
    return items
      .filter((card: any) => card.is_active !== false && !card.deleted_at)
      .map(mapApiCard);
  } catch (batchErr: any) {
    if (import.meta.env.DEV) {
      console.warn(`[FlashcardNav] Batch endpoint failed for topic ${topicId}, falling back to N+1:`, batchErr?.message);
    }
  }

  // ── Strategy 2: N+1 fallback (original logic) ──
  try {
    let summaries: any[] = [];
    try {
      const data = await apiCall<any>(`/summaries?topic_id=${topicId}`);
      summaries = Array.isArray(data) ? data : data?.items || [];
    } catch {
      summaries = [];
    }

    if (summaries.length === 0) return [];

    const results = await Promise.allSettled(
      summaries.map((s: any) =>
        apiCall<any>(`/flashcards?summary_id=${s.id}`)
      )
    );

    const allCards: Flashcard[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const data = result.value;
        const items = Array.isArray(data) ? data : data?.items || [];
        for (const card of items) {
          if (card.is_active !== false && !card.deleted_at) {
            allCards.push(mapApiCard(card));
          }
        }
      }
    }

    return allCards;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error(`[FlashcardNav] Error loading flashcards for topic ${topicId}:`, err);
    }
    return [];
  }
}

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

  const firstCourse = tree.courses[0];
  return {
    id: firstCourse.id,
    name: firstCourse.name || 'Curso',
    color: 'bg-[#2a8c7a]',
    accentColor: 'text-[#2a8c7a]',
    semesters: (firstCourse.semesters || []).map((sem: any) => ({
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
    })),
  };
}

// ── LRU Card Cache ────────────────────────────────────────

interface LruCardCache {
  data: Map<string, Flashcard[]>;
  order: string[]; // oldest first
}

function createLruCache(): LruCardCache {
  return { data: new Map(), order: [] };
}

function lruGet(cache: LruCardCache, key: string): Flashcard[] | undefined {
  return cache.data.get(key);
}

function lruSet(cache: LruCardCache, key: string, value: Flashcard[]): LruCardCache {
  const newData = new Map(cache.data);
  let newOrder = cache.order.filter(k => k !== key);

  // Evict oldest if at capacity
  while (newOrder.length >= CARD_CACHE_MAX_TOPICS) {
    const evicted = newOrder.shift()!;
    newData.delete(evicted);
  }

  newData.set(key, value);
  newOrder.push(key);

  return { data: newData, order: newOrder };
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

  // View state machine
  const [viewState, setViewState] = useState<FlashcardViewState>('hub');
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSectionIdx, setSelectedSectionIdx] = useState(0);

  // LRU-bounded flashcard cache
  const [cardCache, setCardCache] = useState<LruCardCache>(createLruCache);
  const [loadingTopics, setLoadingTopics] = useState<Set<string>>(new Set());
  const pendingLoads = useRef<Set<string>>(new Set());
  /** Ref mirror of cardCache keys for synchronous checks in stable callbacks */
  const cachedTopicIds = useRef<Set<string>>(new Set());

  // ── Keyword mastery cache (lazy, fetched on openDeck) ───
  const kwMasteryCache = useRef(new Map<string, TopicMasterySummary>());
  const kwMasteryPending = useRef(new Set<string>());
  const [kwProgressVersion, setKwProgressVersion] = useState(0);

  // Build course from tree
  const currentCourse = useMemo(() => buildCourseFromTree(tree), [tree]);

  // ── Shared study-queue data (single fetch for the course) ──
  const sqData = useStudyQueueData(currentCourse.id === 'empty' ? null : currentCourse.id);

  // Backward-compat: expose masteryMap as flashcard_id → StudyQueueItem
  const masteryMap = sqData.byFlashcardId;

  const refreshMastery = useCallback(async () => {
    invalidateStudyQueueCache();
    await sqData.refresh();
  }, [sqData]);

  // Derived: all sections (flattened from semesters)
  const allSections = useMemo(
    () => currentCourse.semesters.flatMap(sem => sem.sections),
    [currentCourse],
  );

  // ── Load flashcards for a topic (stable ref) ───────────

  const loadTopicCards = useCallback(async (topicId: string) => {
    if (pendingLoads.current.has(topicId)) return;
    if (cachedTopicIds.current.has(topicId)) return;

    pendingLoads.current.add(topicId);
    setLoadingTopics(prev => new Set(prev).add(topicId));

    const cards = await loadFlashcardsForTopic(topicId);

    cachedTopicIds.current.add(topicId);
    setCardCache(prev => lruSet(prev, topicId, cards));
    pendingLoads.current.delete(topicId);
    setLoadingTopics(prev => {
      const next = new Set(prev);
      next.delete(topicId);
      return next;
    });
  }, []); // Stable — no dependencies that change

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

  // Auto-load flashcards for all topics when tree loads
  useEffect(() => {
    if (treeLoading || !tree) return;
    const topicIds: string[] = [];
    for (const c of tree.courses || []) {
      for (const s of c.semesters || []) {
        for (const sec of s.sections || []) {
          for (const t of sec.topics || []) {
            topicIds.push(t.id);
          }
        }
      }
    }

    // Load in batches to avoid overwhelming the API
    let idx = 0;
    let cancelled = false;
    const loadBatch = () => {
      if (cancelled) return;
      const batch = topicIds.slice(idx, idx + LOAD_BATCH_SIZE);
      batch.forEach(id => loadTopicCards(id));
      idx += LOAD_BATCH_SIZE;
      if (idx < topicIds.length) {
        setTimeout(loadBatch, LOAD_BATCH_DELAY);
      }
    };
    if (topicIds.length > 0) loadBatch();

    return () => { cancelled = true; };
  }, [tree, treeLoading, loadTopicCards]);

  // ── Inject cached flashcards + mastery into sections ────
  const enrichedTopicCache = useRef(new Map<string, { cards: Flashcard[]; cacheRef: Flashcard[]; mapRef: Map<string, StudyQueueItem> }>());

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

  // Reset on course change
  useEffect(() => {
    setViewState('hub');
    setSelectedSection(null);
    setSelectedTopic(null);
  }, [currentCourse.id]);

  // ── Actions ──

  const openSection = useCallback((section: Section, idx: number) => {
    section.topics.forEach(t => loadTopicCards(t.id));
    const enriched = enrichedSections.find(s => s.id === section.id) || section;
    setSelectedSection(enriched);
    setSelectedSectionIdx(idx);
    setViewState('section');
  }, [enrichedSections, loadTopicCards]);

  const openDeck = useCallback((topic: Topic) => {
    loadTopicCards(topic.id);
    loadKeywordMastery(topic.id); // Fase 6: lazy fetch, non-blocking
    const cached = lruGet(cardCache, topic.id) || topic.flashcards || [];
    const enrichedCards = cached.map(card => enrichCardWithMastery(card, masteryMap));
    const enriched = { ...topic, flashcards: enrichedCards };
    setSelectedTopic(enriched);
    setViewState('deck');
  }, [cardCache, loadTopicCards, loadKeywordMastery, masteryMap]);

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

  const studySelectedTopic = useCallback(() => {
    if (selectedTopic) {
      setCurrentTopic(selectedTopic);
      navigateTo('study');
    }
  }, [selectedTopic, setCurrentTopic, navigateTo]);

  // Keep selectedSection/selectedTopic enriched
  const enrichedSelectedSection = useMemo(() => {
    if (!selectedSection) return null;
    return {
      ...selectedSection,
      topics: selectedSection.topics.map(t => ({
        ...t,
        flashcards: (lruGet(cardCache, t.id) || t.flashcards || []).map(
          card => enrichCardWithMastery(card, masteryMap)
        ),
      })),
    };
  }, [selectedSection, cardCache, masteryMap]);

  const enrichedSelectedTopic = useMemo(() => {
    if (!selectedTopic) return null;
    return {
      ...selectedTopic,
      flashcards: (lruGet(cardCache, selectedTopic.id) || selectedTopic.flashcards || []).map(
        card => enrichCardWithMastery(card, masteryMap)
      ),
    };
  }, [selectedTopic, cardCache, masteryMap]);

  // ── Apply optimistic mastery updates ──
  const applyOptimisticMastery = useCallback(
    (updates: Map<string, OptimisticCardUpdate>) => {
      if (updates.size === 0) return;

      const patchedItems: import('@/app/lib/studyQueueApi').StudyQueueItem[] = [];
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
            mastery_color: upd.p_know >= 0.75 ? 'green' : upd.p_know >= 0.4 ? 'yellow' : upd.p_know >= 0.2 ? 'orange' : 'red',
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
    kwMasteryCache,
    kwProgressVersion,
  };
}
