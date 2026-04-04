// ============================================================
// Hook Tests — useExamPrep
//
// Tests the exam prep query hook: fetch with examId, disabled
// when examId is null, and error handling.
//
// RUN: npx vitest run src/app/hooks/queries/__tests__/useExamPrep.test.ts
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock api ────────────────────────────────────────────────

const mockApiCall = vi.fn();

vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

// ── Import after mocks ─────────────────────────────────────

import { useExamPrep, type ExamReviewPlan } from '../useExamPrep';

// ── Helpers ─────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return { wrapper, queryClient };
}

const MOCK_PLAN: ExamReviewPlan[] = [
  {
    topicName: 'Integrals',
    difficulty: 3,
    peakRetrievability: 0.85,
    reviewDates: ['2026-04-05', '2026-04-07'],
    priority: 1,
  },
  {
    topicName: 'Derivatives',
    difficulty: 2,
    peakRetrievability: 0.92,
    reviewDates: ['2026-04-06'],
    priority: 2,
  },
];

// ── Tests ───────────────────────────────────────────────────

describe('useExamPrep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches exam prep data when examId is provided', async () => {
    mockApiCall.mockResolvedValueOnce(MOCK_PLAN);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useExamPrep('exam-123'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(MOCK_PLAN);
    expect(mockApiCall).toHaveBeenCalledWith('/schedule/exam-prep/exam-123');
  });

  it('does not fetch when examId is null', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useExamPrep(null), { wrapper });

    // Should remain in idle/disabled state
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('returns error state on fetch failure', async () => {
    mockApiCall.mockRejectedValue(new Error('Not found'));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useExamPrep('exam-456'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });

    expect(result.current.error).toBeTruthy();
  });

  it('uses examId in query key for cache isolation', async () => {
    mockApiCall.mockResolvedValueOnce(MOCK_PLAN);
    const { wrapper, queryClient } = createWrapper();

    renderHook(() => useExamPrep('exam-789'), { wrapper });

    await waitFor(() =>
      expect(queryClient.getQueryData(['exam-prep', 'exam-789'])).toEqual(MOCK_PLAN),
    );
  });
});
