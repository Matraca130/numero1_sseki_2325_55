// ============================================================
// useLastStudiedTopic — pure derived state, zero side-effects
//
// Given the real content tree and session history, returns
// the most recently studied topic (or the first available one
// as a recommendation). StudyHubView uses this as a fallback
// when AppContext.currentTopic is null.
// ============================================================
import { useMemo } from 'react';
import type { TreeSemester, TreeTopic } from '@/app/services/contentTreeApi';
import type { StudySession } from '@/app/types/student';

export interface DerivedTopic {
  id: string;
  name: string;
  /** Whether this comes from a real session or is just the first topic in the tree */
  source: 'session' | 'recommendation';
}

/**
 * Builds a flat lookup of all topics in the tree, keyed by id.
 */
function buildTopicMap(semesters: TreeSemester[]): Map<string, TreeTopic> {
  const map = new Map<string, TreeTopic>();
  for (const sem of semesters) {
    for (const sec of sem.sections ?? []) {
      for (const t of sec.topics) {
        map.set(t.id, t);
      }
    }
  }
  return map;
}

export function useLastStudiedTopic(
  semesters: TreeSemester[],
  sessions: StudySession[],
): DerivedTopic | null {
  return useMemo(() => {
    const topicMap = buildTopicMap(semesters);
    if (topicMap.size === 0) return null;

    // 1. Find the most recent session that references a topic still in the tree
    const sorted = [...sessions]
      .filter(s => s.topicId && topicMap.has(s.topicId))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

    if (sorted.length > 0) {
      const topic = topicMap.get(sorted[0].topicId!)!;
      return { id: topic.id, name: topic.name, source: 'session' };
    }

    // 2. No sessions — recommend the first topic in tree order
    const first = semesters[0]?.sections?.[0]?.topics?.[0];
    if (first) {
      return { id: first.id, name: first.name, source: 'recommendation' };
    }

    return null;
  }, [semesters, sessions]);
}
