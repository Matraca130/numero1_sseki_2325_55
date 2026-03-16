// ============================================================
// TEST: content-tree-helpers.ts — resolveBreadcrumb
//
// Used by: SummaryView, StudentSummariesView, StudyHubView
//
// Tests navigation through the content tree hierarchy:
//   courses → semesters → sections → topics
//
// All pure, zero mocks.
// ============================================================

import { describe, it, expect } from 'vitest';
import { resolveBreadcrumb } from '../content-tree-helpers';
import type { BreadcrumbResult } from '../content-tree-helpers';

// ── Test fixtures ─────────────────────────────────────────

function makeTree() {
  return {
    courses: [
      {
        name: 'Anatomía',
        semesters: [
          {
            name: 'Semestre 1',
            sections: [
              {
                name: 'Extremidades',
                topics: [
                  { id: 'topic-1', name: 'Húmero' },
                  { id: 'topic-2', name: 'Fémur' },
                ],
              },
              {
                name: 'Tronco',
                topics: [
                  { id: 'topic-3', name: 'Vértebras' },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'Fisiología',
        semesters: [
          {
            name: 'Semestre 2',
            sections: [
              {
                name: 'Sistema Nervioso',
                topics: [
                  { id: 'topic-4', name: 'Sinapsis' },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

// ── Full tree resolution ──────────────────────────────────

describe('resolveBreadcrumb — full tree', () => {
  it('finds topic and returns complete breadcrumb', () => {
    const result = resolveBreadcrumb(makeTree(), 'topic-1');
    expect(result).toEqual({
      courseName: 'Anatomía',
      semesterName: 'Semestre 1',
      sectionName: 'Extremidades',
      topicName: 'Húmero',
    } satisfies BreadcrumbResult);
  });

  it('finds topic in second course', () => {
    const result = resolveBreadcrumb(makeTree(), 'topic-4');
    expect(result).toEqual({
      courseName: 'Fisiología',
      semesterName: 'Semestre 2',
      sectionName: 'Sistema Nervioso',
      topicName: 'Sinapsis',
    });
  });

  it('finds topic in second section', () => {
    const result = resolveBreadcrumb(makeTree(), 'topic-3');
    expect(result.sectionName).toBe('Tronco');
    expect(result.topicName).toBe('Vértebras');
  });
});

// ── Edge cases ────────────────────────────────────────────

describe('resolveBreadcrumb — edge cases', () => {
  it('null tree → empty object', () => {
    expect(resolveBreadcrumb(null, 'topic-1')).toEqual({});
  });

  it('undefined tree → empty object', () => {
    expect(resolveBreadcrumb(undefined, 'topic-1')).toEqual({});
  });

  it('empty topicId → empty object', () => {
    expect(resolveBreadcrumb(makeTree(), '')).toEqual({});
  });

  it('non-existent topicId → empty object', () => {
    expect(resolveBreadcrumb(makeTree(), 'topic-999')).toEqual({});
  });

  it('array input (no {courses:} wrapper) → still works', () => {
    const courses = makeTree().courses;
    const result = resolveBreadcrumb(courses, 'topic-2');
    expect(result.courseName).toBe('Anatomía');
    expect(result.topicName).toBe('Fémur');
  });

  it('tree with empty semesters/sections → returns empty, no crash', () => {
    const sparseTree = {
      courses: [
        { name: 'Empty', semesters: [] },
        { name: 'NoSemesters' },
      ],
    };
    expect(resolveBreadcrumb(sparseTree, 'topic-1')).toEqual({});
  });
});
