/**
 * Pure helper functions for useStudyPlans.
 * Content tree lookup and topic color assignment.
 */

import type { TopicLookup } from './types';

// PERF-12: Module-level constant (no re-creation per call)
export const TOPIC_COLORS = [
  'bg-teal-500', 'bg-blue-500', 'bg-purple-500',
  'bg-amber-500', 'bg-pink-500', 'bg-emerald-500',
] as const;

export function buildTopicMap(tree: any): Map<string, TopicLookup> {
  const map = new Map<string, TopicLookup>();
  if (!tree?.courses) return map;

  tree.courses.forEach((course: any, ci: number) => {
    const color = TOPIC_COLORS[ci % TOPIC_COLORS.length];
    course.semesters?.forEach((sem: any) => {
      sem.sections?.forEach((sec: any) => {
        sec.topics?.forEach((topic: any) => {
          map.set(topic.id, {
            topicTitle: topic.name || topic.title || topic.id,
            sectionTitle: sec.name || sec.title || sec.id,
            courseName: course.name || course.title || course.id,
            courseId: course.id,
            courseColor: color,
          });
        });
      });
    });
  });

  return map;
}
