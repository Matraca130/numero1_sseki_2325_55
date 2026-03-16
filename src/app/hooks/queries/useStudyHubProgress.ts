// ============================================================
// Axon — useStudyHubProgress
//
// Derives real per-topic and per-section progress for StudyHubView
// by cross-referencing:
//   1. ALL reading states for the student (1 HTTP call)
//   2. ALL BKT states for the student (1 HTTP call, optional)
//   3. Course-level summaries data (1 HTTP call → fallback: N calls)
//
// Evolution phases:
//   Phase 1 (current): reading-state-based mastery
//     masteryPercent = (completed_summaries / total_summaries) * 100
//
//   Phase 2 (BKT-ready): blended mastery
//     If BKT data exists for a topic's subtopics:
//       masteryPercent = avg(p_know) * 100  (weighted by BKT)
//     Else: fall back to reading-state-based mastery
//
//   Phase 3 (backend endpoint): 1 call replaces N section calls
//     GET /course-progress?course_id=xxx returns everything
//     Falls back to N getTopicsOverview() calls if 404
//
// Data flow:
//   getAllReadingStates()     → Map<summary_id, ReadingState>
//   getAllBktStates()         → Map<subtopic_id, BktState>
//   getCourseProgress(...)    → summaries_by_topic + bkt_mastery_by_topic
//   Cross-reference           → per-topic mastery + per-section progress
//
// Performance:
//   2-3 HTTP calls total (reading states + bkt states + course progress)
//   All cached by React Query with appropriate stale times.
//   Cache warming in StudentShell ensures instant load on StudyHub.
// ============================================================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { getAllReadingStates } from '@/app/services/studentSummariesApi';
import type { ReadingState } from '@/app/services/studentSummariesApi';
import { getAllBktStates } from '@/app/services/bktApi';
import type { BktState } from '@/app/services/bktApi';
import { getCourseProgress } from '@/app/services/topicProgressApi';
import type { CourseProgressResponse } from '@/app/services/topicProgressApi';
import type { ContentTree, TreeSection, TreeSemester } from '@/app/services/contentTreeApi';
import type { Summary } from '@/app/services/summariesApi';
import type { TopicStatus, SectionProgress } from '@/app/components/content/studyhub-helpers';
import { formatRelativeTime } from '@/app/components/content/studyhub-helpers';
import type { TopicProgress } from '@/app/types/student';

// ── Types ─────────────────────────────────────────────────

export interface StudyHubProgressResult {
  /** Per-topic status: 'mastered' | 'in-progress' | 'not-started' */
  topicStatusMap: Map<string, TopicStatus>;
  /** Per-section progress stats */
  sectionProgressMap: Map<string, SectionProgress>;
  /** Mastery data for a specific topic (for the hero card) */
  getTopicMastery: (topicId: string | undefined) => TopicProgress | null;
  /** Set of topic IDs that have any reading activity */
  touchedTopicIds: Set<string>;
  /** Whether progress data is still loading */
  isLoading: boolean;
}

// ── Internal: extract sections from tree ──────────────────

interface SectionWithTopicIds {
  sectionId: string;
  section: TreeSection;
  topicIds: string[];
}

function extractSections(semesters: TreeSemester[]): SectionWithTopicIds[] {
  const result: SectionWithTopicIds[] = [];
  for (const sem of semesters) {
    for (const sec of sem.sections ?? []) {
      result.push({
        sectionId: sec.id,
        section: sec,
        topicIds: sec.topics.map(t => t.id),
      });
    }
  }
  return result;
}

// ── Hook ──────────────────────────────────────────────────

