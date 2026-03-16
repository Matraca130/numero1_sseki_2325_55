// ============================================================
// Axon — useCourseMastery Hook
//
// Maps BKT states (per subtopic_id) to courses using the content
// tree hierarchy: Course > Semester > Section > Topic(=subtopic).
//
// Returns a Map<courseId, { mastery, topicsTotal, topicsWithBkt }>.
// ============================================================

import { useMemo } from 'react';
import type { ContentTree } from '@/app/services/contentTreeApi';
import type { BktStateRecord } from '@/app/services/platformApi';

export interface CourseMasteryInfo {
  courseName: string;
  /** Average p_know * 100 across all BKT-tracked topics in this course */
  mastery: number;
  /** Total topics in the content tree for this course */
  topicsTotal: number;
  /** Topics that have at least one BKT state (student has studied them) */
  topicsWithBkt: number;
}

/**
 * Builds a map from topic (subtopic) ID → course ID by traversing the tree.
 */
function buildTopicToCourseMap(tree: ContentTree): Map<string, { courseId: string; courseName: string }> {
  const map = new Map<string, { courseId: string; courseName: string }>();
  for (const course of tree.courses) {
    for (const sem of course.semesters) {
      for (const sec of sem.sections) {
        for (const topic of sec.topics) {
          map.set(topic.id, { courseId: course.id, courseName: course.name });
        }
      }
    }
  }
  return map;
}

/**
 * Counts total topics per course.
 */
function countTopicsPerCourse(tree: ContentTree): Map<string, number> {
  const map = new Map<string, number>();
  for (const course of tree.courses) {
    let count = 0;
    for (const sem of course.semesters) {
      for (const sec of sem.sections) {
        count += sec.topics.length;
      }
    }
    map.set(course.id, count);
  }
  return map;
}

export function useCourseMastery(
  tree: ContentTree | null,
  bktStates: BktStateRecord[],
): Map<string, CourseMasteryInfo> {
  return useMemo(() => {
    const result = new Map<string, CourseMasteryInfo>();
    if (!tree || tree.courses.length === 0) return result;

    const topicToCourse = buildTopicToCourseMap(tree);
    const topicsPerCourse = countTopicsPerCourse(tree);

    // Aggregate BKT p_know per course
    const courseAgg = new Map<string, { sum: number; count: number; name: string }>();

    for (const bkt of bktStates) {
      const mapping = topicToCourse.get(bkt.subtopic_id);
      if (!mapping) continue; // BKT state for a topic not in current tree (orphaned)

      const { courseId, courseName } = mapping;
      const prev = courseAgg.get(courseId) ?? { sum: 0, count: 0, name: courseName };
      courseAgg.set(courseId, {
        sum: prev.sum + (bkt.p_know ?? 0),
        count: prev.count + 1,
        name: courseName,
      });
    }

    // Build final map
    for (const [courseId, agg] of courseAgg) {
      const totalTopics = topicsPerCourse.get(courseId) ?? 0;
      result.set(courseId, {
        courseName: agg.name,
        mastery: agg.count > 0 ? Math.round((agg.sum / agg.count) * 100) : 0,
        topicsTotal: totalTopics,
        topicsWithBkt: agg.count,
      });
    }

    // Also set entries for courses with 0 BKT activity
    for (const course of tree.courses) {
      if (!result.has(course.id)) {
        result.set(course.id, {
          courseName: course.name,
          mastery: 0,
          topicsTotal: topicsPerCourse.get(course.id) ?? 0,
          topicsWithBkt: 0,
        });
      }
    }

    return result;
  }, [tree, bktStates]);
}
