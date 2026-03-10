// ============================================================
// useTopicLookup — Shared hook for topic ID → metadata resolution
//
// Centralizes the 4-level content tree traversal that was duplicated
// in KnowledgeHeatmapView, MasteryDashboardView, and StudyDashboardsView.
//
// USAGE:
//   const { topicLookup, getTopicName } = useTopicLookup();
//
//   // Simple: just the name with a fallback
//   getTopicName(subtopicId, 'Tema desconocido')
//
//   // Rich: full metadata (section, course, etc.)
//   const entry = topicLookup.get(subtopicId);
//   entry?.sectionName, entry?.courseId, ...
//
// The map is memoized on `tree` — only recomputes when content tree changes.
// ============================================================

import { useMemo, useCallback } from 'react';
import { useContentTree } from '@/app/context/ContentTreeContext';

/**
 * Metadata stored per topic in the lookup map.
 * Includes the full lineage (topic → section → course) so consumers
 * can group, filter, or display context without re-traversing the tree.
 */
export interface TopicLookupEntry {
  topicName: string;
  sectionName: string;
  sectionId: string;
  courseName: string;
  courseId: string;
}

export function useTopicLookup() {
  const { tree } = useContentTree();

  const topicLookup = useMemo(() => {
    const map = new Map<string, TopicLookupEntry>();
    if (!tree) return map;

    // 4-level traversal: course → semester → section → topic
    // Defensive: skip levels with missing arrays (partial tree loads)
    for (const course of tree.courses ?? []) {
      for (const semester of course.semesters ?? []) {
        for (const section of semester.sections ?? []) {
          for (const topic of section.topics ?? []) {
            map.set(topic.id, {
              topicName: topic.name,
              sectionName: section.name,
              sectionId: section.id,
              courseName: course.name,
              courseId: course.id,
            });
          }
        }
      }
    }
    return map;
  }, [tree]);

  /**
   * Convenience: resolve a subtopic ID to its display name.
   * Falls back to `fallback` if the ID is not in the tree,
   * then to the raw `subtopicId` as last resort.
   *
   * Uses `||` (not `??`) to match existing consumer behavior
   * where an empty-string topic name should also trigger fallback.
   */
  const getTopicName = useCallback(
    (subtopicId: string, fallback?: string): string => {
      return topicLookup.get(subtopicId)?.topicName || fallback || subtopicId;
    },
    [topicLookup],
  );

  return { topicLookup, getTopicName } as const;
}
