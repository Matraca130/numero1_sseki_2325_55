// ============================================================
// Tests — useGraphInit pure helpers (warnIfNotDestroyed, createBatchDraw)
//
// Cycle 7 extracted computeNodeStyle/computeEdgeStyle to graphStyles.ts.
// This file covers the remaining pure helpers with real execution
// (not source-string contract checks).
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MutableRefObject } from 'react';
import { warnIfNotDestroyed, createBatchDraw } from '../useGraphInit';

// ── warnIfNotDestroyed ──────────────────────────────────────

describe('warnIfNotDestroyed', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('swallows Error whose message contains "destroyed"', () => {
    const err = new Error('graph was destroyed during teardown');
    warnIfNotDestroyed(err);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns on real Error without "destroyed" in message (DEV only)', () => {
    const err = new Error('unexpected render failure');
    warnIfNotDestroyed(err);
    // import.meta.env.DEV is true in vitest by default
    expect(warnSpy).toHaveBeenCalledWith('[KnowledgeGraph]', err);
  });

  it('warns on non-Error values (strings, objects)', () => {
    warnIfNotDestroyed('string error');
    warnIfNotDestroyed({ weird: 'object' });
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('is case-sensitive when matching "destroyed"', () => {
    const err = new Error('DESTROYED (uppercase)');
    warnIfNotDestroyed(err);
    // "destroyed" (lowercase) not in the message → should warn
    expect(warnSpy).toHaveBeenCalled();
  });
});

// ── createBatchDraw ─────────────────────────────────────────

describe('createBatchDraw', () => {
  it('schedules draw inside requestAnimationFrame', () => {
    const draw = vi.fn();
    const graphRef = { current: { draw, destroyed: false } } as any;
    const pendingRef: MutableRefObject<boolean> = { current: false };

    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');
    const batch = createBatchDraw(graphRef, pendingRef);
    batch();

    expect(rafSpy).toHaveBeenCalledTimes(1);
    rafSpy.mockRestore();
  });

  it('sets pending flag synchronously to prevent re-entry', () => {
    const draw = vi.fn();
    const graphRef = { current: { draw, destroyed: false } } as any;
    const pendingRef: MutableRefObject<boolean> = { current: false };

    const batch = createBatchDraw(graphRef, pendingRef);
    batch();
    expect(pendingRef.current).toBe(true);
  });

  it('coalesces multiple batch() calls into a single raf', () => {
    const draw = vi.fn();
    const graphRef = { current: { draw, destroyed: false } } as any;
    const pendingRef: MutableRefObject<boolean> = { current: false };

    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');
    const batch = createBatchDraw(graphRef, pendingRef);
    batch();
    batch();
    batch();
    expect(rafSpy).toHaveBeenCalledTimes(1);
    rafSpy.mockRestore();
  });

  it('actually draws on the scheduled frame and resets flag', async () => {
    const draw = vi.fn();
    const graphRef = { current: { draw, destroyed: false } } as any;
    const pendingRef: MutableRefObject<boolean> = { current: false };

    const batch = createBatchDraw(graphRef, pendingRef);
    batch();
    // Flush pending raf
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

    expect(draw).toHaveBeenCalledTimes(1);
    expect(pendingRef.current).toBe(false);
  });

  it('skips draw when graph is destroyed', async () => {
    const draw = vi.fn();
    const graphRef = { current: { draw, destroyed: true } } as any;
    const pendingRef: MutableRefObject<boolean> = { current: false };

    const batch = createBatchDraw(graphRef, pendingRef);
    batch();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

    expect(draw).not.toHaveBeenCalled();
    expect(pendingRef.current).toBe(false);
  });

  it('skips draw when graphRef.current is null (unmounted)', async () => {
    const graphRef = { current: null } as any;
    const pendingRef: MutableRefObject<boolean> = { current: false };

    const batch = createBatchDraw(graphRef, pendingRef);
    batch();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

    expect(pendingRef.current).toBe(false);
  });

  it('allows a second batch after first raf resolves', async () => {
    const draw = vi.fn();
    const graphRef = { current: { draw, destroyed: false } } as any;
    const pendingRef: MutableRefObject<boolean> = { current: false };

    const batch = createBatchDraw(graphRef, pendingRef);
    batch();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    batch();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

    expect(draw).toHaveBeenCalledTimes(2);
  });
});
