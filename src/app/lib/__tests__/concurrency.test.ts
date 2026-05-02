// ============================================================
// Tests for concurrency.ts — parallelWithLimit
//
// Verifies:
//   - Result ordering matches input order (Promise.allSettled semantics)
//   - Concurrency cap is respected
//   - Mix of fulfilled / rejected results
//   - Edge cases: empty input, limit > tasks
// ============================================================
import { describe, it, expect } from 'vitest';
import { parallelWithLimit } from '@/app/lib/concurrency';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('parallelWithLimit', () => {
  it('preserves task order in results', async () => {
    const tasks = [10, 5, 30, 1].map(
      (delay, idx) =>
        () =>
          new Promise<number>(r => setTimeout(() => r(idx), delay))
    );
    const results = await parallelWithLimit(tasks, 2);
    expect(results.map(r => (r.status === 'fulfilled' ? r.value : -1))).toEqual([
      0, 1, 2, 3,
    ]);
    expect(results.every(r => r.status === 'fulfilled')).toBe(true);
  });

  it('captures rejected tasks without aborting the rest', async () => {
    const tasks = [
      async () => 'a',
      async () => {
        throw new Error('boom');
      },
      async () => 'c',
    ];
    const results = await parallelWithLimit(tasks, 2);

    expect(results[0]).toEqual({ status: 'fulfilled', value: 'a' });
    expect(results[1].status).toBe('rejected');
    if (results[1].status === 'rejected') {
      expect((results[1].reason as Error).message).toBe('boom');
    }
    expect(results[2]).toEqual({ status: 'fulfilled', value: 'c' });
  });

  it('returns empty array for empty input', async () => {
    const results = await parallelWithLimit<string>([], 4);
    expect(results).toEqual([]);
  });

  it('respects the concurrency limit (never exceeds it)', async () => {
    const LIMIT = 3;
    let inflight = 0;
    let peak = 0;

    const tasks = Array.from({ length: 12 }, (_, i) => async () => {
      inflight += 1;
      if (inflight > peak) peak = inflight;
      await new Promise(r => setTimeout(r, 5));
      inflight -= 1;
      return i;
    });

    const results = await parallelWithLimit(tasks, LIMIT);
    expect(peak).toBeLessThanOrEqual(LIMIT);
    expect(results).toHaveLength(12);
    expect(results.every(r => r.status === 'fulfilled')).toBe(true);
  });

  it('caps workers at task count when limit > tasks', async () => {
    const tasks = [async () => 1, async () => 2];
    const results = await parallelWithLimit(tasks, 100);
    expect(results.map(r => (r.status === 'fulfilled' ? r.value : null))).toEqual([
      1, 2,
    ]);
  });

  it('fills slots immediately when one task completes (no chunking)', async () => {
    // Three deferred tasks; we expect 2 to start immediately (limit=2),
    // and the 3rd to start as soon as one of the first two settles —
    // not waiting for the *slow* one.
    const d1 = deferred<string>();
    const d2 = deferred<string>();
    const d3 = deferred<string>();

    let started3 = false;

    const tasks = [
      () => d1.promise,
      () => d2.promise,
      () => {
        started3 = true;
        return d3.promise;
      },
    ];

    const run = parallelWithLimit(tasks, 2);

    // initial state: 2 started, 3rd not yet
    await Promise.resolve();
    expect(started3).toBe(false);

    // resolve the FAST one (d2), even though d1 (slow) is still pending
    d2.resolve('two');
    await Promise.resolve();
    await Promise.resolve();
    expect(started3).toBe(true);

    // wrap up
    d1.resolve('one');
    d3.resolve('three');
    const results = await run;
    expect(results.map(r => (r.status === 'fulfilled' ? r.value : null))).toEqual([
      'one',
      'two',
      'three',
    ]);
  });
});
