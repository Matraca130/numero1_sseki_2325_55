// ============================================================
// Axon — Tests for useContentTreeReadonly Hook
//
// Hook responsibility: load the institution's content tree.
//
// Note (2026-04-28): The previous version of this hook also queried
// /memberships and tried to filter the tree to professor courses by
// memberships.course_id. That column doesn't exist in the schema and
// the membership response was misshaped (paginated object, not array),
// which made the cascade silently empty for professors. The hook was
// simplified to just load the tree; tests below reflect that.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ContentTreeCourse } from '../useContentTree';

// -- Mock AuthContext -------------------------------------------------

let mockAuthValues: {
  selectedInstitution: { id: string } | null;
} = {
  selectedInstitution: { id: 'inst-001' },
};

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mockAuthValues,
}));

// -- Mock apiCall (used by useContentTreeReadonly) --

const mockApiCall = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: any[]) => mockApiCall(...args),
}));

// -- Mock logger --

vi.mock('@/app/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// -- Import AFTER mocks --

import { useContentTreeReadonly } from '../useContentTree';

// -- Test data -------------------------------------------------------

const MOCK_TREE: ContentTreeCourse[] = [
  {
    id: 'course-001',
    name: 'Math 101',
    semesters: [
      {
        id: 'sem-001',
        name: 'Fall 2025',
        sections: [
          { id: 'sec-001', name: 'Algebra', topics: [{ id: 'topic-001', name: 'Equations' }] },
        ],
      },
    ],
  },
  { id: 'course-002', name: 'Physics 101', semesters: [] },
];

// -- Test suite ------------------------------------------------------

describe('useContentTreeReadonly Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthValues = { selectedInstitution: { id: 'inst-001' } };
  });

  describe('No institution selected', () => {
    it('returns empty tree and loading=false', async () => {
      mockAuthValues.selectedInstitution = null;
      const { result } = renderHook(() => useContentTreeReadonly());
      expect(result.current.treeLoading).toBe(false);
      expect(result.current.contentTree).toEqual([]);
    });

    it('does not call API', async () => {
      mockAuthValues.selectedInstitution = null;
      renderHook(() => useContentTreeReadonly());
      expect(mockApiCall).not.toHaveBeenCalled();
    });
  });

  describe('Tree loading', () => {
    it('starts with loading=true and resolves to false', async () => {
      mockApiCall.mockResolvedValueOnce(MOCK_TREE);
      const { result } = renderHook(() => useContentTreeReadonly());
      expect(result.current.treeLoading).toBe(true);
      await waitFor(() => expect(result.current.treeLoading).toBe(false));
      expect(result.current.contentTree).toEqual(MOCK_TREE);
    });

    it('calls /content-tree with institution_id', async () => {
      mockApiCall.mockResolvedValueOnce(MOCK_TREE);
      renderHook(() => useContentTreeReadonly());
      await waitFor(() => expect(mockApiCall).toHaveBeenCalled());
      const url = mockApiCall.mock.calls[0][0];
      expect(url).toContain('/content-tree');
      expect(url).toContain('institution_id=inst-001');
    });
  });

  describe('Error handling', () => {
    it('sets empty tree on API error', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('boom'));
      const { result } = renderHook(() => useContentTreeReadonly());
      await waitFor(() => expect(result.current.treeLoading).toBe(false));
      expect(result.current.contentTree).toEqual([]);
    });

    it('handles non-array response', async () => {
      mockApiCall.mockResolvedValueOnce({ error: 'unexpected' });
      const { result } = renderHook(() => useContentTreeReadonly());
      await waitFor(() => expect(result.current.treeLoading).toBe(false));
      expect(result.current.contentTree).toEqual([]);
    });
  });

  describe('Cancellation on unmount', () => {
    it('does not update state after unmount', async () => {
      let resolve: (v: ContentTreeCourse[]) => void = () => {};
      mockApiCall.mockReturnValueOnce(new Promise(r => { resolve = r; }));
      const { result, unmount } = renderHook(() => useContentTreeReadonly());
      unmount();
      resolve(MOCK_TREE);
      await new Promise(r => setTimeout(r, 0));
      // No throw == OK; can't assert state on an unmounted hook directly.
      expect(result.current.contentTree).toEqual([]);
    });
  });

  describe('Reload on institution change', () => {
    it('reloads when selectedInstitution.id changes', async () => {
      mockApiCall.mockResolvedValue(MOCK_TREE);
      const { rerender } = renderHook(() => useContentTreeReadonly());
      await waitFor(() => expect(mockApiCall).toHaveBeenCalledTimes(1));
      mockAuthValues = { selectedInstitution: { id: 'inst-002' } };
      rerender();
      await waitFor(() => expect(mockApiCall).toHaveBeenCalledTimes(2));
      const secondUrl = mockApiCall.mock.calls[1][0];
      expect(secondUrl).toContain('institution_id=inst-002');
    });
  });
});
