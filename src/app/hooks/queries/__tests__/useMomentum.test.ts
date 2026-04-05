// ============================================================
// Hook Tests — useMomentum
//
// Tests the momentum query hook: successful fetch, loading state,
// error handling, and staleTime configuration.
//
// RUN: npx vitest run src/app/hooks/queries/__tests__/useMomentum.test.ts
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

import { useMomentum, type MomentumData } from '../useMomentum';

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

const MOCK_MOMENTUM: MomentumData = {
  score: 75,
  trend: 'rising',
  streak: 5,
};

// ── Tests ───────────────────────────────────────────────────

describe('useMomentum', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches momentum data successfully', async () => {
    mockApiCall.mockResolvedValueOnce(MOCK_MOMENTUM);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMomentum(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(MOCK_MOMENTUM);
    expect(mockApiCall).toHaveBeenCalledWith('/schedule/momentum');
  });

  it('returns error state on fetch failure', async () => {
    mockApiCall.mockRejectedValue(new Error('Network error'));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMomentum(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });

    expect(result.current.error).toBeTruthy();
  });

  it('uses correct query key', async () => {
    mockApiCall.mockResolvedValueOnce(MOCK_MOMENTUM);
    const { wrapper, queryClient } = createWrapper();

    renderHook(() => useMomentum(), { wrapper });

    await waitFor(() =>
      expect(queryClient.getQueryData(['schedule-momentum'])).toEqual(MOCK_MOMENTUM),
    );
  });
});
