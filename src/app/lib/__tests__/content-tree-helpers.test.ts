// ============================================================
// Axon -- Tests for content-tree-helpers.ts
//
// Pure function: resolveBreadcrumb (tree, topicId) -> breadcrumb names
// ============================================================

import { describe, it, expect } from 'vitest';

import { resolveBreadcrumb } from '@/app/lib/content-tree-helpers';

// ── Fixture builder ───────────────────────────────────────

function makeTree() {
  return {
    courses: [
      {
        id: 'c1',
        name: 'Math 101',
        semesters: [
          {
            id: 's1',
            name: 'Fall 2025',
            sections: [
              {
                id: 'sec1',
                name: 'Algebra',
                topics: [
                  { id: 't1', name: 'Linear Equations' },
                  { id: 't2', name: 'Quadratic Equations' },
                ],
              },
              {
                id: 'sec2',
                name: 'Geometry',
                topics: [{ id: 't3', name: 'Triangles' }],
              },
            ],
          },
        ],
      },
      {
        id: 'c2',
        name: 'Physics 101',
        semesters: [
          {
            id: 's2',
            name: 'Spring 2026',
            sections: [
              {
                id: 'sec3',
                name: 'Mechanics',
                topics: [{ id: 't4', name: 'Newton Laws' }],
              },
            ],
          },
        ],
      },
    ],
  };
}

// ================================================================
// resolveBreadcrumb
// ================================================================

describe('resolveBreadcrumb', () => {
  it('returns full breadcrumb for a topic in the first course', () => {
    const result = resolveBreadcrumb(makeTree(), 't1');
    expect(result).toEqual({
      courseName: 'Math 101',
      semesterName: 'Fall 2025',
      sectionName: 'Algebra',
      topicName: 'Linear Equations',
    });
  });

  it('returns full breadcrumb for a topic in the second course', () => {
    const result = resolveBreadcrumb(makeTree(), 't4');
    expect(result).toEqual({
      courseName: 'Physics 101',
      semesterName: 'Spring 2026',
      sectionName: 'Mechanics',
      topicName: 'Newton Laws',
    });
  });

  it('returns full breadcrumb for a topic in a different section', () => {
    const result = resolveBreadcrumb(makeTree(), 't3');
    expect(result.sectionName).toBe('Geometry');
    expect(result.topicName).toBe('Triangles');
  });

  it('returns empty object when topic is not found', () => {
    expect(resolveBreadcrumb(makeTree(), 'unknown-id')).toEqual({});
  });

  it('returns empty object when tree is null', () => {
    expect(resolveBreadcrumb(null, 't1')).toEqual({});
  });

  it('returns empty object when tree is undefined', () => {
    expect(resolveBreadcrumb(undefined, 't1')).toEqual({});
  });

  it('returns empty object when topicId is empty string', () => {
    expect(resolveBreadcrumb(makeTree(), '')).toEqual({});
  });

  it('accepts a direct array of courses', () => {
    const courses = makeTree().courses;
    const result = resolveBreadcrumb(courses, 't2');
    expect(result.topicName).toBe('Quadratic Equations');
  });

  it('handles tree with courses but no semesters', () => {
    const tree = { courses: [{ id: 'c1', name: 'Empty' }] };
    expect(resolveBreadcrumb(tree, 't1')).toEqual({});
  });

  it('handles semesters with missing sections', () => {
    const tree = {
      courses: [
        {
          id: 'c1',
          name: 'C',
          semesters: [{ id: 's1', name: 'S' }],
        },
      ],
    };
    expect(resolveBreadcrumb(tree, 't1')).toEqual({});
  });

  it('handles sections with missing topics', () => {
    const tree = {
      courses: [
        {
          id: 'c1',
          name: 'C',
          semesters: [
            {
              id: 's1',
              name: 'S',
              sections: [{ id: 'sec1', name: 'Sec' }],
            },
          ],
        },
      ],
    };
    expect(resolveBreadcrumb(tree, 't1')).toEqual({});
  });

  it('returns empty for empty courses array', () => {
    expect(resolveBreadcrumb({ courses: [] }, 't1')).toEqual({});
  });

  it('returns empty for {} tree without courses key', () => {
    expect(resolveBreadcrumb({}, 't1')).toEqual({});
  });
});
