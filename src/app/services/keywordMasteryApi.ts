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

// ── Constants ───────────────────────────────────────────

/** Threshold for a subtopic/keyword to be considered "mastered" */
export const MASTERY_THRESHOLD = 0.75;

/** Max keyword IDs per subtopics-batch call (backend limit) */
const MAX_KEYWORD_IDS_PER_BATCH = 50;

/** Max subtopic IDs per bkt-states call (backend limit) */
const MAX_SUBTOPIC_IDS_PER_BATCH = 200;

// ── Mastery Color Helpers ─────────────────────────────────

/** Mastery color matching the dashboard convention in studentApi.ts */
export type MasteryColor = 'green' | 'yellow' | 'red';

export function getMasteryColor(mastery: number): MasteryColor {
  if (mastery >= 0.80) return 'green';
  if (mastery >= 0.50) return 'yellow';
  return 'red';
}

// ── Types ───────────────────────────────────────────────

export interface SubtopicMasteryInfo {
  id: string;
  name: string;
  keyword_id: string;
  order_index: number;
  p_know: number;
  total_attempts: number;
  correct_attempts: number;
  hasData: boolean;
  isMastered: boolean;
}

export interface KeywordMasteryInfo {
  keyword_id: string;
  name: string;
  definition: string;
  summary_id: string;
  priority: number;
  mastery: number;
  subtopics: SubtopicMasteryInfo[];
  isMastered: boolean;
  subtopicsMastered: number;
  subtopicsTotal: number;
}

export type KeywordMasteryMap = Map<string, KeywordMasteryInfo>;

export interface TopicMasterySummary {
  keywordsTotal: number;
  keywordsMastered: number;
  overallMastery: number;
  weakestKeywords: KeywordMasteryInfo[];
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

// ── Helpers ─────────────────────────────────────────────

function unwrapItems<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && 'items' in result) {
    return (result as { items: T[] }).items || [];
  }
  return [];
}

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

  const chunks_ = chunk(keywordIds, MAX_KEYWORD_IDS_PER_BATCH);

  // OPT-2: Parallelize chunk fetches
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

  const chunks_ = chunk(subtopicIds, MAX_SUBTOPIC_IDS_PER_BATCH);

  // OPT-2: Parallelize chunk fetches
  const tasks = chunks_.map((batch) => async () => {
    const idsParam = batch.join(',');
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
  const subtopicsByKeyword = new Map<string, RawSubtopic[]>();
  for (const st of subtopics) {
    const list = subtopicsByKeyword.get(st.keyword_id) || [];
    list.push(st);
    subtopicsByKeyword.set(st.keyword_id, list);
  }

  const map: KeywordMasteryMap = new Map();

  for (const kw of keywords) {
    const kwSubtopics = subtopicsByKeyword.get(kw.id) || [];
    kwSubtopics.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

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

    const subtopicsTotal = subtopicInfos.length;
    const subtopicsMastered = subtopicInfos.filter((s) => s.isMastered).length;

    let mastery = 0;
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

// ── Public API ──────────────────────────────────────────

export async function fetchKeywordMasteryByTopic(
  topicId: string
): Promise<KeywordMasteryMap> {
  const topicData = await apiCall<any>(`/topic-progress?topic_id=${topicId}`);
  const summaries: { id: string }[] = topicData?.summaries || [];

  if (summaries.length === 0) return new Map();

  const summaryIds = summaries.map((s) => s.id);
  const keywords = await fetchKeywordsForSummaries(summaryIds);

  if (keywords.length === 0) return new Map();

  const keywordIds = keywords.map((kw) => kw.id);
  const subtopics = await fetchSubtopicsBatch(keywordIds);
  const subtopicIds = subtopics.map((st) => st.id);
  const bktMap = await fetchBktStatesBatch(subtopicIds);

  return buildKeywordMasteryMap(keywords, subtopics, bktMap);
}

export async function fetchKeywordMasteryBySummary(
  summaryId: string
): Promise<KeywordMasteryMap> {
  const kwResult = await apiCall<unknown>(`/keywords?summary_id=${summaryId}`);
  const keywords = unwrapItems<RawKeyword>(kwResult).filter(
    (kw) => !kw.deleted_at && kw.is_active !== false
  );

  if (keywords.length === 0) return new Map();

  const keywordIds = keywords.map((kw) => kw.id);
  const subtopics = await fetchSubtopicsBatch(keywordIds);
  const subtopicIds = subtopics.map((st) => st.id);
  const bktMap = await fetchBktStatesBatch(subtopicIds);

  return buildKeywordMasteryMap(keywords, subtopics, bktMap);
}

export function computeLocalKeywordMastery(
  existingMastery: KeywordMasteryMap,
  sessionBktUpdates: Map<string, number>
): KeywordMasteryMap {
  if (sessionBktUpdates.size === 0) return existingMastery;

  const updated: KeywordMasteryMap = new Map();

  for (const [kwId, kwInfo] of existingMastery) {
    const hasUpdates = kwInfo.subtopics.some(
      (st) => sessionBktUpdates.has(st.id)
    );

    if (!hasUpdates) {
      updated.set(kwId, kwInfo);
      continue;
    }

    const newSubtopics: SubtopicMasteryInfo[] = kwInfo.subtopics.map((st) => {
      const newPKnow = sessionBktUpdates.get(st.id);
      if (newPKnow === undefined) return st;

      return {
        ...st,
        p_know: newPKnow,
        hasData: true,
        isMastered: newPKnow >= MASTERY_THRESHOLD,
      };
    });

    const subtopicsTotal = newSubtopics.length;
    const subtopicsMastered = newSubtopics.filter((s) => s.isMastered).length;

    let mastery = 0;
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

  const sortByMasteryThenPriority = (a: KeywordMasteryInfo, b: KeywordMasteryInfo) => {
    const masteryDiff = a.mastery - b.mastery;
    if (Math.abs(masteryDiff) > 0.001) return masteryDiff;
    return b.priority - a.priority;
  };

  const allKeywordsByMastery = [...keywords].sort(sortByMasteryThenPriority);
  const weakestKeywords = allKeywordsByMastery.filter((kw) => !kw.isMastered);

  return {
    keywordsTotal,
    keywordsMastered,
    overallMastery,
    weakestKeywords,
    allKeywordsByMastery,
  };
}
