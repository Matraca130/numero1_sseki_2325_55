// ============================================================
// Hook Tests -- useCourseMastery
//
// Tests the useCourseMastery hook using renderHook from
// @testing-library/react. Validates BKT-to-course mastery
// aggregation through the actual React hook (with useMemo).
//
// Fixtures use the ContentTree structure:
//   Course > Semester > Section > Topic
//
// RUN: npx vitest run src/app/hooks/__tests__/useCourseMastery.test.ts
// ============================================================

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCourseMastery } from '@/app/hooks/useCourseMastery';
import type { ContentTree, TreeCourse } from '@/app/services/contentTreeApi';
import type { BktStateRecord } from '@/app/services/platformApi';

// ── Fixture Helpers ──────────────────────────────────────────

function makeBkt(subtopic_id: string, p_know: number): BktStateRecord {
  return {
    subtopic_id,
    p_know,
    p_transit: 0.1,
    p_slip: 0.1,
    p_guess: 0.25,
    delta: 0,
    total_attempts: 1,
    correct_attempts: 1,
  };
}

function makeTree(courses: TreeCourse[]): ContentTree {
  return { courses };
}

/**
 * Builds a minimal course with the given topics spread across
 * one semester and one section.
 */
function makeCourse(
  id: string,
  name: string,
  topicIds: string[],
): TreeCourse {
  return {
    id,
    name,
    semesters: [
      {
        id: `sem-${id}`,
        name: 'Semestre 1',
        sections: [
          {
            id: `sec-${id}`,
            name: 'Section 1',
            topics: topicIds.map((tid) => ({ id: tid, name: `Topic ${tid}` })),
          },
        ],
      },
    ],
  };
}

// ── Shared Fixtures ──────────────────────────────────────────

const SINGLE_COURSE_TREE: ContentTree = makeTree([
  makeCourse('course-anat', 'Anatomia', [
    'topic-heart',
    'topic-vessels',
    'topic-circulation',
  ]),
]);

const TWO_COURSE_TREE: ContentTree = makeTree([
  makeCourse('course-anat', 'Anatomia', [
    'topic-heart',
    'topic-vessels',
    'topic-circulation',
  ]),
  makeCourse('course-histo', 'Histologia', [
    'topic-epithelial',
    'topic-connective',
  ]),
]);

// ══════════════════════════════════════════════════════════════
// SUITE 1: null / undefined tree
// ══════════════════════════════════════════════════════════════

