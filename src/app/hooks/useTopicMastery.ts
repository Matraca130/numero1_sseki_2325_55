// ============================================================
// Axon — useTopicMastery hook  (Phase 1 + Phase 2)
//
// Fetches BKT states + FSRS states + flashcard catalog and
// computes real mastery percentages per topic/subtopic and per
// course.
//
// Phase 1: BKT p_know as primary mastery signal.
// Phase 2: Maps FSRS states -> flashcard_id -> subtopic_id for
//          per-topic due/overdue card counts.
//
// Returns:
//   topicMastery   — Map<topicId, MasteryInfo>
//   courseMastery  — Map<courseId, number>  (avg mastery 0-100)
//   loading, error
// ============================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { getAxonToday } from '@/app/utils/constants';
import {
  getFsrsStates,
  type BktStateRecord,
  type FsrsStateRecord,
  type FlashcardCard,
} from '@/app/services/platformApi';
import { getFlashcardsByTopic } from '@/app/services/flashcardApi';

// ── Types ────────────────────────────────────────────────────────

export interface TopicMasteryInfo {
  topicId: string;
  /** BKT p_know (0-1), null if no BKT state exists */
  pKnow: number | null;
  /** Mastery percentage 0-100 derived from p_know */
  masteryPercent: number;
  /** Total attempts from BKT */
  totalAttempts: number;
  /** Correct attempts from BKT */
  correctAttempts: number;
  /** FSRS cards due (overdue for review) for THIS topic */
  fsrsDueCount: number;
  /** FSRS total cards tracked for THIS topic */
  fsrsTotalCards: number;
  /** Average FSRS stability across cards for this topic */
  avgStability: number;
  /** Dominant FSRS state: new | learning | review | relearning */
  dominantFsrsState: FsrsStateRecord['state'] | null;
  /** Whether this topic needs priority review (low mastery OR overdue) */
  needsReview: boolean;
  /** Priority score for plan generation (0-100, higher = needs more work) */
  priorityScore: number;
}

