// ============================================================
// Axon — Keyword Mastery Aggregation Service
// Fase 1 del plan "Sesion Adaptativa de Flashcards con IA" (v4.5)
//
// PURPOSE:
//   Computes keyword-level mastery by aggregating BKT states
//   from the subtopic level. This powers the adaptive flashcard
//   session's keyword mastery tree and AI targeting decisions.
//
// MASTERY CHAIN:
//   Flashcard grade (1-4)
//     -> Subtopic p_know (BKT: 0.0-1.0) via bkt_states
//       -> Keyword mastery (avg subtopic p_know)
//         -> Topic progress (% keywords mastered)
//
// BACKEND ENDPOINTS USED (all verified in Fase 0 audit):
//   GET /topic-progress?topic_id=X   -> summaries for topic
//   GET /keywords?summary_id=X       -> keywords per summary
//   GET /subtopics-batch?keyword_ids= -> batch subtopics (1 call)
//   GET /bkt-states?subtopic_ids=     -> batch BKT states (1 call)
//
// EFFICIENCY:
//   fetchKeywordMasteryByTopic:   N+3 calls (N = summaries in topic)
//   fetchKeywordMasteryBySummary: 3 calls (fixed)
//   computeLocalKeywordMastery:   0 calls (pure function)
//
// SAFETY:
//   - New file, zero risk of regression
//   - Does NOT modify any existing service
//   - Uses apiCall() from lib/api.ts (double-token convention)
// ============================================================

import { apiCall } from '@/app/lib/api';
import { parallelWithLimit } from '@/app/lib/concurrency';

// ── Constants ───────────────────────────────────────────────

/** Threshold for a subtopic/keyword to be considered "mastered" */
export const MASTERY_THRESHOLD = 0.75;

/** Max keyword IDs per subtopics-batch call (backend limit) */
const MAX_KEYWORD_IDS_PER_BATCH = 50;

/** Max subtopic IDs per bkt-states call (backend limit) */
const MAX_SUBTOPIC_IDS_PER_BATCH = 200;

// ── Mastery Color Helpers ─────────────────────────────────

/**
 * Re-export canonical MasteryColor from mastery-helpers to avoid duplicate type.
 * Includes 'gray' for keywords with no subtopic data.
 */
export type { MasteryColor } from '@/app/lib/mastery-helpers';
export { getMasteryColor } from '@/app/lib/mastery-helpers';

// ── Types ─────────────────────────────────────────────────

export interface SubtopicMasteryInfo {
  id: string;
  name: string;
  keyword_id: string;
  order_index: number;
  /** BKT p_know [0-1]. 0 if no BKT data exists yet. */
  p_know: number;
  total_attempts: number;
  correct_attempts: number;
  /** Whether a bkt_states row exists for this subtopic */
  hasData: boolean;
  /** Whether this subtopic is considered mastered (p_know >= threshold) */
  isMastered: boolean;
}

export interface KeywordMasteryInfo {
  keyword_id: string;
  name: string;
  definition: string;
  summary_id: string;
  /** Professor-assigned priority (higher = more important). Defaults to 1. */
  priority: number;
  /** Aggregated mastery [0-1] = avg(subtopics.p_know). -1 if no subtopics (no data). */
  mastery: number;
  /** All subtopics with their individual mastery data */
  subtopics: SubtopicMasteryInfo[];
  /**
   * Whether this keyword is considered "mastered" (mastery >= threshold).
   * NOTE: This checks the AVERAGE p_know, not that ALL subtopics are mastered.
   * A keyword can be "mastered" even if some subtopics are below threshold.
   * Use `subtopicsMastered === subtopicsTotal` for stricter checking.
   */
  isMastered: boolean;
  /** Count of subtopics with p_know >= threshold */
  subtopicsMastered: number;
  /** Total subtopic count for this keyword */
  subtopicsTotal: number;
}

/** Map keyed by keyword_id */
export type KeywordMasteryMap = Map<string, KeywordMasteryInfo>;

/** Summary of topic-level mastery (for dashboard display) */
export interface TopicMasterySummary {
  keywordsTotal: number;
  keywordsMastered: number;
  /** Overall topic mastery [0-1] = avg(keyword.mastery) */
  overallMastery: number;
  /**
   * Keywords NOT yet mastered, sorted by:
   *   1. mastery ascending (weakest first — highest AI targeting priority)
   *   2. professor priority descending (higher priority = more important as tiebreaker)
   * Excludes keywords that are already mastered.
   */
  weakestKeywords: KeywordMasteryInfo[];
  /** ALL keywords sorted by mastery ascending (includes mastered ones) */
  allKeywordsByMastery: KeywordMasteryInfo[];
}

// ── Raw API response types (internal) ─────────────────────

