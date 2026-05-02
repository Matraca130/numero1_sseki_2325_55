// ============================================================
// Tests — useMobileHint (Cycle 62 extraction)
//
// Covers the sessionStorage-backed mobile-hint timer extracted
// from KnowledgeGraph.tsx:
//   - Initial visibility from sessionStorage (present vs absent)
//   - Effect arming predicate: ready && nodeCount > 0 && showHint
//   - Auto-dismiss after 4000ms: state flips + flag is written
//   - Timer cleanup on unmount
//   - Timer cleanup on dep change before fire
//   - dismiss() imperative path (same effects + clears pending timer)
//   - Re-mount with flag set keeps the hint hidden
//   - storageHelpers integration (uses safeGetItem / safeSetItem)
//   - Source contract (file shape, exports, signature)
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// In-memory Storage stub. Mirrors the shape used in storageHelpers.test.ts.
class MemStorage {
  store = new Map<string, string>();
  getItem(k: string): string | null {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.store.set(k, String(v));
  }
  removeItem(k: string): void {
    this.store.delete(k);
  }
  clear(): void {
    this.store.clear();
  }
  key(i: number): string | null {
    return Array.from(this.store.keys())[i] ?? null;
  }
  get length(): number {
    return this.store.size;
  }
}

let memSession: MemStorage;
let memLocal: MemStorage;

