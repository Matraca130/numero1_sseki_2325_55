// ============================================================
// Axon -- Tests for useIsMobile
//
// Default breakpoint: 1024px. Query uses (max-width: 1023px)
// so the initial read uses window.innerWidth and the live
// update comes from the 'change' event.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '@/app/hooks/useIsMobile';

interface MockMql {
  matches: boolean;
  media: string;
  listeners: Array<(e: MediaQueryListEvent) => void>;
  addEventListener: (type: string, cb: (e: MediaQueryListEvent) => void) => void;
  removeEventListener: (
    type: string,
    cb: (e: MediaQueryListEvent) => void,
  ) => void;
  __setMatches: (value: boolean) => void;
}

const mqlRegistry = new Map<string, MockMql>();

function installMatchMediaMock(matchesPredicate: (query: string) => boolean) {
  mqlRegistry.clear();
  window.matchMedia = vi.fn((query: string) => {
    let mql = mqlRegistry.get(query);
    if (!mql) {
      mql = {
        matches: matchesPredicate(query),
        media: query,
        listeners: [],
        addEventListener(type, cb) {
          if (type === 'change') this.listeners.push(cb);
        },
        removeEventListener(type, cb) {
          if (type === 'change') {
            this.listeners = this.listeners.filter((l) => l !== cb);
          }
        },
        __setMatches(value: boolean) {
          this.matches = value;
          const evt = { matches: value, media: query } as MediaQueryListEvent;
          this.listeners.slice().forEach((cb) => cb(evt));
        },
      };
      mqlRegistry.set(query, mql);
    }
    return mql as unknown as MediaQueryList;
  });
}

function setInnerWidth(px: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: px,
  });
}

beforeEach(() => {
  installMatchMediaMock(() => false);
  setInnerWidth(1440); // default: desktop-ish
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useIsMobile — default breakpoint (1024)', () => {
  it('initial state is based on window.innerWidth (desktop)', () => {
    setInnerWidth(1440);
    installMatchMediaMock(() => false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('initial state is TRUE when innerWidth < 1024', () => {
    setInnerWidth(800);
    installMatchMediaMock(() => true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('builds (max-width: 1023px) query', () => {
    renderHook(() => useIsMobile());
    const q = (window.matchMedia as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(q).toBe('(max-width: 1023px)');
  });
});

describe('useIsMobile — custom breakpoint', () => {
  it('builds (max-width: 767px) for breakpoint=768', () => {
    renderHook(() => useIsMobile(768));
    const q = (window.matchMedia as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(q).toBe('(max-width: 767px)');
  });

  it('re-subscribes when breakpoint prop changes', () => {
    const { rerender } = renderHook(
      ({ bp }: { bp: number }) => useIsMobile(bp),
      { initialProps: { bp: 1024 } },
    );
    expect(mqlRegistry.get('(max-width: 1023px)')?.listeners.length).toBe(1);

    rerender({ bp: 768 });
    expect(mqlRegistry.get('(max-width: 1023px)')?.listeners.length).toBe(0);
    expect(mqlRegistry.get('(max-width: 767px)')?.listeners.length).toBe(1);
  });
});

describe('useIsMobile — reactive updates', () => {
  it('updates when the MediaQueryList dispatches "change"', () => {
    setInnerWidth(1440);
    installMatchMediaMock(() => false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    const mql = mqlRegistry.get('(max-width: 1023px)');
    act(() => {
      mql?.__setMatches(true);
    });
    expect(result.current).toBe(true);

    act(() => {
      mql?.__setMatches(false);
    });
    expect(result.current).toBe(false);
  });

  it('syncs to mql.matches on mount (overrides innerWidth-based initial)', () => {
    // innerWidth says desktop, but matchMedia says mobile -> effect syncs.
    setInnerWidth(1440);
    installMatchMediaMock(() => true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('removes the listener on unmount', () => {
    const { unmount } = renderHook(() => useIsMobile());
    const mql = mqlRegistry.get('(max-width: 1023px)');
    expect(mql?.listeners.length).toBe(1);
    unmount();
    expect(mql?.listeners.length).toBe(0);
  });
});
