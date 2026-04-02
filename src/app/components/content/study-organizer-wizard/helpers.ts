/**
 * Helper functions for StudyOrganizerWizard.
 * Mastery lookups, subject lookups, section toggling.
 */

import type { TopicMasteryInfo } from '@/app/hooks/useTopicMastery';

export function getCourseMasteryPercent(courseId: string, courseMastery: Map<string, number>): number {
  return courseMastery.get(courseId) ?? 0;
}

export function getCourseStudiedTopics(courseId: string, courses: any[], topicMastery: Map<string, TopicMasteryInfo>): number {
  let count = 0;
  const course = courses.find((c: any) => c.id === courseId);
  if (!course) return 0;
  for (const sem of course.semesters) {
    for (const sec of sem.sections) {
      for (const topic of sec.topics) {
        const m = topicMastery.get(topic.id);
        if (m && m.totalAttempts > 0) count++;
      }
    }
  }
  return count;
}

export function getSubjectColor(id: string, courses: any[]): string {
  const c = courses.find((c: any) => c.id === id);
  return c?.color || 'bg-gray-500';
}

export function getSubjectName(id: string, courses: any[]): string {
  const c = courses.find((c: any) => c.id === id);
  return c?.name || id;
}
