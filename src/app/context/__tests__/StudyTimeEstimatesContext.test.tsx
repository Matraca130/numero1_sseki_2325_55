// ============================================================
// Axon -- Tests for StudyTimeEstimatesContext
//
// Covers:
//   1. useStudyTimeEstimatesContext() outside provider throws
//   2. Provider renders children and exposes hook values
//   3. Memoized value structure matches UseStudyTimeEstimatesResult
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

// -- Mock useStudyTimeEstimates hook before importing context --

const mockMethodEstimates = new Map();
const mockGetEstimate = vi.fn().mockReturnValue({
  methodId: 'flashcard',
  estimatedMinutes: 20,
  confidence: 'fallback' as const,
  sampleSize: 0,
  sourceLabel: 'estimativa padrao',
});
const mockComputeTotalHours = vi.fn().mockReturnValue(0);
const mockComputeWeeklyHours = vi.fn().mockReturnValue(null);

vi.mock('@/app/hooks/useStudyTimeEstimates', () => ({
  useStudyTimeEstimates: () => ({
    methodEstimates: mockMethodEstimates,
    getEstimate: mockGetEstimate,
    computeTotalHours: mockComputeTotalHours,
    computeWeeklyHours: mockComputeWeeklyHours,
    overallConfidence: 'fallback' as const,
    hasRealData: false,
    summary: {
      totalSessionsAnalyzed: 0,
      daysOfActivityAnalyzed: 0,
      avgMinutesPerSession: null,
    },
    loading: false,
    error: null,
  }),
}));

// -- Import AFTER mocks ------------------------------------

import {
  StudyTimeEstimatesProvider,
  useStudyTimeEstimatesContext,
} from '../StudyTimeEstimatesContext';

// -- Helpers ------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return <StudyTimeEstimatesProvider>{children}</StudyTimeEstimatesProvider>;
}

// -- Test suite ---------------------------------------------

describe('StudyTimeEstimatesContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useStudyTimeEstimatesContext() outside provider throws an error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useStudyTimeEstimatesContext());
    }).toThrow('useStudyTimeEstimatesContext must be used within a StudyTimeEstimatesProvider');

    consoleSpy.mockRestore();
  });

  it('provides useStudyTimeEstimates values through context', () => {
    const { result } = renderHook(() => useStudyTimeEstimatesContext(), { wrapper });

    expect(result.current.methodEstimates).toBe(mockMethodEstimates);
    expect(result.current.overallConfidence).toBe('fallback');
    expect(result.current.hasRealData).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.getEstimate).toBe('function');
    expect(typeof result.current.computeTotalHours).toBe('function');
    expect(typeof result.current.computeWeeklyHours).toBe('function');
  });

  it('exposes summary with expected structure', () => {
    const { result } = renderHook(() => useStudyTimeEstimatesContext(), { wrapper });

    expect(result.current.summary).toEqual({
      totalSessionsAnalyzed: 0,
      daysOfActivityAnalyzed: 0,
      avgMinutesPerSession: null,
    });
  });

  it('exposes all required UseStudyTimeEstimatesResult fields', () => {
    const { result } = renderHook(() => useStudyTimeEstimatesContext(), { wrapper });

    const keys = Object.keys(result.current);
    expect(keys).toContain('methodEstimates');
    expect(keys).toContain('getEstimate');
    expect(keys).toContain('computeTotalHours');
    expect(keys).toContain('computeWeeklyHours');
    expect(keys).toContain('overallConfidence');
    expect(keys).toContain('hasRealData');
    expect(keys).toContain('summary');
    expect(keys).toContain('loading');
    expect(keys).toContain('error');
  });
});
