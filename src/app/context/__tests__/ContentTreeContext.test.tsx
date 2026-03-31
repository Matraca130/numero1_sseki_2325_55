// ============================================================
// Axon -- Tests for ContentTreeContext (ContentTreeProvider + useContentTree)
//
// Covers:
//   1. useContentTree() outside ContentTreeProvider throws
//   2. Initial loading state
//   3. Tree loading with institution selected
//   4. Tree loading without institution (empty tree)
//   5. canEdit logic (professor/owner/admin = true, student = false)
//   6. selectTopic updates selectedTopicId
//   7. Error state on fetch failure
//   8. CRUD: addCourse calls API then refreshes
//   9. CRUD: editCourse calls API then refreshes
//  10. CRUD: removeCourse calls API then refreshes
//  11. CRUD: addSemester / editSemester / removeSemester
//  12. CRUD: addSection / editSection / removeSection
//  13. CRUD: addTopic / editTopic / removeTopic
//  14. refresh() re-fetches the tree
//  15. Institution change resets tree and selectedTopicId
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

// -- Mock data -------------------------------------------------------

const MOCK_COURSES = [
  {
    id: 'course-001',
    name: 'Math 101',
    description: 'Intro to math',
    order_index: 0,
    semesters: [
      {
        id: 'sem-001',
        name: 'Fall 2025',
        order_index: 0,
        sections: [
          {
            id: 'sec-001',
            name: 'Algebra',
            order_index: 0,
            topics: [
              { id: 'topic-001', name: 'Quadratics', order_index: 0 },
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
  mockGetContentTree.mockResolvedValue(MOCK_COURSES);
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

describe('ContentTreeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthValues = {
      selectedInstitution: { id: 'inst-001' },
      role: 'professor',
      status: 'authenticated',
    };
    setupDefaultMocks();
  });

  // -- Test 1: useContentTree outside provider throws --

  it('useContentTree() outside ContentTreeProvider throws an error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useContentTree());
    }).toThrow('useContentTree must be used within a ContentTreeProvider');

    consoleSpy.mockRestore();
  });

  // -- Test 2: Initial loading state --

  it('starts with loading=true on mount', () => {
    mockGetContentTree.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useContentTree(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.tree).toBeNull();
  });

  // -- Test 3: Tree loading with institution --

  it('loads tree when institution is selected', async () => {
    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tree).not.toBeNull();
    expect(result.current.tree!.courses).toHaveLength(1);
    expect(result.current.tree!.courses[0].name).toBe('Math 101');
    expect(result.current.tree!.courses[0].semesters).toHaveLength(1);
    expect(result.current.tree!.courses[0].semesters[0].sections[0].topics[0].name).toBe('Quadratics');
    expect(result.current.error).toBeNull();

    expect(mockGetContentTree).toHaveBeenCalledWith('inst-001');
  });

  // -- Test 4: No institution -> empty tree --

  it('sets empty tree when no institution is selected', async () => {
    mockAuthValues = {
      selectedInstitution: null,
      role: null,
      status: 'authenticated',
    };

    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tree).not.toBeNull();
    expect(result.current.tree!.courses).toHaveLength(0);
    expect(mockGetContentTree).not.toHaveBeenCalled();
  });

  // -- Test 5: canEdit logic --

  it('canEdit is true for professor role', async () => {
    mockAuthValues.role = 'professor';

    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.canEdit).toBe(true);
  });

  it('canEdit is true for owner role', async () => {
    mockAuthValues.role = 'owner';

    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.canEdit).toBe(true);
  });

  it('canEdit is true for admin role', async () => {
    mockAuthValues.role = 'admin';

    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.canEdit).toBe(true);
  });

  it('canEdit is false for student role', async () => {
    mockAuthValues.role = 'student';

    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.canEdit).toBe(false);
  });

  // -- Test 6: selectTopic --

  it('selectTopic updates selectedTopicId', async () => {
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
      result.current.selectTopic(null);
    });

    expect(result.current.selectedTopicId).toBeNull();
  });

  // -- Test 7: Error state --

  it('sets error state on fetch failure', async () => {
    mockGetContentTree.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    // Still sets empty tree so UI can show empty state
    expect(result.current.tree).not.toBeNull();
    expect(result.current.tree!.courses).toHaveLength(0);
  });

  // -- Test 8: addCourse --

  it('addCourse calls createCourse API then refreshes', async () => {
    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetContentTree.mockClear();

    await act(async () => {
      await result.current.addCourse('Physics 101', 'Intro to physics');
    });

    expect(mockCreateCourse).toHaveBeenCalledWith({
      institution_id: 'inst-001',
      name: 'Physics 101',
      description: 'Intro to physics',
    });
    // refresh() should call getContentTree again
    expect(mockGetContentTree).toHaveBeenCalledWith('inst-001');
  });

  it('addCourse does nothing when no institution is selected', async () => {
    mockAuthValues = {
      selectedInstitution: null,
      role: null,
      status: 'authenticated',
    };

    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addCourse('Physics 101');
    });

    expect(mockCreateCourse).not.toHaveBeenCalled();
  });

  // -- Test 9: editCourse --

  it('editCourse calls updateCourse API then refreshes', async () => {
    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetContentTree.mockClear();

    await act(async () => {
      await result.current.editCourse('course-001', 'Advanced Math', 'Updated desc');
    });

    expect(mockUpdateCourse).toHaveBeenCalledWith('course-001', {
      name: 'Advanced Math',
      description: 'Updated desc',
    });
    expect(mockGetContentTree).toHaveBeenCalledWith('inst-001');
  });

  // -- Test 10: removeCourse --

  it('removeCourse calls deleteCourse API then refreshes', async () => {
    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetContentTree.mockClear();

    await act(async () => {
      await result.current.removeCourse('course-001');
    });

    expect(mockDeleteCourse).toHaveBeenCalledWith('course-001');
    expect(mockGetContentTree).toHaveBeenCalledWith('inst-001');
  });

  // -- Test 11: Semester CRUD --

  it('addSemester calls createSemester API then refreshes', async () => {
    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetContentTree.mockClear();

    await act(async () => {
      await result.current.addSemester('course-001', 'Spring 2026');
    });

    expect(mockCreateSemester).toHaveBeenCalledWith({
      course_id: 'course-001',
      name: 'Spring 2026',
    });
    expect(mockGetContentTree).toHaveBeenCalled();
  });

  it('editSemester calls updateSemester API then refreshes', async () => {
    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetContentTree.mockClear();

    await act(async () => {
      await result.current.editSemester('sem-001', 'Updated Semester');
    });

    expect(mockUpdateSemester).toHaveBeenCalledWith('sem-001', { name: 'Updated Semester' });
    expect(mockGetContentTree).toHaveBeenCalled();
  });

  it('removeSemester calls deleteSemester API then refreshes', async () => {
    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetContentTree.mockClear();

    await act(async () => {
      await result.current.removeSemester('sem-001');
    });

    expect(mockDeleteSemester).toHaveBeenCalledWith('sem-001');
    expect(mockGetContentTree).toHaveBeenCalled();
  });

  // -- Test 12: Section CRUD --

  it('addSection calls createSection API then refreshes', async () => {
    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetContentTree.mockClear();

    await act(async () => {
      await result.current.addSection('sem-001', 'Geometry');
    });

    expect(mockCreateSection).toHaveBeenCalledWith({
      semester_id: 'sem-001',
      name: 'Geometry',
    });
    expect(mockGetContentTree).toHaveBeenCalled();
  });

  it('editSection calls updateSection API then refreshes', async () => {
    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetContentTree.mockClear();

    await act(async () => {
      await result.current.editSection('sec-001', 'Updated Section');
    });

    expect(mockUpdateSection).toHaveBeenCalledWith('sec-001', { name: 'Updated Section' });
    expect(mockGetContentTree).toHaveBeenCalled();
  });

  it('removeSection calls deleteSection API then refreshes', async () => {
    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetContentTree.mockClear();

    await act(async () => {
      await result.current.removeSection('sec-001');
    });

    expect(mockDeleteSection).toHaveBeenCalledWith('sec-001');
    expect(mockGetContentTree).toHaveBeenCalled();
  });

  // -- Test 13: Topic CRUD --

  it('addTopic calls createTopic API then refreshes', async () => {
    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetContentTree.mockClear();

    await act(async () => {
      await result.current.addTopic('sec-001', 'Derivatives');
    });

    expect(mockCreateTopic).toHaveBeenCalledWith({
      section_id: 'sec-001',
      name: 'Derivatives',
    });
    expect(mockGetContentTree).toHaveBeenCalled();
  });

  it('editTopic calls updateTopic API then refreshes', async () => {
    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetContentTree.mockClear();

    await act(async () => {
      await result.current.editTopic('topic-001', 'Updated Topic');
    });

    expect(mockUpdateTopic).toHaveBeenCalledWith('topic-001', { name: 'Updated Topic' });
    expect(mockGetContentTree).toHaveBeenCalled();
  });

  it('removeTopic calls deleteTopic API then refreshes', async () => {
    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetContentTree.mockClear();

    await act(async () => {
      await result.current.removeTopic('topic-001');
    });

    expect(mockDeleteTopic).toHaveBeenCalledWith('topic-001');
    expect(mockGetContentTree).toHaveBeenCalled();
  });

  // -- Test 14: refresh() --

  it('refresh() re-fetches the tree', async () => {
    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Initial fetch
    expect(mockGetContentTree).toHaveBeenCalledTimes(1);

    mockGetContentTree.mockClear();

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetContentTree).toHaveBeenCalledWith('inst-001');
  });

  // -- Test 15: Handles backend response wrapped in { courses: [...] } --

  it('handles backend response wrapped in { courses: [...] } shape', async () => {
    mockGetContentTree.mockResolvedValue({ courses: MOCK_COURSES });

    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tree).not.toBeNull();
    expect(result.current.tree!.courses).toHaveLength(1);
    expect(result.current.tree!.courses[0].name).toBe('Math 101');
  });

  // -- Test 16: Handles non-array, non-object response gracefully --

  it('handles unexpected response shape gracefully', async () => {
    mockGetContentTree.mockResolvedValue(null);

    const { result } = renderHook(() => useContentTree(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tree).not.toBeNull();
    expect(result.current.tree!.courses).toHaveLength(0);
  });

  // -- Test 17: Loading state during auth loading --

  it('does not fetch when auth status is loading', async () => {
    mockAuthValues = {
      selectedInstitution: { id: 'inst-001' },
      role: 'professor',
      status: 'loading',
    };

    renderHook(() => useContentTree(), { wrapper });

    // Should not call getContentTree while auth is loading
    expect(mockGetContentTree).not.toHaveBeenCalled();
  });
});
