// ============================================================
// useFlashcardNavigation — View state machine + navigation
// NOW CONNECTED TO REAL BACKEND:
//   - Structure from ContentTreeContext (content-tree API)
//   - Flashcards from GET /flashcards?summary_id=xxx
//   - Topics/Sections built from real tree, not stub courses[]
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '@/app/context/AppContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { apiCall } from '@/app/lib/api';
import type { Section, Topic, Flashcard, Course } from '@/app/types/content';
import type { FlashcardViewState } from './flashcard-types';

// ── Helper: map API flashcard → UI Flashcard ──────────────

function mapApiCard(card: any): Flashcard {
  return {
    id: card.id,
    front: card.front || '',
    back: card.back || '',
    question: card.front || '',   // alias for SessionScreen
    answer: card.back || '',      // alias for SessionScreen
    mastery: 0,                   // default — overwritten by FSRS state
    difficulty: 'normal',
    keywords: [],
    summary_id: card.summary_id,
    keyword_id: card.keyword_id,
    source: card.source,
    image: card.front_image_url || card.back_image_url || undefined,
    frontImageUrl: card.front_image_url || null,
    backImageUrl: card.back_image_url || null,
  };
}

// ── Helper: load flashcards for a topic ───────────────────
// 1. Get summaries for this topic
// 2. Get flashcards for each summary

async function loadFlashcardsForTopic(topicId: string): Promise<Flashcard[]> {
  try {
    // Flat route: GET /summaries?topic_id=xxx
    let summaries: any[] = [];
    try {
      const data = await apiCall<any>(`/summaries?topic_id=${topicId}`);
      summaries = Array.isArray(data) ? data : data?.items || [];
    } catch {
      summaries = [];
    }

    if (summaries.length === 0) return [];

    // Load flashcards for each summary (parallel)
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
    console.error(`[FlashcardNav] Error loading flashcards for topic ${topicId}:`, err);
    return [];
  }
}

// ── Build Course from ContentTree ─────────────────────────

function buildCourseFromTree(tree: any): Course {
  if (!tree || !tree.courses || tree.courses.length === 0) {
    return {
      id: 'empty',
      name: 'Sin Curso',
      color: 'bg-teal-500',
      accentColor: 'text-teal-500',
      semesters: [],
    };
  }

  // Use the first course (or merge all)
  const firstCourse = tree.courses[0];
  return {
    id: firstCourse.id,
    name: firstCourse.name || 'Curso',
    color: 'bg-teal-500',
    accentColor: 'text-teal-500',
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

// ══════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════

export function useFlashcardNavigation() {
  const { setCurrentTopic } = useApp();
  const { tree, loading: treeLoading } = useContentTree();
  const { navigateTo } = useStudentNav();

  // View state machine
  const [viewState, setViewState] = useState<FlashcardViewState>('hub');
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSectionIdx, setSelectedSectionIdx] = useState(0);

  // Flashcard cache: topicId → Flashcard[]
  const [cardCache, setCardCache] = useState<Record<string, Flashcard[]>>({});
  const [loadingTopics, setLoadingTopics] = useState<Set<string>>(new Set());
  const pendingLoads = useRef<Set<string>>(new Set());

  // Build course from tree
  const currentCourse = useMemo(() => buildCourseFromTree(tree), [tree]);

  // Derived: all sections (flattened from semesters)
  const allSections = useMemo(
    () => currentCourse.semesters.flatMap(sem => sem.sections),
    [currentCourse],
  );

  // ── Load flashcards for visible topics ──────────────────

  const loadTopicCards = useCallback(async (topicId: string) => {
    if (cardCache[topicId] || pendingLoads.current.has(topicId)) return;
    pendingLoads.current.add(topicId);
    setLoadingTopics(prev => new Set(prev).add(topicId));

    const cards = await loadFlashcardsForTopic(topicId);
    setCardCache(prev => ({ ...prev, [topicId]: cards }));
    pendingLoads.current.delete(topicId);
    setLoadingTopics(prev => {
      const next = new Set(prev);
      next.delete(topicId);
      return next;
    });
  }, [cardCache]);

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
    const batchSize = 5;
    const loadBatch = () => {
      const batch = topicIds.slice(idx, idx + batchSize);
      batch.forEach(id => loadTopicCards(id));
      idx += batchSize;
      if (idx < topicIds.length) {
        setTimeout(loadBatch, 300);
      }
    };
    if (topicIds.length > 0) loadBatch();
  }, [tree, treeLoading]); // intentionally not including loadTopicCards

  // ── Inject cached flashcards into sections ──────────────

  const enrichedSections = useMemo(() => {
    return allSections.map(section => ({
      ...section,
      topics: section.topics.map(topic => ({
        ...topic,
        flashcards: cardCache[topic.id] || [],
      })),
    }));
  }, [allSections, cardCache]);

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
    // Ensure flashcards are loaded for this section's topics
    section.topics.forEach(t => loadTopicCards(t.id));
    // Find enriched version
    const enriched = enrichedSections.find(s => s.id === section.id) || section;
    setSelectedSection(enriched);
    setSelectedSectionIdx(idx);
    setViewState('section');
  }, [enrichedSections, loadTopicCards]);

  const openDeck = useCallback((topic: Topic) => {
    loadTopicCards(topic.id);
    const enriched = {
      ...topic,
      flashcards: cardCache[topic.id] || topic.flashcards || [],
    };
    setSelectedTopic(enriched);
    setViewState('deck');
  }, [cardCache, loadTopicCards]);

  const goBack = useCallback(() => {
    if (viewState === 'summary' || viewState === 'session') {
      setViewState(selectedTopic ? 'deck' : selectedSection ? 'section' : 'hub');
    } else if (viewState === 'deck') {
      setViewState('section');
      setSelectedTopic(null);
    } else if (viewState === 'section') {
      setViewState('hub');
      setSelectedSection(null);
    } else {
      navigateTo('study');
    }
  }, [viewState, selectedTopic, selectedSection, navigateTo]);

  const studySelectedTopic = useCallback(() => {
    if (selectedTopic) {
      setCurrentTopic(selectedTopic);
      navigateTo('study');
    }
  }, [selectedTopic, setCurrentTopic, navigateTo]);

  // Keep selectedSection/selectedTopic enriched with latest card cache
  const enrichedSelectedSection = useMemo(() => {
    if (!selectedSection) return null;
    return {
      ...selectedSection,
      topics: selectedSection.topics.map(t => ({
        ...t,
        flashcards: cardCache[t.id] || t.flashcards || [],
      })),
    };
  }, [selectedSection, cardCache]);

  const enrichedSelectedTopic = useMemo(() => {
    if (!selectedTopic) return null;
    return {
      ...selectedTopic,
      flashcards: cardCache[selectedTopic.id] || selectedTopic.flashcards || [],
    };
  }, [selectedTopic, cardCache]);

  return {
    viewState,
    setViewState,
    selectedSection: enrichedSelectedSection,
    selectedTopic: enrichedSelectedTopic,
    selectedSectionIdx,
    allSections: enrichedSections,
    allFlashcards,
    currentCourse,
    openSection,
    openDeck,
    goBack,
    studySelectedTopic,
  };
}