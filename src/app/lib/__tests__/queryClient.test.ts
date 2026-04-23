// ============================================================
// Axon -- Tests for queryClient.ts
//
// Centralised singleton TanStack Query client. We verify the
// shape of its default options so accidental regressions don't
// slip through (e.g. auto-refetch-on-focus getting re-enabled).
// ============================================================

import { describe, it, expect } from 'vitest';
import { queryClient } from '@/app/lib/queryClient';
import { QueryClient } from '@tanstack/react-query';

describe('queryClient singleton', () => {
  it('is a QueryClient instance', () => {
    expect(queryClient).toBeInstanceOf(QueryClient);
  });

  it('exposes a getDefaultOptions() method', () => {
    expect(typeof queryClient.getDefaultOptions).toBe('function');
  });

  it('sets queries.staleTime to 5 minutes', () => {
    const opts = queryClient.getDefaultOptions();
    expect(opts.queries?.staleTime).toBe(5 * 60 * 1000);
  });

  it('sets queries.gcTime to 10 minutes', () => {
    const opts = queryClient.getDefaultOptions();
    expect(opts.queries?.gcTime).toBe(10 * 60 * 1000);
  });

  it('retries once on failure', () => {
    const opts = queryClient.getDefaultOptions();
    expect(opts.queries?.retry).toBe(1);
  });

  it('refetchOnWindowFocus is false (avoid surprise refetches)', () => {
    const opts = queryClient.getDefaultOptions();
    expect(opts.queries?.refetchOnWindowFocus).toBe(false);
  });

  it('refetchOnReconnect is true', () => {
    const opts = queryClient.getDefaultOptions();
    expect(opts.queries?.refetchOnReconnect).toBe(true);
  });

  it('is a module-level singleton (same reference across imports)', async () => {
    const again = await import('@/app/lib/queryClient');
    expect(again.queryClient).toBe(queryClient);
  });
});
