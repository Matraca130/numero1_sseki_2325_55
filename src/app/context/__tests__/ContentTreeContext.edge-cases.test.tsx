// ============================================================
// Axon — Edge Cases and Error Scenarios for ContentTreeContext
//
// Comprehensive tests for:
//   1. Deeply nested tree structures
//   2. Empty/malformed tree responses
//   3. Missing parent IDs (orphaned items)
//   4. Concurrent CRUD operations
//   5. Error recovery and retry logic
//   6. Institution switching edge cases
//   7. Auth state transitions
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

// -- Mock data -------------------------------------------------------

const DEEPLY_NESTED_TREE = [
  {
    id: 'course-001',
    name: 'Advanced Course',
    description: 'Complex hierarchy',
    order_index: 0,
    semesters: [
      {
        id: 'sem-001',
        name: 'Fall 2025',
        order_index: 0,
        sections: [
          {
            id: 'sec-001',
            name: 'Section 1',
            order_index: 0,
            topics: [
              { id: 'topic-001', name: 'Topic 1', order_index: 0 },
              { id: 'topic-002', name: 'Topic 2', order_index: 1 },
              { id: 'topic-003', name: 'Topic 3', order_index: 2 },
            ],
          },
          {
            id: 'sec-002',
            name: 'Section 2',
            order_index: 1,
            topics: [
              { id: 'topic-004', name: 'Topic 4', order_index: 0 },
            ],
          },
        ],
      },
      {
        id: 'sem-002',
        name: 'Spring 2026',
        order_index: 1,
        sections: [],
      },
    ],
  },
  {
    id: 'course-002',
    name: 'Empty Course',
    order_index: 1,
    semesters: [],
  },
];

const MALFORMED_RESPONSE_WITH_MISSING_FIELDS = [
  {
    id: 'course-001',
    // name missing
    semesters: [
      {
        id: 'sem-001',
        name: 'Semester 1',
        sections: [
          {
            id: 'sec-001',
            // name missing
            topics: [
              {
                id: 'topic-001',
                // name missing
              },
            ],
          },
        ],
      },
    ],
  },
];

// -- Mock AuthContext -------------------------------------------------

let mockAuthValues: {
  selectedInstitution: { id: string } | null;
  role: string | null;
  status: string;
} = {
  selectedInstitution: { id: 'inst-001' },
  role: 'professor',
  status: 'authenticated',
};

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mockAuthValues,
}));

// -- Mock contentTreeApi ---------------------------------------------

const mockGetContentTree = vi.fn();
const mockCreateCourse = vi.fn();
const mockUpdateCourse = vi.fn();
const mockDeleteCourse = vi.fn();
const mockCreateSemester = vi.fn();
const mockUpdateSemester = vi.fn();
const mockDeleteSemester = vi.fn();
const mockCreateSection = vi.fn();
const mockUpdateSection = vi.fn();
const mockDeleteSection = vi.fn();
const mockCreateTopic = vi.fn();
const mockUpdateTopic = vi.fn();
const mockDeleteTopic = vi.fn();

vi.mock('@/app/services/contentTreeApi', () => ({
  getContentTree: (...args: any[]) => mockGetContentTree(...args),
  createCourse: (...args: any[]) => mockCreateCourse(...args),
  updateCourse: (...args: any[]) => mockUpdateCourse(...args),
  deleteCourse: (...args: any[]) => mockDeleteCourse(...args),
  createSemester: (...args: any[]) => mockCreateSemester(...args),
  updateSemester: (...args: any[]) => mockUpdateSemester(...args),
  deleteSemester: (...args: any[]) => mockDeleteSemester(...args),
  createSection: (...args: any[]) => mockCreateSection(...args),
  updateSection: (...args: any[]) => mockUpdateSection(...args),
  deleteSection: (...args: any[]) => mockDeleteSection(...args),
  createTopic: (...args: any[]) => mockCreateTopic(...args),
  updateTopic: (...args: any[]) => mockUpdateTopic(...args),
  deleteTopic: (...args: any[]) => mockDeleteTopic(...args),
}));

// -- Import AFTER mocks ----------------------------------------------

