// ============================================================
// Axon -- Tests for TopicMasteryContext
//
// Covers:
//   1. useTopicMasteryContext() outside provider throws
//   2. Provider renders children and exposes hook values
//   3. Memoized value structure matches UseTopicMasteryResult
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

// -- Mock useTopicMastery hook before importing context ------

const mockTopicMastery = new Map();
const mockCourseMastery = new Map();
const mockRefresh = vi.fn().mockResolvedValue(undefined);

vi.mock('@/app/hooks/useTopicMastery', () => ({
  useTopicMastery: () => ({
    topicMastery: mockTopicMastery,
    courseMastery: mockCourseMastery,
    fsrsStates: [],
    flashcardToTopicMap: new Map(),
    loading: false,
    error: null,
    refresh: mockRefresh,
  }),
}));

// -- Import AFTER mocks ------------------------------------

import { TopicMasteryProvider, useTopicMasteryContext } from '../TopicMasteryContext';

// -- Helpers ------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return <TopicMasteryProvider>{children}</TopicMasteryProvider>;
}

// -- Test suite ---------------------------------------------

describe('TopicMasteryContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useTopicMasteryContext() outside provider throws an error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTopicMasteryContext());
    }).toThrow('useTopicMasteryContext must be used within a TopicMasteryProvider');

    consoleSpy.mockRestore();
  });

  it('provides useTopicMastery values through context', () => {
    const { result } = renderHook(() => useTopicMasteryContext(), { wrapper });

    expect(result.current.topicMastery).toBe(mockTopicMastery);
    expect(result.current.courseMastery).toBe(mockCourseMastery);
    expect(result.current.fsrsStates).toEqual([]);
    expect(result.current.flashcardToTopicMap).toBeInstanceOf(Map);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.refresh).toBe('function');
  });

  it('exposes all required UseTopicMasteryResult fields', () => {
    const { result } = renderHook(() => useTopicMasteryContext(), { wrapper });

    const keys = Object.keys(result.current);
    expect(keys).toContain('topicMastery');
    expect(keys).toContain('courseMastery');
    expect(keys).toContain('fsrsStates');
    expect(keys).toContain('flashcardToTopicMap');
    expect(keys).toContain('loading');
    expect(keys).toContain('error');
    expect(keys).toContain('refresh');
  });
});
