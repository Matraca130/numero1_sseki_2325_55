// ============================================================
// Axon -- Tests for useMediaQuery
//
// Exercises SSR guard, initial match, and live updates via the
// MediaQueryList 'change' event. window.matchMedia is mocked
// with a minimal implementation that supports addEventListener
// and manual dispatch.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from '@/app/hooks/useMediaQuery';

// ── matchMedia mock ─────────────────────────────────────────

interface MockMql {
  matches: boolean;
  media: string;
  onchange: null;
  listeners: Array<(e: MediaQueryListEvent) => void>;
  addEventListener: (type: string, cb: (e: MediaQueryListEvent) => void) => void;
  removeEventListener: (
    type: string,
    cb: (e: MediaQueryListEvent) => void,
  ) => void;
  addListener: (cb: (e: MediaQueryListEvent) => void) => void;
  removeListener: (cb: (e: MediaQueryListEvent) => void) => void;
  dispatchEvent: (e: MediaQueryListEvent) => boolean;
  __setMatches: (value: boolean) => void;
}

const mqlRegistry = new Map<string, MockMql>();

function createMockMql(query: string, initial: boolean): MockMql {
  const mql: MockMql = {
    matches: initial,
    media: query,
    onchange: null,
    listeners: [],
    addEventListener(type, cb) {
      if (type === 'change') this.listeners.push(cb);
    },
    removeEventListener(type, cb) {
      if (type === 'change') {
        this.listeners = this.listeners.filter((l) => l !== cb);
      }
    },
    addListener(cb) {
      this.listeners.push(cb);
    },
    removeListener(cb) {
      this.listeners = this.listeners.filter((l) => l !== cb);
    },
    dispatchEvent() {
      return true;
    },
    __setMatches(value: boolean) {
      this.matches = value;
      const evt = { matches: value, media: query } as MediaQueryListEvent;
      this.listeners.slice().forEach((cb) => cb(evt));
    },
  };
  return mql;
}

function installMatchMediaMock(defaultMatches = false) {
  mqlRegistry.clear();
  window.matchMedia = vi.fn((query: string) => {
    let mql = mqlRegistry.get(query);
    if (!mql) {
      mql = createMockMql(query, defaultMatches);
      mqlRegistry.set(query, mql);
    }
    return mql as unknown as MediaQueryList;
  });
}

beforeEach(() => {
  installMatchMediaMock(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useMediaQuery — initial state', () => {
  it('returns matchMedia(query).matches as initial value', () => {
    installMatchMediaMock(true);
    const { result } = renderHook(() => useMediaQuery(768));
    expect(result.current).toBe(true);
  });

  it('returns false when query does not match', () => {
    installMatchMediaMock(false);
    const { result } = renderHook(() => useMediaQuery(1024));
    expect(result.current).toBe(false);
  });

  it('builds a (min-width: Xpx) query', () => {
    renderHook(() => useMediaQuery(768));
    const mqlCall = (window.matchMedia as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(mqlCall).toBe('(min-width: 768px)');
  });
});

describe('useMediaQuery — reactive updates', () => {
  it('updates when the underlying MediaQueryList dispatches "change"', () => {
    const { result } = renderHook(() => useMediaQuery(768));
    expect(result.current).toBe(false);

    const mql = mqlRegistry.get('(min-width: 768px)');
    expect(mql).toBeDefined();
    act(() => {
      mql?.__setMatches(true);
    });
    expect(result.current).toBe(true);

    act(() => {
      mql?.__setMatches(false);
    });
    expect(result.current).toBe(false);
  });

  it('attaches a "change" listener and removes it on unmount', () => {
    const { unmount } = renderHook(() => useMediaQuery(768));
    const mql = mqlRegistry.get('(min-width: 768px)');
    expect(mql?.listeners.length).toBe(1);
    unmount();
    expect(mql?.listeners.length).toBe(0);
  });

  it('re-subscribes when breakpoint changes', () => {
    const { rerender } = renderHook(
      ({ bp }: { bp: number }) => useMediaQuery(bp),
      { initialProps: { bp: 768 } },
    );
    expect(mqlRegistry.get('(min-width: 768px)')?.listeners.length).toBe(1);

    rerender({ bp: 1024 });
    expect(mqlRegistry.get('(min-width: 768px)')?.listeners.length).toBe(0);
    expect(mqlRegistry.get('(min-width: 1024px)')?.listeners.length).toBe(1);
  });
});

describe('useMediaQuery — fallback path for old Safari', () => {
  it('falls back to addListener when addEventListener is absent', () => {
    // Replace matchMedia with a version that lacks addEventListener.
    const listeners: Array<(e: MediaQueryListEvent) => void> = [];
    window.matchMedia = vi.fn((query: string) => {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: (cb: (e: MediaQueryListEvent) => void) => {
          listeners.push(cb);
        },
        removeListener: (cb: (e: MediaQueryListEvent) => void) => {
          const i = listeners.indexOf(cb);
          if (i !== -1) listeners.splice(i, 1);
        },
        // addEventListener intentionally missing
        dispatchEvent: () => true,
      } as unknown as MediaQueryList;
    });

    const { unmount } = renderHook(() => useMediaQuery(480));
    expect(listeners.length).toBe(1);
    unmount();
    expect(listeners.length).toBe(0);
  });
});
