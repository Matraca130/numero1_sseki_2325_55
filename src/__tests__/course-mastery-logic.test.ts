// ============================================================
// Pure Logic Tests — Course Mastery BKT Mapping
//
// PURPOSE: Validate the BKT→course mastery mapping logic
// that useCourseMastery uses internally. Since the hook
// wraps useMemo, we test the pure algorithm directly.
//
// The algorithm:
//   1. Traverse ContentTree: Course > Semester > Section > Topic
//   2. Build topicId → courseId mapping
//   3. Aggregate BKT p_know per course
//   4. Return Map<courseId, { mastery, topicsTotal, topicsWithBkt }>
//
// APPROACH: Recreate the pure functions (they aren't exported)
// and test with synthetic ContentTree + BKT data.
//
// RUN: pnpm test
// ============================================================

import { describe, it, expect } from 'vitest';

// ── Minimal type definitions (mirrors contentTreeApi + platformApi) ──

interface TreeTopic { id: string; name: string; order_index?: number; }
interface TreeSection { id: string; name: string; topics: TreeTopic[]; order_index?: number; }
interface TreeSemester { id: string; name: string; sections: TreeSection[]; order_index?: number; }
interface TreeCourse { id: string; name: string; semesters: TreeSemester[]; }
interface ContentTree { courses: TreeCourse[]; }
interface BktState { subtopic_id: string; p_know: number; }

// ── Recreated pure functions (from useCourseMastery.ts) ──────

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

interface CourseMasteryInfo {
  courseName: string;
  mastery: number;
  topicsTotal: number;
  topicsWithBkt: number;
}

function computeCourseMastery(
  tree: ContentTree | null,
  bktStates: BktState[],
): Map<string, CourseMasteryInfo> {
  const result = new Map<string, CourseMasteryInfo>();
  if (!tree || tree.courses.length === 0) return result;

  const topicToCourse = buildTopicToCourseMap(tree);
  const topicsPerCourse = countTopicsPerCourse(tree);

  const courseAgg = new Map<string, { sum: number; count: number; name: string }>();

  for (const bkt of bktStates) {
    const mapping = topicToCourse.get(bkt.subtopic_id);
    if (!mapping) continue;
    const { courseId, courseName } = mapping;
    const prev = courseAgg.get(courseId) ?? { sum: 0, count: 0, name: courseName };
    courseAgg.set(courseId, {
      sum: prev.sum + (bkt.p_know ?? 0),
      count: prev.count + 1,
      name: courseName,
    });
  }

  for (const [courseId, agg] of courseAgg) {
    const totalTopics = topicsPerCourse.get(courseId) ?? 0;
    result.set(courseId, {
      courseName: agg.name,
      mastery: agg.count > 0 ? Math.round((agg.sum / agg.count) * 100) : 0,
      topicsTotal: totalTopics,
      topicsWithBkt: agg.count,
    });
  }

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
}

// ── Test Fixtures ──────────────────────────────────────────

function makeTopic(id: string, name: string): TreeTopic {
  return { id, name };
}

function makeTree(courses: TreeCourse[]): ContentTree {
  return { courses };
}

const ANATOMY_TREE: ContentTree = makeTree([
  {
    id: 'course-anat',
    name: 'Anatomia',
    semesters: [{
      id: 'sem-1',
      name: 'Semestre 1',
      sections: [{
        id: 'sec-cardio',
        name: 'Cardiovascular',
        topics: [
          makeTopic('topic-heart', 'Corazon'),
          makeTopic('topic-vessels', 'Vasos'),
          makeTopic('topic-circulation', 'Circulacion'),
        ],
      }],
    }],
  },
  {
    id: 'course-histo',
    name: 'Histologia',
    semesters: [{
      id: 'sem-1-h',
      name: 'Semestre 1',
      sections: [{
        id: 'sec-cells',
        name: 'Celulas',
        topics: [
          makeTopic('topic-epithelial', 'Epitelial'),
          makeTopic('topic-connective', 'Conectivo'),
        ],
      }],
    }],
  },
]);

// ══════════════════════════════════════════════════════════════
// SUITE 1: buildTopicToCourseMap
// ══════════════════════════════════════════════════════════════