interface RawKeyword {
  id: string;
  name: string;
  definition?: string;
  summary_id: string;
  priority?: number;
  is_active?: boolean;
  deleted_at?: string | null;
}

interface RawSubtopic {
  id: string;
  keyword_id: string;
  name: string;
  order_index?: number;
  deleted_at?: string | null;
}

interface RawBktState {
  subtopic_id: string;
  p_know: number;
  total_attempts: number;
  correct_attempts: number;
}

// ── Helpers ───────────────────────────────────────────────

/** Unwrap CRUD factory response: handles both { items: [...] } and plain arrays */
function unwrapItems<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && 'items' in result) {
    return (result as { items: T[] }).items || [];
  }
  return [];
}

/**
 * Split an array into chunks of at most `size` elements.
 * Used to respect backend batch limits.
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ── Core: Fetch keywords for given summary IDs ────────────

async function fetchKeywordsForSummaries(
  summaryIds: string[]
): Promise<RawKeyword[]> {
  if (summaryIds.length === 0) return [];

  const tasks = summaryIds.map((sid) => () =>
    apiCall<unknown>(`/keywords?summary_id=${sid}`)
  );
  const results = await parallelWithLimit(tasks, 4);

  const keywords: RawKeyword[] = [];
  const seenIds = new Set<string>();

  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const items = unwrapItems<RawKeyword>(r.value);
    for (const kw of items) {
      // Skip inactive/deleted keywords and deduplicate by ID
      if (kw.deleted_at || kw.is_active === false) continue;
      if (seenIds.has(kw.id)) continue;
      seenIds.add(kw.id);
      keywords.push(kw);
    }
  }

  return keywords;
}

// ── Core: Fetch subtopics via batch endpoint ──────────────

async function fetchSubtopicsBatch(
  keywordIds: string[]
): Promise<RawSubtopic[]> {
  if (keywordIds.length === 0) return [];

  // Respect backend limit of 50 keyword IDs per call
  const chunks_ = chunk(keywordIds, MAX_KEYWORD_IDS_PER_BATCH);

  // OPT-2: Parallelize chunk fetches (each chunk is independent)
  // For most topics (< 50 keywords), this is a single chunk anyway.
  // For larger topics, parallel fetches reduce wall-clock time.
  const tasks = chunks_.map((batch) => async () => {
    const idsParam = batch.join(',');
    const result = await apiCall<unknown>(
      `/subtopics-batch?keyword_ids=${idsParam}`
    );
    return unwrapItems<RawSubtopic>(result);
  });

  const results = await parallelWithLimit(tasks, 3);
  const allSubtopics: RawSubtopic[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      // Backend already filters deleted_at IS NULL
      allSubtopics.push(...r.value);
    } else if (import.meta.env.DEV) {
      console.warn('[KeywordMastery] subtopics-batch chunk failed:', r.reason);
    }
  }

  return allSubtopics;
}

// ── Core: Fetch BKT states via batch endpoint ─────────────

async function fetchBktStatesBatch(
  subtopicIds: string[]
): Promise<Map<string, RawBktState>> {
  const bktMap = new Map<string, RawBktState>();
  if (subtopicIds.length === 0) return bktMap;

  // Respect backend limit of 200 subtopic IDs per call
  const chunks_ = chunk(subtopicIds, MAX_SUBTOPIC_IDS_PER_BATCH);

  // OPT-2: Parallelize chunk fetches (each chunk is independent)
  const tasks = chunks_.map((batch) => async () => {
    const idsParam = batch.join(',');
    // IMPORTANT: Backend spaced-rep.ts defaults to limit=100 on GET /bkt-states.
    // Without explicit limit, responses with >100 matching rows are silently truncated.
    // We request limit=<batch_size> to ensure ALL BKT states for our subtopic_ids are returned.
    // Backend MAX is 500; our batches max at 200, so this is always safe.
    const result = await apiCall<unknown>(
      `/bkt-states?subtopic_ids=${idsParam}&limit=${batch.length}`
    );
    return unwrapItems<RawBktState>(result);
  });

  const results = await parallelWithLimit(tasks, 3);
  for (const r of results) {
    if (r.status === 'fulfilled') {
      for (const bkt of r.value) {
        if (bkt.subtopic_id) {
          bktMap.set(bkt.subtopic_id, bkt);
        }
      }
    } else if (import.meta.env.DEV) {
      console.warn('[KeywordMastery] bkt-states batch chunk failed:', r.reason);
    }
  }

  return bktMap;
}

// ── Aggregation: Build KeywordMasteryMap ──────────────────

function buildKeywordMasteryMap(
  keywords: RawKeyword[],
  subtopics: RawSubtopic[],
  bktMap: Map<string, RawBktState>
): KeywordMasteryMap {
  // Group subtopics by keyword_id
  const subtopicsByKeyword = new Map<string, RawSubtopic[]>();
  for (const st of subtopics) {
    const list = subtopicsByKeyword.get(st.keyword_id) || [];
    list.push(st);
    subtopicsByKeyword.set(st.keyword_id, list);
  }

  const map: KeywordMasteryMap = new Map();

  for (const kw of keywords) {
    const kwSubtopics = subtopicsByKeyword.get(kw.id) || [];

    // Sort by order_index for consistent rendering
    kwSubtopics.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    // Build subtopic mastery info
    const subtopicInfos: SubtopicMasteryInfo[] = kwSubtopics.map((st) => {
      const bkt = bktMap.get(st.id);
      const pKnow = bkt?.p_know ?? 0;
      return {
        id: st.id,
        name: st.name,
        keyword_id: st.keyword_id,
        order_index: st.order_index ?? 0,
        p_know: pKnow,
        total_attempts: bkt?.total_attempts ?? 0,
        correct_attempts: bkt?.correct_attempts ?? 0,
        hasData: !!bkt,
        isMastered: pKnow >= MASTERY_THRESHOLD,
      };
    });

    // Compute keyword-level aggregation
    const subtopicsTotal = subtopicInfos.length;
    const subtopicsMastered = subtopicInfos.filter((s) => s.isMastered).length;

    // Mastery = avg(p_know) of subtopics. -1 sentinel = no data (renders gray).
    let mastery = -1;
    if (subtopicsTotal > 0) {
      const sum = subtopicInfos.reduce((acc, s) => acc + s.p_know, 0);
      mastery = sum / subtopicsTotal;
    }

    map.set(kw.id, {
      keyword_id: kw.id,
      name: kw.name,
      definition: kw.definition || '',
      summary_id: kw.summary_id,
      priority: kw.priority || 1,
      mastery,
      subtopics: subtopicInfos,
      isMastered: mastery >= MASTERY_THRESHOLD,
      subtopicsMastered,
      subtopicsTotal,
    });
  }

  return map;
}

// ── Public API ────────────────────────────────────────────

/**
 * Fetch keyword mastery data for an entire topic.
 *
 * Flow (N+3 calls where N = summaries in topic):
 *   1. GET /topic-progress?topic_id=X        -> summaries    (1 call)
 *   2. GET /keywords?summary_id=Y (per sum)  -> keywords     (N calls, max 4 concurrent)
 *   3. GET /subtopics-batch?keyword_ids=...   -> subtopics    (1 call)
 *   4. GET /bkt-states?subtopic_ids=...       -> BKT states   (1 call)
 *   5. Aggregate locally
 *
 * @param topicId - The topic UUID
 * @returns KeywordMasteryMap keyed by keyword_id
 */
