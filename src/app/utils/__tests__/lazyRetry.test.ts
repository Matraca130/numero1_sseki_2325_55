// ============================================================
// Tests for lazyRetry.ts — Lazy import retry with stale chunk detection
//
// Verifies:
//   - Auto-reload on chunk load errors
//   - Prevents infinite reload loops
//   - Passes through non-chunk errors
//   - sessionStorage usage
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lazyRetry } from '@/app/utils/lazyRetry';

// ──────────────────────────────────────────────────────────
// Setup & Teardown
// ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  // Mock window.location.reload
  vi.stubGlobal('location', { reload: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ──────────────────────────────────────────────────────────
// SUITE 1: Successful imports
// ──────────────────────────────────────────────────────────

describe('lazyRetry — successful imports', () => {
  it('returns resolved promise on successful import', async () => {
    const mockModule = { Component: 'MyComponent' };
    const importFn = vi.fn().mockResolvedValue(mockModule);

    const result = await lazyRetry(importFn);

    expect(result).toBe(mockModule);
    expect(importFn).toHaveBeenCalledTimes(1);
  });

  it('does not reload page on successful import', async () => {
    const importFn = vi.fn().mockResolvedValue({ Component: 'Test' });

    await lazyRetry(importFn);

    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('does not set sessionStorage on successful import', async () => {
    const importFn = vi.fn().mockResolvedValue({ Component: 'Test' });

    await lazyRetry(importFn);

    expect(sessionStorage.getItem('axon-chunk-retry')).toBeNull();
  });

  it('passes through module exports', async () => {
    const module = { Component: 'TestComponent', default: 'Default' };
    const importFn = vi.fn().mockResolvedValue(module);

    const result = await lazyRetry(importFn);

    expect(result.Component).toBe('TestComponent');
    expect(result.default).toBe('Default');
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 2: Chunk load errors (should trigger reload)
// ──────────────────────────────────────────────────────────

describe('lazyRetry — chunk errors (first attempt)', () => {
  it('reloads page when dynamically imported module fails', async () => {
    const error = new TypeError('Failed to fetch dynamically imported module');
    const importFn = vi.fn().mockRejectedValue(error);

    // Create a promise that won't resolve (simulating page reload)
    const promise = lazyRetry(importFn);

    // Give it a moment to set sessionStorage and call reload
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(sessionStorage.getItem('axon-chunk-retry')).toBe('1');
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('detects "Failed to fetch" error message', async () => {
    const error = new TypeError('Failed to fetch');
    const importFn = vi.fn().mockRejectedValue(error);

    const promise = lazyRetry(importFn);
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(window.location.reload).toHaveBeenCalled();
  });

  it('detects "Loading chunk" error message', async () => {
    const error = new TypeError('Loading chunk 123 failed');
    const importFn = vi.fn().mockRejectedValue(error);

    const promise = lazyRetry(importFn);
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(window.location.reload).toHaveBeenCalled();
  });

  it('detects "is not a valid JavaScript MIME type" error', async () => {
    const error = new TypeError('is not a valid JavaScript MIME type');
    const importFn = vi.fn().mockRejectedValue(error);

    const promise = lazyRetry(importFn);
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(window.location.reload).toHaveBeenCalled();
  });

  it('sets sessionStorage flag before reload', async () => {
    const error = new TypeError('Failed to fetch dynamically imported module');
    const importFn = vi.fn().mockRejectedValue(error);

    const promise = lazyRetry(importFn);
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(sessionStorage.getItem('axon-chunk-retry')).toBe('1');
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 3: Non-chunk errors (should not reload)
// ──────────────────────────────────────────────────────────

describe('lazyRetry — non-chunk errors', () => {
  it('throws non-chunk TypeError', async () => {
    const error = new TypeError('Cannot read property x of undefined');
    const importFn = vi.fn().mockRejectedValue(error);

    await expect(lazyRetry(importFn)).rejects.toThrow('Cannot read property x of undefined');
  });

  it('does not reload page on non-chunk TypeError', async () => {
    const error = new TypeError('Some other error');
    const importFn = vi.fn().mockRejectedValue(error);

    try {
      await lazyRetry(importFn);
    } catch {
      // Expected to throw
    }

    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('throws SyntaxError', async () => {
    const error = new SyntaxError('Unexpected token');
    const importFn = vi.fn().mockRejectedValue(error);

    await expect(lazyRetry(importFn)).rejects.toThrow('Unexpected token');
  });

  it('throws ReferenceError', async () => {
    const error = new ReferenceError('x is not defined');
    const importFn = vi.fn().mockRejectedValue(error);

    await expect(lazyRetry(importFn)).rejects.toThrow('x is not defined');
  });

  it('throws custom Error', async () => {
    const error = new Error('Custom error message');
    const importFn = vi.fn().mockRejectedValue(error);

    await expect(lazyRetry(importFn)).rejects.toThrow('Custom error message');
  });

  it('does not set sessionStorage on non-chunk error', async () => {
    const error = new TypeError('Some other error');
    const importFn = vi.fn().mockRejectedValue(error);

    try {
      await lazyRetry(importFn);
    } catch {
      // Expected
    }

    expect(sessionStorage.getItem('axon-chunk-retry')).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 4: Preventing infinite reload loops
// ──────────────────────────────────────────────────────────

describe('lazyRetry — prevent infinite reloads', () => {
  it('throws error on second chunk failure (after reload)', async () => {
    // Simulate: page already reloaded once
    sessionStorage.setItem('axon-chunk-retry', '1');

    const error = new TypeError('Failed to fetch dynamically imported module');
    const importFn = vi.fn().mockRejectedValue(error);

    // Should throw instead of reload again
    await expect(lazyRetry(importFn)).rejects.toThrow('Failed to fetch dynamically imported module');
  });

  it('does NOT reload page on second chunk failure', async () => {
    sessionStorage.setItem('axon-chunk-retry', '1');

    const error = new TypeError('Failed to fetch dynamically imported module');
    const importFn = vi.fn().mockRejectedValue(error);

    try {
      await lazyRetry(importFn);
    } catch {
      // Expected
    }

    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('clears sessionStorage after throwing on second failure', async () => {
    sessionStorage.setItem('axon-chunk-retry', '1');

    const error = new TypeError('Failed to fetch dynamically imported module');
    const importFn = vi.fn().mockRejectedValue(error);

    try {
      await lazyRetry(importFn);
    } catch {
      // Expected
    }

    // sessionStorage should be cleared to prevent future false positives
    expect(sessionStorage.getItem('axon-chunk-retry')).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 5: Complex scenarios
// ──────────────────────────────────────────────────────────

describe('lazyRetry — complex scenarios', () => {
  it('handles multiple lazy imports independently', async () => {
    const import1 = vi.fn().mockResolvedValue({ Component: 'Comp1' });
    const import2 = vi.fn().mockResolvedValue({ Component: 'Comp2' });

    const result1 = await lazyRetry(import1);
    const result2 = await lazyRetry(import2);

    expect(result1.Component).toBe('Comp1');
    expect(result2.Component).toBe('Comp2');
  });

  it('returns never-resolving promise when reloading', async () => {
    const error = new TypeError('Failed to fetch dynamically imported module');
    const importFn = vi.fn().mockRejectedValue(error);

    const promise = lazyRetry(importFn);

    // Wait a bit for reload to be called
    await new Promise(resolve => setTimeout(resolve, 20));

    // Promise should still be pending (never resolved)
    let resolved = false;
    promise.then(() => { resolved = true; });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(resolved).toBe(false);
  });

  it('handles error with empty message', async () => {
    const error = new TypeError('');
    const importFn = vi.fn().mockRejectedValue(error);

    // Empty message is not a chunk error pattern
    await expect(lazyRetry(importFn)).rejects.toThrow();
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('handles TypeError with message containing chunk keywords', async () => {
    const error = new TypeError('Loading chunk XYZ failed due to network');
    const importFn = vi.fn().mockRejectedValue(error);

    const promise = lazyRetry(importFn);
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(window.location.reload).toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 6: Development environment behavior
// ──────────────────────────────────────────────────────────

describe('lazyRetry — dev mode logging', () => {
  it('logs warning in dev when reloading', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const error = new TypeError('Failed to fetch dynamically imported module');
    const importFn = vi.fn().mockRejectedValue(error);

    const promise = lazyRetry(importFn);
    await new Promise(resolve => setTimeout(resolve, 10));

    // In dev mode (import.meta.env.DEV is true in tests), should log
    // Check that warn was called at all with the expected message pattern
    expect(consoleSpy).toHaveBeenCalled();
    const callArgs = consoleSpy.mock.calls[0];
    expect(callArgs[0]).toContain('[lazyRetry]');
    expect(callArgs[0]).toContain('Stale chunk');

    consoleSpy.mockRestore();
  });
});
