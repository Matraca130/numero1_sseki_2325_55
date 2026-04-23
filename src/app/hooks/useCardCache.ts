// ============================================================
// useCardCache — LRU-bounded per-topic flashcard cache
//
// Split out of useFlashcardNavigation (Finding #11).
// Owns:
//   - cardCache (LRU-bounded, max 30 topics)
//   - loadingTopics set
//   - pendingLoads + cachedTopicIds refs (sync mirrors)
//   - loadTopicCards / reloadTopicCards (stable refs)
//   - auto-load batching effect on tree ready
//
// The N+1 → batch fallback strategy (PERF C1) and the
// api → UI flashcard mapper live in this module.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiCall } from '@/app/lib/api';
import { getFlashcardsByTopic } from '@/app/services/flashcardApi';
import type { Flashcard } from '@/app/types/content';

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

// ── LRU Card Cache ────────────────────────────────────────

export interface LruCardCache {
  data: Map<string, Flashcard[]>;
  order: string[]; // oldest first
}

function createLruCache(): LruCardCache {
  return { data: new Map(), order: [] };
}

export function lruGet(cache: LruCardCache, key: string): Flashcard[] | undefined {
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

// ══════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════

export function useCardCache(tree: any, treeLoading: boolean) {
  const [cardCache, setCardCache] = useState<LruCardCache>(createLruCache);
  const [loadingTopics, setLoadingTopics] = useState<Set<string>>(new Set());
  const pendingLoads = useRef<Set<string>>(new Set());
  /** Ref mirror of cardCache keys for synchronous checks in stable callbacks */
  const cachedTopicIds = useRef<Set<string>>(new Set());

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

  // Force-reload flashcards for a topic (clears cache entry first)
  const reloadTopicCards = useCallback(async (topicId: string) => {
    cachedTopicIds.current.delete(topicId);
    pendingLoads.current.delete(topicId);
    setCardCache(prev => {
      const newData = new Map(prev.data);
      newData.delete(topicId);
      return { data: newData, order: prev.order.filter(k => k !== topicId) };
    });
    await loadTopicCards(topicId);
  }, [loadTopicCards]);

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

  return {
    cardCache,
    loadingTopics,
    loadTopicCards,
    reloadTopicCards,
  };
}
