// ============================================================
// Axon -- Tests for concurrency.ts (parallelWithLimit)
//
// Covers:
//   - concurrency cap enforcement (never exceed limit)
//   - FIFO task start order
//   - result order matches input order
//   - rejection captured in allSettled shape
//   - fulfilled/rejected mixture
//   - limit > tasks.length handled
//   - empty task list
// ============================================================

import { describe, it, expect } from 'vitest';

import { parallelWithLimit } from '@/app/lib/concurrency';

// ── Helpers ───────────────────────────────────────────────

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

// ================================================================

describe('parallelWithLimit', () => {
  it('returns empty array when given no tasks', async () => {
    const result = await parallelWithLimit([], 5);
    expect(result).toEqual([]);
  });

  it('runs all tasks and returns results in input order', async () => {
    const tasks = [
      () => Promise.resolve('a'),
      () => Promise.resolve('b'),
      () => Promise.resolve('c'),
    ];
    const result = await parallelWithLimit(tasks, 2);
    expect(result).toEqual([
      { status: 'fulfilled', value: 'a' },
      { status: 'fulfilled', value: 'b' },
      { status: 'fulfilled', value: 'c' },
    ]);
  });

  it('captures rejected tasks as allSettled shape', async () => {
    const err = new Error('boom');
    const tasks = [
      () => Promise.resolve(1),
      () => Promise.reject(err),
      () => Promise.resolve(3),
    ];
    const result = await parallelWithLimit(tasks, 2);
    expect(result[0]).toEqual({ status: 'fulfilled', value: 1 });
    expect(result[1]).toEqual({ status: 'rejected', reason: err });
    expect(result[2]).toEqual({ status: 'fulfilled', value: 3 });
  });

  it('never exceeds the concurrency limit', async () => {
    const limit = 3;
    let running = 0;
    let peak = 0;

    const tasks = Array.from({ length: 10 }, () => async () => {
      running++;
      peak = Math.max(peak, running);
      await delay(5);
      running--;
      return 'ok';
    });

    await parallelWithLimit(tasks, limit);
    expect(peak).toBeLessThanOrEqual(limit);
    expect(peak).toBeGreaterThan(0);
  });

  it('fills worker slots immediately when a task completes (no chunk-barrier)', async () => {
    // Three tasks. With limit=2, a and b start. If a finishes first,
    // c should start BEFORE b finishes. If we were chunking, c would
    // only start once BOTH a and b finished.
    const a = deferred<string>();
    const b = deferred<string>();
    const c = deferred<string>();

    const started: string[] = [];

    const tasks = [
      async () => {
        started.push('a');
        return a.promise;
      },
      async () => {
        started.push('b');
        return b.promise;
      },
      async () => {
        started.push('c');
        return c.promise;
      },
    ];

    const resultP = parallelWithLimit(tasks, 2);

    // Yield so microtasks flush
    await Promise.resolve();
    await Promise.resolve();

    // a and b should have started; c should NOT have started yet
    expect(started).toEqual(['a', 'b']);

    // Resolve a -> slot opens, c should start
    a.resolve('A');
    await Promise.resolve();
    await Promise.resolve();
    expect(started).toEqual(['a', 'b', 'c']);

    // Resolve the rest
    b.resolve('B');
    c.resolve('C');

    const result = await resultP;
    expect(result).toEqual([
      { status: 'fulfilled', value: 'A' },
      { status: 'fulfilled', value: 'B' },
      { status: 'fulfilled', value: 'C' },
    ]);
  });

  it('starts tasks in FIFO order', async () => {
    const started: number[] = [];
    const gates = [deferred(), deferred(), deferred(), deferred(), deferred()];
    const tasks = gates.map((g, i) => async () => {
      started.push(i);
      await g.promise;
      return i;
    });

    const p = parallelWithLimit(tasks, 2);

    // Let the first two start.
    await Promise.resolve();
    await Promise.resolve();
    expect(started).toEqual([0, 1]);

    // Release them one at a time and check order.
    gates[0].resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(started[2]).toBe(2);

    gates[1].resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(started[3]).toBe(3);

    gates[2].resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(started[4]).toBe(4);

    gates[3].resolve();
    gates[4].resolve();
    await p;
    expect(started).toEqual([0, 1, 2, 3, 4]);
  });

  it('handles limit greater than tasks.length gracefully', async () => {
    const tasks = [
      () => Promise.resolve(1),
      () => Promise.resolve(2),
    ];
    const result = await parallelWithLimit(tasks, 100);
    expect(result.map((r) => (r.status === 'fulfilled' ? r.value : null))).toEqual([1, 2]);
  });

  it('returns results in input order even when tasks complete out of order', async () => {
    const tasks = [
      () => delay(30).then(() => 'slow-first'),
      () => delay(1).then(() => 'fast-second'),
      () => delay(15).then(() => 'medium-third'),
    ];
    const result = await parallelWithLimit(tasks, 3);
    expect(result).toEqual([
      { status: 'fulfilled', value: 'slow-first' },
      { status: 'fulfilled', value: 'fast-second' },
      { status: 'fulfilled', value: 'medium-third' },
    ]);
  });

  it('handles sync throws inside task factories as rejections', async () => {
    const tasks = [
      () => Promise.resolve(1),
      // Throws synchronously before returning a promise. Because
      // parallelWithLimit awaits the *return* of the task call,
      // a synchronous throw propagates into the try/catch block.
      (() => {
        throw new Error('sync-fail');
      }) as () => Promise<number>,
      () => Promise.resolve(3),
    ];
    const result = await parallelWithLimit(tasks, 2);
    expect(result[0]).toEqual({ status: 'fulfilled', value: 1 });
    expect(result[1].status).toBe('rejected');
    expect(result[2]).toEqual({ status: 'fulfilled', value: 3 });
  });

  it('respects limit of 1 (serial execution)', async () => {
    let running = 0;
    let peak = 0;
    const tasks = Array.from({ length: 5 }, () => async () => {
      running++;
      peak = Math.max(peak, running);
      await delay(2);
      running--;
      return 'x';
    });

    await parallelWithLimit(tasks, 1);
    expect(peak).toBe(1);
  });
});
