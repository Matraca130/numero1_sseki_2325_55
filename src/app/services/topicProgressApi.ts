// ============================================================
// Axon — Topic Progress API (Unified Endpoint)
//
// Replaces the N+1 pattern where the frontend made:
//   1 request  → GET /summaries?topic_id=xxx
//   N requests → GET /reading-states?summary_id=yyy
//   N requests → GET /flashcards?summary_id=yyy
//   Total: 1 + 2N requests (up to 21 for 10 summaries)
//
// Now: 1 request → GET /topic-progress?topic_id=xxx
//
// Includes graceful fallback to old N+1 pattern if the
// unified endpoint is not yet deployed (404 → fallback).
// ============================================================

import { apiCall } from '@/app/lib/api';
import type { ReadingState } from '@/app/services/studentSummariesApi';
import { getReadingState } from '@/app/services/studentSummariesApi';
import { getFlashcardsBySummary } from '@/app/services/platformApi';
import { getSummaries as getTopicSummariesPaginated, getKeywords } from '@/app/services/summariesApi';
import type { Summary, SummaryKeyword } from '@/app/services/summariesApi';

// ── Helpers ───────────────────────────────────────────────

/** Unwrap PaginatedList<T> → T[] (handles both paginated and raw array responses) */
function unwrapPaginated<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && Array.isArray((result as any).items)) {
    return (result as any).items;
  }
  return [];
}

/** Check if an error is a 404 (endpoint not yet deployed) */
function is404(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('404') || message.includes('Not Found');
}

/** Shared fallback wrapper: try unified, fallback on 404 */
async function withFallback<T>(
  unifiedFn: () => Promise<T>,
  fallbackFn: () => Promise<T>,
  label: string,
): Promise<T> {
  try {
    return await unifiedFn();
  } catch (err: unknown) {
    if (is404(err)) {
      console.warn(`[topicProgressApi] ${label} unavailable, using N+1 fallback`);
      return await fallbackFn();
    }
    throw err;
  }
}

// ── Types ─────────────────────────────────────────────────

export interface TopicProgressResponse {
  summaries: Summary[];
  reading_states: Record<string, ReadingState>;
  flashcard_counts: Record<string, number>;
}

export interface EnrichedSummary {
  summary: Summary;
  readingState: ReadingState | null;
  flashcardCount: number;
}

// ── Unified endpoint ────────────────────────────────────

async function fetchTopicProgressUnified(topicId: string): Promise<TopicProgressResponse> {
  return apiCall<TopicProgressResponse>(`/topic-progress?topic_id=${topicId}`);
}

// ── Fallback: old N+1 pattern ─────────────────────────────

async function fetchTopicProgressFallback(topicId: string): Promise<TopicProgressResponse> {
  const result = await getTopicSummariesPaginated(topicId);
  const allSummaries = unwrapPaginated<Summary>(result);

  // Published + active only (matching backend endpoint logic)
  const published = allSummaries.filter(
    (s) => s.status === 'published' && s.is_active && !s.deleted_at
  );

  // Fetch reading states + flashcard counts in parallel per summary
  const readingStates: Record<string, ReadingState> = {};
  const flashcardCounts: Record<string, number> = {};

  await Promise.allSettled(
    published.map(async (s) => {
      const [rsResult, fcResult] = await Promise.allSettled([
        getReadingState(s.id),
        getFlashcardsBySummary(s.id),
      ]);

      if (rsResult.status === 'fulfilled' && rsResult.value) {
        readingStates[s.id] = rsResult.value;
      }
      if (fcResult.status === 'fulfilled') {
        flashcardCounts[s.id] = fcResult.value.length;
      }
    })
  );

  return {
    summaries: published,
    reading_states: readingStates,
    flashcard_counts: flashcardCounts,
  };
}

// ── Public API ──────────────────────────────────────────

/**
 * Fetch all topic progress data in a single call.
 * Falls back to N+1 pattern if unified endpoint is not available.
 *
 * Returns enriched summaries ready for rendering.
 */
export async function getTopicProgress(topicId: string): Promise<EnrichedSummary[]> {
  const response = await withFallback(
    () => fetchTopicProgressUnified(topicId),
    () => fetchTopicProgressFallback(topicId),
    'topic-progress',
  );

  // Transform into enriched summaries
  return response.summaries.map((summary) => ({
    summary,
    readingState: response.reading_states[summary.id] ?? null,
    flashcardCount: response.flashcard_counts[summary.id] ?? 0,
  }));
}

/**
 * Raw topic progress response (for views that need the maps directly).
 */
export async function getTopicProgressRaw(topicId: string): Promise<TopicProgressResponse> {
  return withFallback(
    () => fetchTopicProgressUnified(topicId),
    () => fetchTopicProgressFallback(topicId),
    'topic-progress',
  );
}

// ── Topics Overview (Section-level batch) ─────────────────

export interface TopicsOverviewResponse {
  summaries_by_topic: Record<string, Summary[]>;
  keyword_counts_by_topic: Record<string, number>;
}

/**
 * Fetch summaries + keyword counts for multiple topics in 1 HTTP call.
 * Falls back to N+1 if the endpoint is not yet deployed.
 *
 * Used by SectionStudyPlanView (Level 2).
 */
export async function getTopicsOverview(topicIds: string[]): Promise<TopicsOverviewResponse> {
  if (topicIds.length === 0) {
    return { summaries_by_topic: {}, keyword_counts_by_topic: {} };
  }

  return withFallback(
    () => apiCall<TopicsOverviewResponse>(
      `/topics-overview?topic_ids=${topicIds.join(',')}`
    ),
    () => fetchTopicsOverviewFallback(topicIds),
    'topics-overview',
  );
}

async function fetchTopicsOverviewFallback(topicIds: string[]): Promise<TopicsOverviewResponse> {
  const summariesByTopic: Record<string, Summary[]> = {};
  const keywordCountsByTopic: Record<string, number> = {};

  // Initialize empty
  for (const tid of topicIds) {
    summariesByTopic[tid] = [];
    keywordCountsByTopic[tid] = 0;
  }

  // Fetch summaries per topic in parallel
  await Promise.allSettled(
    topicIds.map(async (topicId) => {
      try {
        const result = await getTopicSummariesPaginated(topicId);
        const allItems = unwrapPaginated<Summary>(result);

        // Filter to match unified endpoint behavior: active + not deleted
        const items = allItems.filter(s => s.is_active && !s.deleted_at);
        summariesByTopic[topicId] = items;

        // Fetch keyword counts per summary in parallel
        const kwResults = await Promise.allSettled(
          items.map(s => getKeywords(s.id))
        );
        let totalKw = 0;
        for (const r of kwResults) {
          if (r.status !== 'fulfilled') continue;
          const kwItems = unwrapPaginated<SummaryKeyword>(r.value);
          totalKw += kwItems.length;
        }
        keywordCountsByTopic[topicId] = totalKw;
      } catch {
        // keep defaults
      }
    })
  );

  return { summaries_by_topic: summariesByTopic, keyword_counts_by_topic: keywordCountsByTopic };
}