beforeEach(() => {
  memSession = new MemStorage();
  memLocal = new MemStorage();
  vi.stubGlobal('sessionStorage', memSession);
  vi.stubGlobal('localStorage', memLocal);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// Import AFTER the stubs so we know the helpers will see them.
import { useMobileHint, MOBILE_HINT_KEY } from '../useMobileHint';

const SOURCE_PATH = resolve(__dirname, '..', 'useMobileHint.ts');
const source = readFileSync(SOURCE_PATH, 'utf-8');

// ── Initial state ──────────────────────────────────────────

describe('useMobileHint — initial state', () => {
  it('exports MOBILE_HINT_KEY = axon_map_mobile_hint_seen (preserved from KnowledgeGraph)', () => {
    expect(MOBILE_HINT_KEY).toBe('axon_map_mobile_hint_seen');
  });

  it('showHint starts true when the sessionStorage flag is absent', () => {
    const { result } = renderHook(() => useMobileHint({ ready: false, nodeCount: 0 }));
    expect(result.current.showHint).toBe(true);
  });

  it('showHint starts false when the sessionStorage flag is present', () => {
    memSession.setItem(MOBILE_HINT_KEY, '1');
    const { result } = renderHook(() => useMobileHint({ ready: false, nodeCount: 0 }));
    expect(result.current.showHint).toBe(false);
  });

  it('initial read uses sessionStorage (not localStorage)', () => {
    // Setting localStorage with the same key must NOT hide the hint.
    memLocal.setItem(MOBILE_HINT_KEY, '1');
    const { result } = renderHook(() => useMobileHint({ ready: false, nodeCount: 0 }));
    expect(result.current.showHint).toBe(true);
  });

  it('returns a stable shape: { showHint, dismiss }', () => {
    const { result } = renderHook(() => useMobileHint({ ready: false, nodeCount: 0 }));
    expect(typeof result.current.showHint).toBe('boolean');
    expect(typeof result.current.dismiss).toBe('function');
  });

  it('dismiss is referentially stable across re-renders (useCallback with [])', () => {
    const { result, rerender } = renderHook(
      (props: { ready: boolean; nodeCount: number }) => useMobileHint(props),
      { initialProps: { ready: false, nodeCount: 0 } },
    );
    const dismiss1 = result.current.dismiss;
    rerender({ ready: true, nodeCount: 3 });
    expect(result.current.dismiss).toBe(dismiss1);
  });
});

// ── Effect arming predicate ────────────────────────────────

describe('useMobileHint — effect arming', () => {
  it('does not arm timer while !ready (no auto-dismiss)', () => {
    const { result } = renderHook(() => useMobileHint({ ready: false, nodeCount: 5 }));
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(result.current.showHint).toBe(true);
  });

  it('does not arm timer while nodeCount <= 0', () => {
    const { result } = renderHook(() => useMobileHint({ ready: true, nodeCount: 0 }));
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(result.current.showHint).toBe(true);
  });

  it('does not arm timer when showHint is already false (idempotent)', () => {
    memSession.setItem(MOBILE_HINT_KEY, '1');
    const setSpy = vi.spyOn(memSession, 'setItem');
    const { result } = renderHook(() => useMobileHint({ ready: true, nodeCount: 5 }));
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(result.current.showHint).toBe(false);
    // No second write of '1' should occur — the predicate excludes it.
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('arms timer when ready && nodeCount > 0 && showHint=true', () => {
    const { result } = renderHook(() => useMobileHint({ ready: true, nodeCount: 1 }));
    expect(result.current.showHint).toBe(true);
    act(() => { vi.advanceTimersByTime(3_999); });
    // Just before fire — still visible.
    expect(result.current.showHint).toBe(true);
  });
});

// ── Auto-dismiss after 4 seconds ───────────────────────────

describe('useMobileHint — auto-dismiss timer', () => {
  it('flips showHint to false after exactly 4000ms', () => {
    const { result } = renderHook(() => useMobileHint({ ready: true, nodeCount: 5 }));
    expect(result.current.showHint).toBe(true);
    act(() => { vi.advanceTimersByTime(4_000); });
    expect(result.current.showHint).toBe(false);
  });

  it('writes the seen flag to sessionStorage when the timer fires', () => {
    renderHook(() => useMobileHint({ ready: true, nodeCount: 5 }));
    expect(memSession.getItem(MOBILE_HINT_KEY)).toBeNull();
    act(() => { vi.advanceTimersByTime(4_000); });
    expect(memSession.getItem(MOBILE_HINT_KEY)).toBe('1');
  });

  it('does NOT write to localStorage on auto-dismiss', () => {
    renderHook(() => useMobileHint({ ready: true, nodeCount: 5 }));
    act(() => { vi.advanceTimersByTime(4_000); });
    expect(memLocal.getItem(MOBILE_HINT_KEY)).toBeNull();
  });

  it('the timer is a single fire (not a repeating interval)', () => {
    const { result } = renderHook(() => useMobileHint({ ready: true, nodeCount: 5 }));
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(result.current.showHint).toBe(false);
    // No further effect should reschedule a timer once showHint is false.
    expect(vi.getTimerCount()).toBe(0);
  });
});

// ── Cleanup on unmount / dep change ────────────────────────

describe('useMobileHint — cleanup', () => {
  it('clears the pending timer on unmount (no setItem after unmount)', () => {
    const setSpy = vi.spyOn(memSession, 'setItem');
    const { unmount } = renderHook(() => useMobileHint({ ready: true, nodeCount: 5 }));
    unmount();
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(setSpy).not.toHaveBeenCalled();
    expect(memSession.getItem(MOBILE_HINT_KEY)).toBeNull();
  });

  it('clears the pending timer when ready flips back to false', () => {
    const setSpy = vi.spyOn(memSession, 'setItem');
    const { result, rerender } = renderHook(
      (props: { ready: boolean; nodeCount: number }) => useMobileHint(props),
      { initialProps: { ready: true, nodeCount: 5 } },
    );
    // Advance halfway, then flip ready off.
    act(() => { vi.advanceTimersByTime(2_000); });
    rerender({ ready: false, nodeCount: 5 });
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(result.current.showHint).toBe(true);
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('clears the pending timer when nodeCount drops to zero', () => {
    const { result, rerender } = renderHook(
      (props: { ready: boolean; nodeCount: number }) => useMobileHint(props),
      { initialProps: { ready: true, nodeCount: 5 } },
    );
    act(() => { vi.advanceTimersByTime(2_000); });
    rerender({ ready: true, nodeCount: 0 });
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(result.current.showHint).toBe(true);
    expect(memSession.getItem(MOBILE_HINT_KEY)).toBeNull();
  });

  it('reschedules a fresh 4s timer when deps change before fire (no early dismissal)', () => {
    const { result, rerender } = renderHook(
      (props: { ready: boolean; nodeCount: number }) => useMobileHint(props),
      { initialProps: { ready: true, nodeCount: 5 } },
    );
    // Advance 3.5s, then change nodeCount — old timer cleared, new one scheduled.
    act(() => { vi.advanceTimersByTime(3_500); });
    rerender({ ready: true, nodeCount: 10 });
    // 1s in — original timer would have fired by now if not cleared.
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(result.current.showHint).toBe(true);
    // Another 3s and the fresh timer reaches 4s.
    act(() => { vi.advanceTimersByTime(3_000); });
    expect(result.current.showHint).toBe(false);
  });
});

// ── dismiss() imperative path ──────────────────────────────

describe('useMobileHint — dismiss()', () => {
  it('flips showHint to false immediately', () => {
    const { result } = renderHook(() => useMobileHint({ ready: true, nodeCount: 5 }));
    expect(result.current.showHint).toBe(true);
    act(() => { result.current.dismiss(); });
    expect(result.current.showHint).toBe(false);
  });

  it('writes the seen flag to sessionStorage on dismiss', () => {
    const { result } = renderHook(() => useMobileHint({ ready: true, nodeCount: 5 }));
    act(() => { result.current.dismiss(); });
    expect(memSession.getItem(MOBILE_HINT_KEY)).toBe('1');
  });

  it('clears the pending auto-dismiss timer (no double-write)', () => {
    const setSpy = vi.spyOn(memSession, 'setItem');
    const { result } = renderHook(() => useMobileHint({ ready: true, nodeCount: 5 }));
    act(() => { vi.advanceTimersByTime(2_000); });
    act(() => { result.current.dismiss(); });
    // Advance past the would-be timer fire — no second setItem call.
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith(MOBILE_HINT_KEY, '1');
  });

  it('is safe to call when no timer is pending (e.g. !ready)', () => {
    const { result } = renderHook(() => useMobileHint({ ready: false, nodeCount: 0 }));
    expect(() => act(() => { result.current.dismiss(); })).not.toThrow();
    expect(result.current.showHint).toBe(false);
    expect(memSession.getItem(MOBILE_HINT_KEY)).toBe('1');
  });

  it('is idempotent across multiple calls', () => {
    const { result } = renderHook(() => useMobileHint({ ready: true, nodeCount: 5 }));
    act(() => { result.current.dismiss(); });
    act(() => { result.current.dismiss(); });
    expect(result.current.showHint).toBe(false);
    expect(memSession.getItem(MOBILE_HINT_KEY)).toBe('1');
  });
});

// ── Re-mount with flag set ─────────────────────────────────

describe('useMobileHint — persistence across mounts', () => {
  it('after auto-dismiss, a fresh mount sees showHint=false', () => {
    const first = renderHook(() => useMobileHint({ ready: true, nodeCount: 5 }));
    act(() => { vi.advanceTimersByTime(4_000); });
    first.unmount();
    const second = renderHook(() => useMobileHint({ ready: true, nodeCount: 5 }));
    expect(second.result.current.showHint).toBe(false);
  });

  it('after dismiss(), a fresh mount sees showHint=false', () => {
    const first = renderHook(() => useMobileHint({ ready: true, nodeCount: 5 }));
    act(() => { first.result.current.dismiss(); });
    first.unmount();
    const second = renderHook(() => useMobileHint({ ready: true, nodeCount: 5 }));
    expect(second.result.current.showHint).toBe(false);
  });

  it('clearing the storage between mounts re-shows the hint (defensive)', () => {
    const first = renderHook(() => useMobileHint({ ready: true, nodeCount: 5 }));
    act(() => { first.result.current.dismiss(); });
    first.unmount();
    memSession.clear();
    const second = renderHook(() => useMobileHint({ ready: false, nodeCount: 0 }));
    expect(second.result.current.showHint).toBe(true);
  });
});

// ── storageHelpers integration ─────────────────────────────

describe('useMobileHint — storageHelpers integration', () => {
  it('survives a sessionStorage.getItem that throws (Safari private mode)', () => {
    // Force getItem to throw, then mount.
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    });
    const { result } = renderHook(() => useMobileHint({ ready: false, nodeCount: 0 }));
    // safeGetItem swallows → returns null → !null → true.
    expect(result.current.showHint).toBe(true);
  });

  it('survives a sessionStorage.setItem that throws (QuotaExceeded)', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError'); },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    });
    const { result } = renderHook(() => useMobileHint({ ready: true, nodeCount: 5 }));
    expect(() => act(() => { vi.advanceTimersByTime(4_000); })).not.toThrow();
    // State still updates locally even though the persistence failed.
    expect(result.current.showHint).toBe(false);
  });
});

// ── Source contract ────────────────────────────────────────

describe('useMobileHint — source contract', () => {
  it('exports useMobileHint', () => {
    expect(source).toMatch(/export\s+function\s+useMobileHint/);
  });

  it('exports MOBILE_HINT_KEY const at module scope', () => {
    expect(source).toMatch(/export\s+const\s+MOBILE_HINT_KEY\s*=\s*'axon_map_mobile_hint_seen'/);
  });

  it('exports the option / result interfaces', () => {
    expect(source).toMatch(/export\s+interface\s+UseMobileHintOptions/);
    expect(source).toMatch(/export\s+interface\s+UseMobileHintResult/);
  });

  it('imports the scalar storage helpers from ./storageHelpers', () => {
    expect(source).toMatch(/import\s*\{[^}]*safeGetItem[^}]*\}\s*from\s*['"]\.\/storageHelpers['"]/);
    expect(source).toMatch(/import\s*\{[^}]*safeSetItem[^}]*\}\s*from\s*['"]\.\/storageHelpers['"]/);
  });

  it('reads the flag via safeGetItem with sessionStorage', () => {
    expect(source).toMatch(/safeGetItem\(MOBILE_HINT_KEY,\s*sessionStorage\)/);
  });

  it("writes the flag via safeSetItem with '1' and sessionStorage", () => {
    expect(source).toMatch(/safeSetItem\(MOBILE_HINT_KEY,\s*'1',\s*sessionStorage\)/);
  });

  it('uses a 4000ms setTimeout for auto-dismiss', () => {
    expect(source).toMatch(/setTimeout\([\s\S]{0,400},\s*4000\)/);
  });

  it('cleans up the timer in the effect return', () => {
    expect(source).toMatch(/return\s*\(\)\s*=>\s*\{[\s\S]{0,200}clearTimeout\(hintTimer\)/);
  });

  it('depends on [ready, nodeCount, showHint] (cycle 62 predicate)', () => {
    expect(source).toMatch(/\},\s*\[ready,\s*nodeCount,\s*showHint\]\)/);
  });

  it('does NOT use raw sessionStorage.getItem / setItem (delegated to helpers)', () => {
    expect(source).not.toMatch(/sessionStorage\.getItem\(/);
    expect(source).not.toMatch(/sessionStorage\.setItem\(/);
  });
});