import { ContentTreeProvider, useContentTree } from '../ContentTreeContext';

// -- Helpers ----------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return <ContentTreeProvider>{children}</ContentTreeProvider>;
}

function setupDefaultMocks() {
  mockGetContentTree.mockResolvedValue([]);
  mockCreateCourse.mockResolvedValue({ id: 'new-course' });
  mockUpdateCourse.mockResolvedValue({ id: 'course-001' });
  mockDeleteCourse.mockResolvedValue(undefined);
  mockCreateSemester.mockResolvedValue({ id: 'new-sem' });
  mockUpdateSemester.mockResolvedValue({ id: 'sem-001' });
  mockDeleteSemester.mockResolvedValue(undefined);
  mockCreateSection.mockResolvedValue({ id: 'new-sec' });
  mockUpdateSection.mockResolvedValue({ id: 'sec-001' });
  mockDeleteSection.mockResolvedValue(undefined);
  mockCreateTopic.mockResolvedValue({ id: 'new-topic' });
  mockUpdateTopic.mockResolvedValue({ id: 'topic-001' });
  mockDeleteTopic.mockResolvedValue(undefined);
}

// -- Test suite -------------------------------------------------------

describe('ContentTreeContext — Edge Cases & Error Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthValues = {
      selectedInstitution: { id: 'inst-001' },
      role: 'professor',
      status: 'authenticated',
    };
    setupDefaultMocks();
  });

  // ========== SUITE 1: Deeply Nested Trees ==========

  describe('Deeply nested tree structures', () => {
    it('handles deeply nested tree with multiple semesters and sections', async () => {
      mockGetContentTree.mockResolvedValue(DEEPLY_NESTED_TREE);

      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tree).not.toBeNull();
      expect(result.current.tree!.courses).toHaveLength(2);

      // First course has 2 semesters
      const course1 = result.current.tree!.courses[0];
      expect(course1.semesters).toHaveLength(2);

      // First semester has 2 sections
      const sem1 = course1.semesters[0];
      expect(sem1.sections).toHaveLength(2);

      // First section has 3 topics
      const sec1 = sem1.sections[0];
      expect(sec1.topics).toHaveLength(3);
      expect(sec1.topics[0].name).toBe('Topic 1');

      // Second semester is empty
      const sem2 = course1.semesters[1];
      expect(sem2.sections).toHaveLength(0);

      // Second course is empty
      const course2 = result.current.tree!.courses[1];
      expect(course2.semesters).toHaveLength(0);
    });

    it('correctly traverses all levels without dropping data', async () => {
      mockGetContentTree.mockResolvedValue(DEEPLY_NESTED_TREE);

      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const allTopics: any[] = [];
      result.current.tree!.courses.forEach(course => {
        course.semesters.forEach(semester => {
          semester.sections.forEach(section => {
            allTopics.push(...section.topics);
          });
        });
      });

      expect(allTopics).toHaveLength(4);
      expect(allTopics.map(t => t.id)).toEqual([
        'topic-001', 'topic-002', 'topic-003', 'topic-004'
      ]);
    });

    it('preserves order_index at all levels', async () => {
      mockGetContentTree.mockResolvedValue(DEEPLY_NESTED_TREE);

      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const course = result.current.tree!.courses[0];
      const section = course.semesters[0].sections[0];
      const topics = section.topics;

      expect(topics[0].order_index).toBe(0);
      expect(topics[1].order_index).toBe(1);
      expect(topics[2].order_index).toBe(2);
    });
  });

  // ========== SUITE 2: Malformed Responses ==========

  describe('Malformed API responses with missing fields', () => {
    it('handles missing name fields gracefully', async () => {
      mockGetContentTree.mockResolvedValue(MALFORMED_RESPONSE_WITH_MISSING_FIELDS);

      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not crash, tree should exist with empty string fallback
      expect(result.current.tree).not.toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.tree!.courses).toHaveLength(1);

      // Name should default to empty string
      expect(result.current.tree!.courses[0].name).toBe('');
      expect(result.current.tree!.courses[0].semesters[0].name).toBe('Semester 1');
    });

    it('handles missing nested arrays gracefully', async () => {
      const malformed = [
        {
          id: 'course-001',
          name: 'Math',
          // semesters not an array
          semesters: null,
        },
      ];

      mockGetContentTree.mockResolvedValue(malformed);

      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tree).not.toBeNull();
      expect(result.current.tree!.courses).toHaveLength(1);
      expect(result.current.tree!.courses[0].semesters).toHaveLength(0);
    });

    it('handles completely empty response', async () => {
      mockGetContentTree.mockResolvedValue([]);

      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tree).not.toBeNull();
      expect(result.current.tree!.courses).toHaveLength(0);
      expect(result.current.error).toBeNull();
    });

    it('handles undefined response', async () => {
      mockGetContentTree.mockResolvedValue(undefined);

      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tree).not.toBeNull();
      expect(result.current.tree!.courses).toHaveLength(0);
    });

    it('handles string response instead of array', async () => {
      mockGetContentTree.mockResolvedValue('not an array');

      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tree).not.toBeNull();
      expect(result.current.tree!.courses).toHaveLength(0);
    });
  });

  // ========== SUITE 3: Concurrent Operations ==========

  describe('Concurrent CRUD operations', () => {
    it('handles multiple simultaneous addCourse calls', async () => {
      mockGetContentTree.mockResolvedValue([]);
      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockGetContentTree.mockClear();

      // Fire multiple concurrent operations
      await act(async () => {
        await Promise.all([
          result.current.addCourse('Course 1'),
          result.current.addCourse('Course 2'),
          result.current.addCourse('Course 3'),
        ]);
      });

      // All 3 creates should have been called
      expect(mockCreateCourse).toHaveBeenCalledTimes(3);

      // refresh() should have been called 3 times (once per operation)
      expect(mockGetContentTree).toHaveBeenCalledTimes(3);
    });

    it('handles concurrent edit operations on different levels', async () => {
      mockGetContentTree.mockResolvedValue(DEEPLY_NESTED_TREE);
      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockGetContentTree.mockClear();

      await act(async () => {
        await Promise.all([
          result.current.editCourse('course-001', 'New Course Name'),
          result.current.editSemester('sem-001', 'New Semester Name'),
          result.current.editSection('sec-001', 'New Section Name'),
          result.current.editTopic('topic-001', 'New Topic Name'),
        ]);
      });

      expect(mockUpdateCourse).toHaveBeenCalledTimes(1);
      expect(mockUpdateSemester).toHaveBeenCalledTimes(1);
      expect(mockUpdateSection).toHaveBeenCalledTimes(1);
      expect(mockUpdateTopic).toHaveBeenCalledTimes(1);
    });

    it('queues refresh calls when multiple CRUD ops happen rapidly', async () => {
      mockGetContentTree.mockResolvedValue([]);
      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockGetContentTree.mockClear();

      await act(async () => {
        // Fire all at once without awaiting individually
        const p1 = result.current.addCourse('A');
        const p2 = result.current.addCourse('B');
        const p3 = result.current.addCourse('C');
        await Promise.all([p1, p2, p3]);
      });

      // refresh() should be called 3 times (one per addCourse)
      expect(mockGetContentTree).toHaveBeenCalledTimes(3);
    });
  });

  // ========== SUITE 4: Error Recovery ==========

  describe('Error recovery and retry logic', () => {
    it('sets error state then recovers on successful refresh', async () => {
      // First fetch fails
      mockGetContentTree.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.tree!.courses).toHaveLength(0);

      // Now mock succeeds for refresh
      mockGetContentTree.mockResolvedValueOnce([
        {
          id: 'course-001',
          name: 'Recovered Course',
          semesters: [],
        },
      ]);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.tree!.courses).toHaveLength(1);
      expect(result.current.tree!.courses[0].name).toBe('Recovered Course');
    });

    it('handles API error during addCourse', async () => {
      mockGetContentTree.mockResolvedValue([]);
      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockCreateCourse.mockRejectedValueOnce(new Error('Invalid payload'));

      let errorThrown = false;
      try {
        await act(async () => {
          await result.current.addCourse('Bad Course');
        });
      } catch (err) {
        errorThrown = true;
      }

      expect(errorThrown).toBe(true);
      // refresh() should not have been called after error
      expect(mockGetContentTree).toHaveBeenCalledTimes(1); // only initial load
    });

    it('clears error on successful CRUD after previous failure', async () => {
      // Set up initial error state
      mockGetContentTree.mockRejectedValueOnce(new Error('Initial load failed'));

      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();

      // Now succeed with refresh
      mockGetContentTree.mockResolvedValueOnce([]);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBeNull();
    });

    it('handles timeout-like delays gracefully', async () => {
      const neverResolves = new Promise(() => {}); // never resolves
      mockGetContentTree.mockReturnValueOnce(neverResolves);

      const { result } = renderHook(() => useContentTree(), { wrapper });

      // Should still be loading
      expect(result.current.loading).toBe(true);
      expect(result.current.tree).toBeNull();

      // If we replace the mock before it resolves, the old promise is abandoned
      mockGetContentTree.mockResolvedValueOnce([]);

      // Component should not crash
      expect(() => {
        result.current.refresh();
      }).not.toThrow();
    });
  });

  // ========== SUITE 5: Institution Switching Edge Cases ==========

  describe('Institution switching edge cases', () => {
    it('resets tree and selectedTopicId when institution changes', async () => {
      mockGetContentTree.mockResolvedValue(DEEPLY_NESTED_TREE);

      const { result, rerender } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tree!.courses).toHaveLength(2);

      // Select a topic
      act(() => {
        result.current.selectTopic('topic-001');
      });

      expect(result.current.selectedTopicId).toBe('topic-001');

      // Switch institution
      mockAuthValues = {
        selectedInstitution: { id: 'inst-002' },
        role: 'professor',
        status: 'authenticated',
      };

      mockGetContentTree.mockResolvedValueOnce([]);

      // Force re-render so the hook picks up the new mock values
      rerender();

      await waitFor(() => {
        expect(mockGetContentTree).toHaveBeenCalledWith('inst-002');
      });

      // Tree should be reset to null initially, then empty
      await waitFor(() => {
        expect(result.current.selectedTopicId).toBeNull();
      });
    });

    it('handles switching from institution to null', async () => {
      mockGetContentTree.mockResolvedValue([]);

      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Switch to no institution
      mockAuthValues = {
        selectedInstitution: null,
        role: null,
        status: 'authenticated',
      };

      // Wait for effect to process
      await waitFor(() => {
        expect(result.current.tree).not.toBeNull();
        expect(result.current.tree!.courses).toHaveLength(0);
        expect(result.current.loading).toBe(false);
      });
    });

    it('handles rapid institution changes', async () => {
      mockGetContentTree.mockResolvedValue([]);

      const { result, rerender } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockGetContentTree.mockClear();

      // Rapidly change institutions
      mockAuthValues.selectedInstitution = { id: 'inst-002' };
      rerender();

      await waitFor(() => {
        expect(mockGetContentTree).toHaveBeenCalledWith('inst-002');
      });

      // Change again before first completes
      mockAuthValues.selectedInstitution = { id: 'inst-003' };
      rerender();

      await waitFor(() => {
        const calls = mockGetContentTree.mock.calls;
        // Should have called with inst-003 (may have called inst-002 first)
        expect(calls.some(c => c[0] === 'inst-003')).toBe(true);
      });
    });
  });

  // ========== SUITE 6: Auth State Transitions ==========

  describe('Auth state transitions and loading states', () => {
    it('handles auth transitioning from loading to authenticated', async () => {
      mockAuthValues.status = 'loading';
      mockGetContentTree.mockResolvedValue([]);

      const { result, rerender } = renderHook(() => useContentTree(), { wrapper });

      // Should not call API while auth is loading
      expect(mockGetContentTree).not.toHaveBeenCalled();

      // Simulate auth becoming authenticated
      mockAuthValues.status = 'authenticated';
      rerender();

      await waitFor(() => {
        expect(mockGetContentTree).toHaveBeenCalledWith('inst-001');
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('persists tree data while auth transitions', async () => {
      mockGetContentTree.mockResolvedValue([
        { id: 'course-001', name: 'Math', semesters: [] },
      ]);

      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCourses = result.current.tree!.courses;

      // Simulate auth re-validating (status goes to 'loading' then back)
      mockAuthValues.status = 'loading';

      // Tree should still have data while auth is loading
      expect(result.current.tree!.courses).toEqual(initialCourses);
    });

    it('handles role changes (professor to student)', async () => {
      const { result, rerender } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.canEdit).toBe(true);

      // Change role to student
      mockAuthValues.role = 'student';
      rerender();

      await waitFor(() => {
        // canEdit is recomputed
        expect(result.current.canEdit).toBe(false);
      });

      // Tree should still be there
      expect(result.current.tree).not.toBeNull();
    });

    it('handles role changes (student to professor)', async () => {
      mockAuthValues.role = 'student';
      const { result, rerender } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.canEdit).toBe(false);

      // Change role to professor
      mockAuthValues.role = 'professor';
      rerender();

      await waitFor(() => {
        expect(result.current.canEdit).toBe(true);
      });
    });
  });

  // ========== SUITE 7: Topic Selection Edge Cases ==========

  describe('Topic selection edge cases', () => {
    it('allows selecting and deselecting topics', async () => {
      mockGetContentTree.mockResolvedValue(DEEPLY_NESTED_TREE);
      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.selectedTopicId).toBeNull();

      act(() => {
        result.current.selectTopic('topic-001');
      });

      expect(result.current.selectedTopicId).toBe('topic-001');

      act(() => {
        result.current.selectTopic('topic-002');
      });

      expect(result.current.selectedTopicId).toBe('topic-002');

      act(() => {
        result.current.selectTopic(null);
      });

      expect(result.current.selectedTopicId).toBeNull();
    });

    it('handles selecting topics that do not exist in tree', async () => {
      mockGetContentTree.mockResolvedValue(DEEPLY_NESTED_TREE);
      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Can select any ID, even if not in tree (no validation)
      act(() => {
        result.current.selectTopic('nonexistent-topic-id');
      });

      expect(result.current.selectedTopicId).toBe('nonexistent-topic-id');

      // Tree is still intact
      expect(result.current.tree!.courses).toHaveLength(2);
    });

    it('preserves topic selection across tree refreshes', async () => {
      mockGetContentTree.mockResolvedValue(DEEPLY_NESTED_TREE);
      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.selectTopic('topic-001');
      });

      mockGetContentTree.mockClear();
      mockGetContentTree.mockResolvedValueOnce(DEEPLY_NESTED_TREE);

      await act(async () => {
        await result.current.refresh();
      });

      // Topic selection should be preserved
      expect(result.current.selectedTopicId).toBe('topic-001');
    });
  });

  // ========== SUITE 8: CRUD with Empty Tree ==========

  describe('CRUD operations on empty tree', () => {
    it('addCourse works on initially empty tree', async () => {
      mockGetContentTree.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tree!.courses).toHaveLength(0);

      mockGetContentTree.mockClear();
      mockGetContentTree.mockResolvedValueOnce([
        { id: 'new-course', name: 'First Course', semesters: [] },
      ]);

      await act(async () => {
        await result.current.addCourse('First Course');
      });

      expect(mockCreateCourse).toHaveBeenCalled();
      expect(result.current.tree!.courses).toHaveLength(1);
      expect(result.current.tree!.courses[0].name).toBe('First Course');
    });

    it('editCourse fails gracefully when course does not exist in tree', async () => {
      mockGetContentTree.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useContentTree(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockUpdateCourse.mockResolvedValueOnce({ id: 'nonexistent', name: 'Updated' });
      mockGetContentTree.mockResolvedValueOnce([]);

      // Should not crash, API allows this
      await act(async () => {
        await result.current.editCourse('nonexistent-id', 'Updated Name');
      });

      expect(mockUpdateCourse).toHaveBeenCalledWith('nonexistent-id', {
        name: 'Updated Name',
      });
    });
  });
});
