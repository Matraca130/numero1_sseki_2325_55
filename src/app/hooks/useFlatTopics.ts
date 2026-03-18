// ============================================================
// Axon — useFlatTopics hook
//
// Flattens the nested content tree into a flat list of topics
// with their hierarchical path. Used by multiple views that
// need a topic selector dropdown.
//
// Extracted from duplicated logic in:
//   - KnowledgeMapView.tsx
//   - ProfessorKnowledgeMapPage.tsx
// ============================================================

import { useMemo } from 'react';
import { useContentTree } from '@/app/context/ContentTreeContext';

export interface FlatTopic {
  id: string;
  name: string;
  /** Full path: Course > Semester > Section > Topic */
  path: string;
  courseName: string;
}

/**
 * Returns a flat list of all topics from the content tree.
 * Each topic includes its hierarchical path for display in selectors.
 */
export function useFlatTopics(): FlatTopic[] {
  const { tree } = useContentTree();

  return useMemo(() => {
    if (!tree?.courses) return [];
    const result: FlatTopic[] = [];
    for (const course of tree.courses) {
      for (const semester of course.semesters || []) {
        for (const section of semester.sections || []) {
          for (const topic of section.topics || []) {
            result.push({
              id: topic.id,
              name: topic.name || 'Sin titulo',
              path: `${course.name} > ${semester.name} > ${section.name} > ${topic.name}`,
              courseName: course.name,
            });
          }
        }
      }
    }
    return result;
  }, [tree]);
}
