// ============================================================
// Axon — useTopicMastery hook  (Phase 1 + Phase 2)
//
// Fetches BKT states + FSRS states + flashcard catalog and
// computes real mastery percentages per topic/subtopic and per
// course.
//
// Phase 1: BKT p_know as primary mastery signal.
// Phase 2: Maps FSRS states → flashcard_id → subtopic_id for
//          per-topic due/overdue card counts.
//
// Returns:
//   topicMastery   — Map<topicId, MasteryInfo>
//   courseMastery  — Map<courseId, number>  (avg mastery 0-100)
//   loading, error
// ============================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import {
  getFsrsStates,
  getFlashcards,
  type BktStateRecord,
  type FsrsStateRecord,
  type FlashcardCard,
} from '@/app/services/platformApi';

// ── Types ────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────

/** Group BKT states by subtopic_id */
function groupBktByTopic(bktStates: BktStateRecord[]): Map<string, BktStateRecord> {
  const map = new Map<string, BktStateRecord>();
  for (const s of bktStates) {
    // If multiple BKT rows per subtopic, keep the one with most attempts
    const existing = map.get(s.subtopic_id);
    if (!existing || s.total_attempts > existing.total_attempts) {
      map.set(s.subtopic_id, s);
    }
  }
  return map;
}

/** Build flashcard_id → subtopic_id map from flashcard catalog */
function buildFlashcardToTopicMap(flashcards: FlashcardCard[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const fc of flashcards) {
    if (fc.subtopic_id) {
      map.set(fc.id, fc.subtopic_id as string);
    }
  }
  return map;
}

/** Phase 2: Group FSRS states by topic using flashcard→topic mapping */
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
  const now = new Date().toISOString();
  const map = new Map<string, TopicFsrsAggregate>();

  for (const s of fsrsStates) {
    // Resolve to topic via flashcard mapping
    const topicId = s.flashcard_id ? flashcardToTopic.get(s.flashcard_id) : undefined;
    if (!topicId) continue; // Can't map → skip

    let agg = map.get(topicId);
    if (!agg) {
      agg = { totalCards: 0, dueCount: 0, stabilitySum: 0, byState: {} };
      map.set(topicId, agg);
    }

    agg.totalCards++;
    if (s.due && s.due < now) agg.dueCount++;
    agg.stabilitySum += s.stability;
    agg.byState[s.state] = (agg.byState[s.state] || 0) + 1;
  }

  return map;
}

/** Determine dominant FSRS state from counts */
function getDominantState(byState: Record<string, number>): FsrsStateRecord['state'] | null {
  let maxCount = 0;
  let dominant: FsrsStateRecord['state'] | null = null;
  for (const [state, count] of Object.entries(byState)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = state as FsrsStateRecord['state'];
    }
  }
  return dominant;
}

/** Compute priority score (0-100): higher = needs more study.
 *  Factors: inverse mastery, overdue cards, low stability, state penalties. */
function computePriorityScore(
  pKnow: number | null,
  fsrsAgg: TopicFsrsAggregate | undefined,
): number {
  // Base: inverse of mastery (no data = high priority)
  const masteryFactor = pKnow !== null ? (1 - pKnow) * 60 : 50;

  // Due cards penalty (each overdue card adds up to 20 points)
  const duePenalty = fsrsAgg
    ? Math.min(fsrsAgg.dueCount * 5, 20)
    : 0;

  // Low stability penalty (only if FSRS data exists for this topic)
  const avgStab = fsrsAgg && fsrsAgg.totalCards > 0
    ? fsrsAgg.stabilitySum / fsrsAgg.totalCards
    : -1; // sentinel: no FSRS data
  const stabPenalty = avgStab < 0 ? 0 // no FSRS cards → no stability penalty
    : avgStab < 1 ? 15 : avgStab < 5 ? 10 : avgStab < 15 ? 5 : 0;

  // Relearning/learning state penalty
  const relearningCount = (fsrsAgg?.byState['relearning'] || 0) + (fsrsAgg?.byState['learning'] || 0);
  const statePenalty = Math.min(relearningCount * 3, 10);

  return Math.min(100, Math.round(masteryFactor + duePenalty + stabPenalty + statePenalty));
}

// ── Mastery threshold ────────────────────────────────────────
const MASTERY_LOW_THRESHOLD = 0.5; // p_know < 0.5 → needs review

// ── Hook ─────────────────────────────────────────────────────