export interface UseTopicMasteryResult {
  /** Per-topic mastery info keyed by topicId (subtopic_id) */
  topicMastery: Map<string, TopicMasteryInfo>;
  /** Per-course average mastery (0-100) keyed by courseId */
  courseMastery: Map<string, number>;
  /** FSRS states loaded */
  fsrsStates: FsrsStateRecord[];
  /** Flashcard → subtopic mapping (Phase 2) */
  flashcardToTopicMap: Map<string, string>;
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Re-fetch data */
  refresh: () => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────────

function groupBktByTopic(bktStates: BktStateRecord[]): Map<string, BktStateRecord> {
  const map = new Map<string, BktStateRecord>();
  for (const s of bktStates) {
    const existing = map.get(s.subtopic_id);
    if (!existing || s.total_attempts > existing.total_attempts) {
      map.set(s.subtopic_id, s);
    }
  }
  return map;
}

function buildFlashcardToTopicMap(flashcards: FlashcardCard[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const fc of flashcards) {
    if (fc.subtopic_id) {
      map.set(fc.id, fc.subtopic_id as string);
    }
  }
  return map;
}

interface TopicFsrsAggregate {
  totalCards: number;
  dueCount: number;
  stabilitySum: number;
  byState: Record<string, number>;
}

function groupFsrsByTopic(
  fsrsStates: FsrsStateRecord[],
  flashcardToTopic: Map<string, string>,
): Map<string, TopicFsrsAggregate> {
  const now = getAxonToday().toISOString();
  const map = new Map<string, TopicFsrsAggregate>();
  for (const s of fsrsStates) {
    const topicId = s.flashcard_id ? flashcardToTopic.get(s.flashcard_id) : undefined;
    if (!topicId) continue;
    let agg = map.get(topicId);
    if (!agg) { agg = { totalCards: 0, dueCount: 0, stabilitySum: 0, byState: {} }; map.set(topicId, agg); }
    agg.totalCards++;
    if (s.due && s.due < now) agg.dueCount++;
    agg.stabilitySum += s.stability;
    agg.byState[s.state] = (agg.byState[s.state] || 0) + 1;
  }
  return map;
}

function getDominantState(byState: Record<string, number>): FsrsStateRecord['state'] | null {
  let maxCount = 0;
  let dominant: FsrsStateRecord['state'] | null = null;
  for (const [state, count] of Object.entries(byState)) {
    if (count > maxCount) { maxCount = count; dominant = state as FsrsStateRecord['state']; }
  }
  return dominant;
}

function computePriorityScore(pKnow: number | null, fsrsAgg: TopicFsrsAggregate | undefined): number {
  const masteryFactor = pKnow !== null ? (1 - pKnow) * 60 : 50;
  const duePenalty = fsrsAgg ? Math.min(fsrsAgg.dueCount * 5, 20) : 0;
  const avgStab = fsrsAgg && fsrsAgg.totalCards > 0 ? fsrsAgg.stabilitySum / fsrsAgg.totalCards : -1;
  const stabPenalty = avgStab < 0 ? 0 : avgStab < 1 ? 15 : avgStab < 5 ? 10 : avgStab < 15 ? 5 : 0;
  const relearningCount = (fsrsAgg?.byState['relearning'] || 0) + (fsrsAgg?.byState['learning'] || 0);
  const statePenalty = Math.min(relearningCount * 3, 10);
  return Math.min(100, Math.round(masteryFactor + duePenalty + stabPenalty + statePenalty));
}

const MASTERY_LOW_THRESHOLD = 0.5;

// ── Hook ─────────────────────────────────────────────────────────

export function useTopicMastery(
  topicIds?: string[],
  topicToCourseMap?: Map<string, string>,
): UseTopicMasteryResult {
  const { bktStates, loading: studentLoading } = useStudentDataContext();
  const [fsrsStates, setFsrsStates] = useState<FsrsStateRecord[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardCard[]>([]);
  const [fsrsLoading, setFsrsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // BUG-033 fix: GET /flashcards requires summary_id (backend crud-factory
  // returns 400 without it). Use GET /flashcards-by-topic per topic instead,
  // which doesn't require summary_id and returns all active flashcards for
  // each topic in a single call. Skip when topicIds not provided.
  const fetchFsrsAndFlashcards = useCallback(async () => {
    setFsrsLoading(true);
    setError(null);
    try {
      // FSRS states don't require summary_id
      const fsrsRes = await getFsrsStates({ limit: 500 }).catch((err: any) => {
        console.warn('[useTopicMastery] FSRS fetch failed:', err.message);
        return [] as FsrsStateRecord[];
      });
      setFsrsStates(fsrsRes);

      // Fetch flashcards per-topic (only when topicIds available)
      if (topicIds && topicIds.length > 0) {
        const perTopicResults = await Promise.allSettled(
          topicIds.map(tid => getFlashcardsByTopic(tid, { limit: 500 }))
        );
        const allCards: FlashcardCard[] = [];
        for (const res of perTopicResults) {
          if (res.status === 'fulfilled' && res.value?.items) {
            for (const item of res.value.items) {
              allCards.push(item as unknown as FlashcardCard);
            }
          }
        }
        setFlashcards(allCards);
      } else {
        setFlashcards([]);
      }
    } catch (err: any) {
      console.warn('[useTopicMastery] fetch failed:', err.message);
      setFsrsStates([]); setFlashcards([]);
    } finally { setFsrsLoading(false); }
  }, [topicIds]);

  useEffect(() => { fetchFsrsAndFlashcards(); }, [fetchFsrsAndFlashcards]);
  const refresh = fetchFsrsAndFlashcards;

  const flashcardToTopicMap = useMemo(() => buildFlashcardToTopicMap(flashcards), [flashcards]);

  const topicMastery = useMemo(() => {
    const bktMap = groupBktByTopic(bktStates);
    const fsrsByTopic = groupFsrsByTopic(fsrsStates, flashcardToTopicMap);
    const map = new Map<string, TopicMasteryInfo>();
    const ids = topicIds ?? Array.from(bktMap.keys());
    for (const topicId of ids) {
      const bkt = bktMap.get(topicId);
      const fsrsAgg = fsrsByTopic.get(topicId);
      const pKnow = bkt?.p_know ?? null;
      const avgStability = fsrsAgg && fsrsAgg.totalCards > 0 ? fsrsAgg.stabilitySum / fsrsAgg.totalCards : 0;
      map.set(topicId, {
        topicId, pKnow,
        masteryPercent: pKnow !== null ? Math.round(pKnow * 100) : 0,
        totalAttempts: bkt?.total_attempts ?? 0,
        correctAttempts: bkt?.correct_attempts ?? 0,
        fsrsDueCount: fsrsAgg?.dueCount ?? 0,
        fsrsTotalCards: fsrsAgg?.totalCards ?? 0,
        avgStability,
        dominantFsrsState: fsrsAgg ? getDominantState(fsrsAgg.byState) : null,
        needsReview: pKnow !== null ? pKnow < MASTERY_LOW_THRESHOLD || (fsrsAgg?.dueCount ?? 0) > 0 : true,
        priorityScore: computePriorityScore(pKnow, fsrsAgg),
      });
    }
    return map;
  }, [bktStates, fsrsStates, flashcardToTopicMap, topicIds]);

  const courseMastery = useMemo(() => {
    const map = new Map<string, number>();
    if (!topicToCourseMap) return map;
    const courseAccum = new Map<string, { sum: number; count: number }>();
    for (const [topicId, info] of topicMastery) {
      const courseId = topicToCourseMap.get(topicId);
      if (!courseId) continue;
      const acc = courseAccum.get(courseId) || { sum: 0, count: 0 };
      acc.sum += info.masteryPercent; acc.count += 1;
      courseAccum.set(courseId, acc);
    }
    for (const [courseId, acc] of courseAccum) {
      map.set(courseId, acc.count > 0 ? Math.round(acc.sum / acc.count) : 0);
    }
    return map;
  }, [topicMastery, topicToCourseMap]);

  return { topicMastery, courseMastery, fsrsStates, flashcardToTopicMap, loading: studentLoading || fsrsLoading, error, refresh };
}