export async function fetchKeywordMasteryByTopic(
  topicId: string
): Promise<KeywordMasteryMap> {
  // Step 1: Get summaries for this topic
  const topicData = await apiCall<any>(`/topic-progress?topic_id=${topicId}`);
  const summaries: { id: string }[] = topicData?.summaries || [];

  if (summaries.length === 0) {
    return new Map();
  }

  const summaryIds = summaries.map((s) => s.id);

  // Step 2: Get keywords for all summaries
  const keywords = await fetchKeywordsForSummaries(summaryIds);

  if (keywords.length === 0) {
    return new Map();
  }

  // Step 3: Get all subtopics in one batch call
  const keywordIds = keywords.map((kw) => kw.id);
  const subtopics = await fetchSubtopicsBatch(keywordIds);

  // Step 4: Get BKT states for all subtopics in one batch call
  const subtopicIds = subtopics.map((st) => st.id);
  const bktMap = await fetchBktStatesBatch(subtopicIds);

  // Step 5: Aggregate
  return buildKeywordMasteryMap(keywords, subtopics, bktMap);
}

/**
 * Fetch keyword mastery data for a single summary.
 * More efficient when the context is already scoped to one summary.
 *
 * Flow (3 calls, fixed):
 *   1. GET /keywords?summary_id=X             -> keywords     (1 call)
 *   2. GET /subtopics-batch?keyword_ids=...   -> subtopics    (1 call)
 *   3. GET /bkt-states?subtopic_ids=...       -> BKT states   (1 call)
 *   4. Aggregate locally
 *
 * @param summaryId - The summary UUID
 * @returns KeywordMasteryMap keyed by keyword_id
 */