describe('useCourseMastery', () => {
  describe('when tree is null or undefined', () => {
    it('returns an empty Map when tree is null', () => {
      const { result } = renderHook(() => useCourseMastery(null, []));
      expect(result.current).toBeInstanceOf(Map);
      expect(result.current.size).toBe(0);
    });

    it('returns an empty Map when tree is null even with BKT data', () => {
      const bkt = [makeBkt('topic-heart', 0.8)];
      const { result } = renderHook(() => useCourseMastery(null, bkt));
      expect(result.current.size).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SUITE 2: tree with 0 courses
  // ══════════════════════════════════════════════════════════════

  describe('when tree has 0 courses', () => {
    it('returns an empty Map', () => {
      const emptyTree = makeTree([]);
      const { result } = renderHook(() => useCourseMastery(emptyTree, []));
      expect(result.current.size).toBe(0);
    });

    it('returns an empty Map even with BKT data present', () => {
      const emptyTree = makeTree([]);
      const bkt = [makeBkt('topic-heart', 0.9)];
      const { result } = renderHook(() => useCourseMastery(emptyTree, bkt));
      expect(result.current.size).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SUITE 3: 1 course, partial BKT data
  // ══════════════════════════════════════════════════════════════

  describe('when 1 course has 3 topics, 2 with BKT data', () => {
    it('computes mastery as avg(p_know) * 100 rounded, topicsWithBkt=2, topicsTotal=3', () => {
      const bkt = [
        makeBkt('topic-heart', 0.8),
        makeBkt('topic-vessels', 0.6),
      ];
      const { result } = renderHook(() =>
        useCourseMastery(SINGLE_COURSE_TREE, bkt),
      );

      const info = result.current.get('course-anat');
      expect(info).toBeDefined();
      // avg p_know = (0.8 + 0.6) / 2 = 0.7 -> 70
      expect(info!.mastery).toBe(70);
      expect(info!.topicsWithBkt).toBe(2);
      expect(info!.topicsTotal).toBe(3);
      expect(info!.courseName).toBe('Anatomia');
    });

    it('rounds mastery to nearest integer', () => {
      const bkt = [
        makeBkt('topic-heart', 0.333),
        makeBkt('topic-vessels', 0.667),
      ];
      const { result } = renderHook(() =>
        useCourseMastery(SINGLE_COURSE_TREE, bkt),
      );
      const info = result.current.get('course-anat')!;
      // avg = (0.333 + 0.667) / 2 = 0.5 -> 50
      expect(info.mastery).toBe(50);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SUITE 4: 2 courses, BKT only in one
  // ══════════════════════════════════════════════════════════════

  describe('when 2 courses exist but BKT only in one', () => {
    it('course with BKT has computed mastery; course without has mastery=0', () => {
      const bkt = [
        makeBkt('topic-heart', 0.9),
        makeBkt('topic-vessels', 0.7),
      ];
      const { result } = renderHook(() =>
        useCourseMastery(TWO_COURSE_TREE, bkt),
      );

      // Anatomia: avg = (0.9 + 0.7) / 2 = 0.8 -> 80
      const anat = result.current.get('course-anat')!;
      expect(anat.mastery).toBe(80);
      expect(anat.topicsWithBkt).toBe(2);
      expect(anat.topicsTotal).toBe(3);

      // Histologia: no BKT data
      const histo = result.current.get('course-histo')!;
      expect(histo.mastery).toBe(0);
      expect(histo.topicsWithBkt).toBe(0);
      expect(histo.topicsTotal).toBe(2);
      expect(histo.courseName).toBe('Histologia');
    });

    it('both courses appear in the Map (size = 2)', () => {
      const { result } = renderHook(() =>
        useCourseMastery(TWO_COURSE_TREE, []),
      );
      expect(result.current.size).toBe(2);
      expect(result.current.has('course-anat')).toBe(true);
      expect(result.current.has('course-histo')).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SUITE 5: orphaned BKT subtopic_id (not in tree)
  // ══════════════════════════════════════════════════════════════

  describe('when BKT has orphaned subtopic_id not in tree', () => {
    it('ignores the orphaned BKT record and only counts valid ones', () => {
      const bkt = [
        makeBkt('topic-heart', 0.9),
        makeBkt('topic-orphan-xyz', 1.0), // not in tree
      ];
      const { result } = renderHook(() =>
        useCourseMastery(SINGLE_COURSE_TREE, bkt),
      );

      const info = result.current.get('course-anat')!;
      // Only topic-heart counted: 0.9 -> 90
      expect(info.mastery).toBe(90);
      expect(info.topicsWithBkt).toBe(1);
      expect(info.topicsTotal).toBe(3);
    });

    it('returns 0 mastery for course when all BKT records are orphaned', () => {
      const bkt = [
        makeBkt('topic-orphan-1', 0.5),
        makeBkt('topic-orphan-2', 0.8),
      ];
      const { result } = renderHook(() =>
        useCourseMastery(SINGLE_COURSE_TREE, bkt),
      );

      const info = result.current.get('course-anat')!;
      expect(info.mastery).toBe(0);
      expect(info.topicsWithBkt).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SUITE 6: Map keys correctness
  // ══════════════════════════════════════════════════════════════

  describe('Map keys are course IDs', () => {
    it('keys match the course IDs from the tree', () => {
      const bkt = [makeBkt('topic-heart', 0.5)];
      const { result } = renderHook(() =>
        useCourseMastery(TWO_COURSE_TREE, bkt),
      );

      const keys = Array.from(result.current.keys()).sort();
      expect(keys).toEqual(['course-anat', 'course-histo']);
    });

    it('does not create keys for courses not in the tree', () => {
      const bkt = [
        makeBkt('topic-heart', 0.5),
        makeBkt('topic-from-deleted-course', 0.9),
      ];
      const { result } = renderHook(() =>
        useCourseMastery(SINGLE_COURSE_TREE, bkt),
      );

      const keys = Array.from(result.current.keys());
      expect(keys).toEqual(['course-anat']);
    });

    it('includes all courses even those without BKT data', () => {
      const { result } = renderHook(() =>
        useCourseMastery(TWO_COURSE_TREE, []),
      );

      expect(result.current.size).toBe(2);
      expect(result.current.has('course-anat')).toBe(true);
      expect(result.current.has('course-histo')).toBe(true);
    });
  });
});