export function useStudyHubProgress(
  tree: ContentTree | null,
): StudyHubProgressResult {
  const course = tree?.courses?.[0] ?? null;
  const courseId = course?.id ?? '';
  const semesters = course?.semesters ?? [];

  const sections = useMemo(() => extractSections(semesters), [semesters]);
  const allTopicIds = useMemo(
    () => sections.flatMap(s => s.topicIds),
    [sections],
  );

  // ── Step 1: Fetch ALL reading states (1 HTTP call) ──────
  const readingStatesQuery = useQuery({
    queryKey: queryKeys.allReadingStates(),
    queryFn: getAllReadingStates,
    staleTime: 5 * 60 * 1000, // 5 min
    enabled: !!course,
  });

  // ── Step 2: Fetch ALL BKT states (1 HTTP call) ──────────
  // Phase 2: BKT data provides quiz/flashcard-based mastery.
  // Graceful: returns [] if endpoint fails or no BKT data yet.
  const bktQuery = useQuery({
    queryKey: queryKeys.allBktStates(),
    queryFn: getAllBktStates,
    staleTime: 5 * 60 * 1000,
    enabled: !!course,
  });

  // ── Step 3: Fetch course progress (1 call → fallback: N calls) ──
  // Uses getCourseProgress with withFallback pattern:
  //   - Tries GET /course-progress?course_id=xxx (1 call)
  //   - Falls back to N getTopicsOverview() calls if 404
  const courseProgressQuery = useQuery({
    queryKey: queryKeys.courseProgress(courseId),
    queryFn: () => getCourseProgress(courseId, allTopicIds, sections),
    staleTime: 10 * 60 * 1000, // 10 min — content structure rarely changes
    enabled: !!courseId && sections.length > 0,
  });

  // ── Step 4: Cross-reference and derive progress ─────────
  const result = useMemo((): Omit<StudyHubProgressResult, 'isLoading'> => {
    const topicStatusMap = new Map<string, TopicStatus>();
    const sectionProgressMap = new Map<string, SectionProgress>();
    const touchedTopicIds = new Set<string>();

    // Build reading-state lookup: summary_id → ReadingState
    const readingStateMap = new Map<string, ReadingState>();
    for (const rs of readingStatesQuery.data ?? []) {
      readingStateMap.set(rs.summary_id, rs);
    }

    // Build BKT lookup: subtopic_id → BktState
    const bktMap = new Map<string, BktState>();
    for (const bkt of bktQuery.data ?? []) {
      bktMap.set(bkt.subtopic_id, bkt);
    }

    // Build summary→topic mapping from course progress response
    const cpData: CourseProgressResponse = courseProgressQuery.data ?? {
      summaries_by_topic: {},
      keyword_counts_by_topic: {},
    };
    const topicSummaryMap = new Map<string, Summary[]>();
    for (const [topicId, summaries] of Object.entries(cpData.summaries_by_topic)) {
      topicSummaryMap.set(topicId, summaries);
    }

    // ── Phase 2: Server-side BKT mastery (optional) ────────
    // If the backend returns bkt_mastery_by_topic, use it directly
    // (most accurate — server aggregates subtopic p_know per topic)
    const serverBktMastery = cpData.bkt_mastery_by_topic ?? {};

    // ── Derive per-topic status ────────────────────────────
    const topicMasteryMap = new Map<string, {
      masteryPercent: number;
      completedSummaries: number;
      totalSummaries: number;
      lastReadAt: string | null;
      bktMastery: number | null;  // Phase 2: BKT-derived mastery (0-100)
    }>();

    for (const sem of semesters) {
      for (const sec of sem.sections ?? []) {
        for (const t of sec.topics ?? []) {
          const summaries = topicSummaryMap.get(t.id) ?? [];
          const published = summaries.filter(s => s.status === 'published');
          const total = published.length;

          let completed = 0;
          let anyRead = false;
          let lastReadAt: string | null = null;

          for (const s of published) {
            const rs = readingStateMap.get(s.id);
            if (rs) {
              anyRead = true;
              if (rs.completed) completed++;
              if (rs.last_read_at && (!lastReadAt || rs.last_read_at > lastReadAt)) {
                lastReadAt = rs.last_read_at;
              }
            }
          }

          // ── Phase 2: BKT mastery resolution ──────────────
          // Priority: server-side BKT > client-side BKT > reading-state fallback
          let bktMastery: number | null = null;

          // 1. Server-side BKT (from /course-progress response)
          const serverBkt = serverBktMastery[t.id];
          if (serverBkt && serverBkt.total_subtopics > 0) {
            bktMastery = Math.round(serverBkt.avg_p_know * 100);
          }

          // 2. Client-side BKT (from getAllBktStates) — future enhancement
          // When subtopic→topic mapping is available on client, aggregate here.
          // For now, server-side BKT is the intended path.

          // ── Final mastery: BKT if available, else reading-based ──
          const readingMastery = total > 0 ? Math.round((completed / total) * 100) : 0;
          const masteryPercent = bktMastery ?? readingMastery;

          topicMasteryMap.set(t.id, {
            masteryPercent,
            completedSummaries: completed,
            totalSummaries: total,
            lastReadAt,
            bktMastery,
          });

          // Classify topic
          if (masteryPercent >= 80) {
            topicStatusMap.set(t.id, 'mastered');
            touchedTopicIds.add(t.id);
          } else if (anyRead || masteryPercent > 0) {
            topicStatusMap.set(t.id, 'in-progress');
            touchedTopicIds.add(t.id);
          } else {
            topicStatusMap.set(t.id, 'not-started');
          }
        }
      }
    }

    // ── Derive per-section progress ────────────────────────
    for (const sem of semesters) {
      for (const sec of sem.sections ?? []) {
        const topicIds = new Set(sec.topics.map(t => t.id));
        const sectionTouched: string[] = [];
        let latestReadAt: string | null = null;

        for (const tid of topicIds) {
          if (touchedTopicIds.has(tid)) {
            sectionTouched.push(tid);
          }
          const tm = topicMasteryMap.get(tid);
          if (tm?.lastReadAt && (!latestReadAt || tm.lastReadAt > latestReadAt)) {
            latestReadAt = tm.lastReadAt;
          }
        }

        const completedTopics = sectionTouched.length;
        const progress = sec.topics.length > 0
          ? Math.round((completedTopics / sec.topics.length) * 100)
          : 0;

        const nextTopic = sec.topics.find(t => !touchedTopicIds.has(t.id));

        sectionProgressMap.set(sec.id, {
          completedTopics,
          progress,
          lastActivity: formatRelativeTime(latestReadAt),
          nextTopicName: nextTopic?.name,
          touchedTopicIds: sectionTouched,
          nextTopicId: nextTopic?.id,
        });
      }
    }

    // ── getTopicMastery factory ────────────────────────────
    const getTopicMastery = (topicId: string | undefined): TopicProgress | null => {
      if (!topicId) return null;
      const tm = topicMasteryMap.get(topicId);
      if (!tm) return null;

      // Find section info for this topic
      let sectionId = '';
      let sectionTitle = '';
      let topicTitle = '';
      for (const sem of semesters) {
        for (const sec of sem.sections ?? []) {
          for (const t of sec.topics ?? []) {
            if (t.id === topicId) {
              sectionId = sec.id;
              sectionTitle = sec.name;
              topicTitle = t.name;
            }
          }
        }
      }

      return {
        topicId,
        topicTitle,
        sectionId,
        sectionTitle,
        masteryPercent: tm.masteryPercent,
        flashcardsDue: 0, // TODO: derive from fsrs-states when available
        lastReviewedAt: tm.lastReadAt ?? undefined,
        reviewCount: tm.completedSummaries,
      };
    };

    return {
      topicStatusMap,
      sectionProgressMap,
      getTopicMastery,
      touchedTopicIds,
    };
  }, [
    readingStatesQuery.data,
    bktQuery.data,
    courseProgressQuery.data,
    semesters,
  ]);

  const isLoading = readingStatesQuery.isLoading
    || courseProgressQuery.isLoading;
  // Note: bktQuery.isLoading is NOT included — BKT is optional enhancement.
  // If BKT is slow or fails, the UI still shows reading-based progress immediately.

  return {
    ...result,
    isLoading,
  };
}