describe('buildTopicToCourseMap', () => {
  it('maps each topic to its parent course', () => {
    const map = buildTopicToCourseMap(ANATOMY_TREE);
    expect(map.get('topic-heart')).toEqual({ courseId: 'course-anat', courseName: 'Anatomia' });
    expect(map.get('topic-vessels')).toEqual({ courseId: 'course-anat', courseName: 'Anatomia' });
    expect(map.get('topic-epithelial')).toEqual({ courseId: 'course-histo', courseName: 'Histologia' });
  });

  it('returns empty map for empty tree', () => {
    const map = buildTopicToCourseMap(makeTree([]));
    expect(map.size).toBe(0);
  });

  it('handles course with no topics', () => {
    const tree = makeTree([{
      id: 'empty', name: 'Empty Course',
      semesters: [{ id: 's', name: 'S1', sections: [{ id: 'sec', name: 'Sec', topics: [] }] }],
    }]);
    const map = buildTopicToCourseMap(tree);
    expect(map.size).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: countTopicsPerCourse
// ══════════════════════════════════════════════════════════════

describe('countTopicsPerCourse', () => {
  it('counts topics correctly for multi-course tree', () => {
    const map = countTopicsPerCourse(ANATOMY_TREE);
    expect(map.get('course-anat')).toBe(3);
    expect(map.get('course-histo')).toBe(2);
  });

  it('returns 0 for course with no topics', () => {
    const tree = makeTree([{
      id: 'empty', name: 'Empty',
      semesters: [{ id: 's', name: 'S', sections: [] }],
    }]);
    const map = countTopicsPerCourse(tree);
    expect(map.get('empty')).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 3: computeCourseMastery (full algorithm)
// ══════════════════════════════════════════════════════════════

describe('computeCourseMastery', () => {
  it('returns empty map for null tree', () => {
    const result = computeCourseMastery(null, []);
    expect(result.size).toBe(0);
  });

  it('returns empty map for empty courses', () => {
    const result = computeCourseMastery(makeTree([]), []);
    expect(result.size).toBe(0);
  });

  it('returns 0 mastery for courses with no BKT data', () => {
    const result = computeCourseMastery(ANATOMY_TREE, []);
    expect(result.size).toBe(2);
    expect(result.get('course-anat')?.mastery).toBe(0);
    expect(result.get('course-anat')?.topicsWithBkt).toBe(0);
    expect(result.get('course-anat')?.topicsTotal).toBe(3);
    expect(result.get('course-histo')?.mastery).toBe(0);
  });

  it('computes correct mastery from BKT states', () => {
    const bkt: BktState[] = [
      { subtopic_id: 'topic-heart', p_know: 0.8 },
      { subtopic_id: 'topic-vessels', p_know: 0.6 },
    ];
    const result = computeCourseMastery(ANATOMY_TREE, bkt);
    const anat = result.get('course-anat')!;
    // avg p_know = (0.8 + 0.6) / 2 = 0.7 -> 70%
    expect(anat.mastery).toBe(70);
    expect(anat.topicsWithBkt).toBe(2);
    expect(anat.topicsTotal).toBe(3);
  });

  it('ignores orphaned BKT states (subtopic not in tree)', () => {
    const bkt: BktState[] = [
      { subtopic_id: 'topic-heart', p_know: 0.9 },
      { subtopic_id: 'topic-orphan-xyz', p_know: 1.0 },
    ];
    const result = computeCourseMastery(ANATOMY_TREE, bkt);
    const anat = result.get('course-anat')!;
    expect(anat.mastery).toBe(90);
    expect(anat.topicsWithBkt).toBe(1);
  });

  it('handles multiple courses independently', () => {
    const bkt: BktState[] = [
      { subtopic_id: 'topic-heart', p_know: 0.5 },
      { subtopic_id: 'topic-epithelial', p_know: 1.0 },
    ];
    const result = computeCourseMastery(ANATOMY_TREE, bkt);
    expect(result.get('course-anat')!.mastery).toBe(50);
    expect(result.get('course-histo')!.mastery).toBe(100);
  });

  it('handles p_know of 0 correctly', () => {
    const bkt: BktState[] = [
      { subtopic_id: 'topic-heart', p_know: 0 },
    ];
    const result = computeCourseMastery(ANATOMY_TREE, bkt);
    expect(result.get('course-anat')!.mastery).toBe(0);
    expect(result.get('course-anat')!.topicsWithBkt).toBe(1);
  });

  it('handles p_know of 1.0 (perfect mastery)', () => {
    const bkt: BktState[] = [
      { subtopic_id: 'topic-heart', p_know: 1.0 },
      { subtopic_id: 'topic-vessels', p_know: 1.0 },
      { subtopic_id: 'topic-circulation', p_know: 1.0 },
    ];
    const result = computeCourseMastery(ANATOMY_TREE, bkt);
    expect(result.get('course-anat')!.mastery).toBe(100);
    expect(result.get('course-anat')!.topicsWithBkt).toBe(3);
  });

  it('rounds mastery to nearest integer', () => {
    const bkt: BktState[] = [
      { subtopic_id: 'topic-heart', p_know: 0.333 },
    ];
    const result = computeCourseMastery(ANATOMY_TREE, bkt);
    expect(result.get('course-anat')!.mastery).toBe(33);
  });
});