export async function fetchKeywordMasteryBySummary(
  summaryId: string
): Promise<KeywordMasteryMap> {
  // Step 1: Get keywords for this summary
  const kwResult = await apiCall<unknown>(`/keywords?summary_id=${summaryId}`);
  const keywords = unwrapItems<RawKeyword>(kwResult).filter(
    (kw) => !kw.deleted_at && kw.is_active !== false
  );

  if (keywords.length === 0) {
    return new Map();
  }

  // Step 2: Get all subtopics in one batch call
  const keywordIds = keywords.map((kw) => kw.id);
  const subtopics = await fetchSubtopicsBatch(keywordIds);

  // Step 3: Get BKT states for all subtopics in one batch call
  const subtopicIds = subtopics.map((st) => st.id);
  const bktMap = await fetchBktStatesBatch(subtopicIds);

  // Step 4: Aggregate
  return buildKeywordMasteryMap(keywords, subtopics, bktMap);
}

/**
 * Compute keyword mastery locally (pure function, zero API calls).
 *
 * Used during an active session to provide optimistic mastery updates
 * as the student answers flashcards. The BKT updates computed by
 * useReviewBatch are passed in as sessionBktUpdates.
 *
 * This does NOT persist anything — the real BKT states are only
 * persisted at session end via POST /review-batch (rule S6).
 *
 * @param existingMastery - The mastery map fetched at session start
 * @param sessionBktUpdates - Map<subtopic_id, new_p_know> from local BKT computations
 * @returns A new KeywordMasteryMap with updated values (immutable)
 */
export function computeLocalKeywordMastery(
  existingMastery: KeywordMasteryMap,
  sessionBktUpdates: Map<string, number>
): KeywordMasteryMap {
  if (sessionBktUpdates.size === 0) {
    return existingMastery;
  }

  const updated: KeywordMasteryMap = new Map();

  for (const [kwId, kwInfo] of existingMastery) {
    // Check if any of this keyword's subtopics were updated
    const hasUpdates = kwInfo.subtopics.some(
      (st) => sessionBktUpdates.has(st.id)
    );

    if (!hasUpdates) {
      // No changes — reuse existing entry (immutable optimization)
      updated.set(kwId, kwInfo);
      continue;
    }

    // Rebuild subtopics with updated p_know values
    const newSubtopics: SubtopicMasteryInfo[] = kwInfo.subtopics.map((st) => {
      const newPKnow = sessionBktUpdates.get(st.id);
      if (newPKnow === undefined) return st; // No update for this subtopic

      return {
        ...st,
        p_know: newPKnow,
        hasData: true, // We now have data from the session
        isMastered: newPKnow >= MASTERY_THRESHOLD,
        // Note: total_attempts/correct_attempts are NOT updated here
        // because useReviewBatch accumulates them as deltas.
        // They'll be accurate after submitBatch().
      };
    });

    // Recompute keyword-level aggregation
    const subtopicsTotal = newSubtopics.length;
    const subtopicsMastered = newSubtopics.filter((s) => s.isMastered).length;

    let mastery = -1;
    if (subtopicsTotal > 0) {
      const sum = newSubtopics.reduce((acc, s) => acc + s.p_know, 0);
      mastery = sum / subtopicsTotal;
    }

    updated.set(kwId, {
      ...kwInfo,
      mastery,
      subtopics: newSubtopics,
      isMastered: mastery >= MASTERY_THRESHOLD,
      subtopicsMastered,
      subtopicsTotal,
    });
  }

  return updated;
}

/**
 * Compute a TopicMasterySummary from a KeywordMasteryMap.
 * Useful for dashboard display and session summary screens.
 *
 * @param masteryMap - The keyword mastery map
 * @returns Summary with overall mastery and weakest keywords
 */
export function computeTopicMasterySummary(
  masteryMap: KeywordMasteryMap
): TopicMasterySummary {
  const keywords = Array.from(masteryMap.values());
  const keywordsTotal = keywords.length;
  const keywordsMastered = keywords.filter((kw) => kw.isMastered).length;

  let overallMastery = 0;
  if (keywordsTotal > 0) {
    const sum = keywords.reduce((acc, kw) => acc + kw.mastery, 0);
    overallMastery = sum / keywordsTotal;
  }

  // Sort by mastery ascending, then by priority descending (tiebreaker)
  const sortByMasteryThenPriority = (a: KeywordMasteryInfo, b: KeywordMasteryInfo) => {
    const masteryDiff = a.mastery - b.mastery;
    if (Math.abs(masteryDiff) > 0.001) return masteryDiff;
    return b.priority - a.priority; // higher priority first as tiebreaker
  };

  const allKeywordsByMastery = [...keywords].sort(sortByMasteryThenPriority);

  // Only unmastered keywords for AI targeting
  const weakestKeywords = allKeywordsByMastery.filter((kw) => !kw.isMastered);

  return {
    keywordsTotal,
    keywordsMastered,
    overallMastery,
    weakestKeywords,
    allKeywordsByMastery,
  };
}
