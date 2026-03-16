// ============================================================
// TEST: concurrency.ts — parallelWithLimit
//
// Used by: keywordMasteryApi (limit=4), adaptiveGenerationApi (limit=3)
//
// All tests are pure async — zero mocks, zero DOM.
// ============================================================

import { describe, it, expect } from 'vitest';
import { parallelWithLimit } from '../concurrency';

// ── helpers ───────────────────────────────────────────────

/** Creates a task that resolves after `ms` with `value`. */
function delayedTask<T>(value: T, ms: number): () => Promise<T> {
  return () => new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Creates a task that rejects after `ms` with an Error. */
function failingTask(msg: string, ms: number): () => Promise<never> {
  return () => new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms));
}

/** Extract fulfilled values from settled results. */
function fulfilledValues<T>(results: PromiseSettledResult<T>[]): T[] {
  return results
    .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
    .map((r) => r.value);
}

// ── Edge cases ────────────────────────────────────────────

describe('parallelWithLimit — edge cases', () => {
  it('empty array → empty results', async () => {
    const results = await parallelWithLimit([], 5);
    expect(results).toEqual([]);
  });

  it('single task → single result', async () => {
    const results = await parallelWithLimit(
      [delayedTask('hello', 1)],
      3,
    );
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ status: 'fulfilled', value: 'hello' });
  });

  it('limit > tasks.length → all run, correct results', async () => {
    const tasks = [delayedTask('a', 1), delayedTask('b', 1)];
    const results = await parallelWithLimit(tasks, 100);
    expect(fulfilledValues(results)).toEqual(['a', 'b']);
  });
});

// ── Order preservation ────────────────────────────────────

describe('parallelWithLimit — order preservation', () => {
  it('results match input order even with varying delays', async () => {
    // Task 0 is slowest, task 2 is fastest — results must still be [0,1,2]
    const tasks = [
      delayedTask('slow', 30),
      delayedTask('medium', 15),
      delayedTask('fast', 1),
    ];
    const results = await parallelWithLimit(tasks, 2);
    expect(fulfilledValues(results)).toEqual(['slow', 'medium', 'fast']);
  });

  it('serial execution (limit=1) preserves order', async () => {
    const tasks = [
      delayedTask(1, 5),
      delayedTask(2, 5),
      delayedTask(3, 5),
    ];
    const results = await parallelWithLimit(tasks, 1);
    expect(fulfilledValues(results)).toEqual([1, 2, 3]);
  });
});

// ── Error handling ────────────────────────────────────────

describe('parallelWithLimit — error handling', () => {
  it('failed tasks → rejected PromiseSettledResult at correct index', async () => {
    const tasks = [
      delayedTask('ok', 1),
      failingTask('boom', 1),
      delayedTask('also ok', 1),
    ];
    const results = await parallelWithLimit(tasks, 3);

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ status: 'fulfilled', value: 'ok' });
    expect(results[1].status).toBe('rejected');
    expect((results[1] as PromiseRejectedResult).reason).toBeInstanceOf(Error);
    expect(((results[1] as PromiseRejectedResult).reason as Error).message).toBe('boom');
    expect(results[2]).toEqual({ status: 'fulfilled', value: 'also ok' });
  });

  it('all tasks fail → all rejected, never throws', async () => {
    const tasks = [
      failingTask('err1', 1),
      failingTask('err2', 1),
    ];
    const results = await parallelWithLimit(tasks, 2);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('rejected');
    expect(results[1].status).toBe('rejected');
  });
});

// ── Concurrency enforcement ───────────────────────────────

describe('parallelWithLimit — concurrency enforcement', () => {
  it('never exceeds the concurrency limit', async () => {
    let running = 0;
    let maxRunning = 0;
    const LIMIT = 2;

    const tasks = Array.from({ length: 6 }, (_, i) => {
      return async () => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        // Simulate async work
        await new Promise((r) => setTimeout(r, 10));
        running--;
        return i;
      };
    });

    const results = await parallelWithLimit(tasks, LIMIT);

    // Verify concurrency was respected
    expect(maxRunning).toBeLessThanOrEqual(LIMIT);
    // Verify all tasks completed in order
    expect(fulfilledValues(results)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