export function useTopicMastery(
  /** Optional: only compute for these topic IDs */
  topicIds?: string[],
  /** Optional: map of topicId → courseId for course aggregation */
  topicToCourseMap?: Map<string, string>,
): UseTopicMasteryResult {
  const { bktStates, loading: studentLoading } = useStudentDataContext();
  const [fsrsStates, setFsrsStates] = useState<FsrsStateRecord[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardCard[]>([]);
  const [fsrsLoading, setFsrsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch FSRS states + flashcard catalog (Phase 2) ────────
  const fetchFsrsAndFlashcards = useCallback(async () => {
    setFsrsLoading(true);
    setError(null);
    try {
      // Parallel fetch: FSRS states + flashcard catalog
      const [fsrsRes, fcRes] = await Promise.allSettled([
        getFsrsStates({ limit: 500 }),
        getFlashcards({ status: 'published', limit: 500 }),
      ]);

      setFsrsStates(fsrsRes.status === 'fulfilled' ? fsrsRes.value : []);
      setFlashcards(fcRes.status === 'fulfilled' ? fcRes.value : []);

      if (fsrsRes.status === 'rejected') {
        console.warn('[useTopicMastery] FSRS fetch failed (non-blocking):', fsrsRes.reason?.message);
      }
      if (fcRes.status === 'rejected') {
        console.warn('[useTopicMastery] Flashcards fetch failed (non-blocking):', fcRes.reason?.message);
      }
    } catch (err: any) {
      console.warn('[useTopicMastery] fetch failed (non-blocking):', err.message);
      setFsrsStates([]);
      setFlashcards([]);
    } finally {
      setFsrsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFsrsAndFlashcards();
  }, [fetchFsrsAndFlashcards]);

  const refresh = fetchFsrsAndFlashcards;

  // ── Phase 2: Build flashcard → topic mapping ───────────────
  const flashcardToTopicMap = useMemo(
    () => buildFlashcardToTopicMap(flashcards),
    [flashcards],
  );

  // ── Compute mastery ────────────────────────────────────────
  const topicMastery = useMemo(() => {
    const bktMap = groupBktByTopic(bktStates);
    const fsrsByTopic = groupFsrsByTopic(fsrsStates, flashcardToTopicMap);
    const map = new Map<string, TopicMasteryInfo>();

    // If topicIds provided, compute only for those; otherwise all BKT topics
    const ids = topicIds ?? Array.from(bktMap.keys());

    for (const topicId of ids) {
      const bkt = bktMap.get(topicId);
      const fsrsAgg = fsrsByTopic.get(topicId);
      const pKnow = bkt?.p_know ?? null;
      const masteryPercent = pKnow !== null ? Math.round(pKnow * 100) : 0;

      const avgStability = fsrsAgg && fsrsAgg.totalCards > 0
        ? fsrsAgg.stabilitySum / fsrsAgg.totalCards
        : 0;

      map.set(topicId, {
        topicId,
        pKnow,
        masteryPercent,
        totalAttempts: bkt?.total_attempts ?? 0,
        correctAttempts: bkt?.correct_attempts ?? 0,
        // Phase 2: per-topic FSRS counts from real mapping
        fsrsDueCount: fsrsAgg?.dueCount ?? 0,
        fsrsTotalCards: fsrsAgg?.totalCards ?? 0,
        avgStability,
        dominantFsrsState: fsrsAgg ? getDominantState(fsrsAgg.byState) : null,
        needsReview: pKnow !== null
          ? pKnow < MASTERY_LOW_THRESHOLD || (fsrsAgg?.dueCount ?? 0) > 0
          : true, // no data = needs review
        priorityScore: computePriorityScore(pKnow, fsrsAgg),
      });
    }

    return map;
  }, [bktStates, fsrsStates, flashcardToTopicMap, topicIds]);

  // ── Course-level aggregation ───────────────────────────────
  const courseMastery = useMemo(() => {
    const map = new Map<string, number>();
    if (!topicToCourseMap) return map;

    const courseAccum = new Map<string, { sum: number; count: number }>();
    for (const [topicId, info] of topicMastery) {
      const courseId = topicToCourseMap.get(topicId);
      if (!courseId) continue;
      const acc = courseAccum.get(courseId) || { sum: 0, count: 0 };
      acc.sum += info.masteryPercent;
      acc.count += 1;
      courseAccum.set(courseId, acc);
    }

    for (const [courseId, acc] of courseAccum) {
      map.set(courseId, acc.count > 0 ? Math.round(acc.sum / acc.count) : 0);
    }

    return map;
  }, [topicMastery, topicToCourseMap]);

  return {
    topicMastery,
    courseMastery,
    fsrsStates,
    flashcardToTopicMap,
    loading: studentLoading || fsrsLoading,
    error,
    refresh,
  };
}