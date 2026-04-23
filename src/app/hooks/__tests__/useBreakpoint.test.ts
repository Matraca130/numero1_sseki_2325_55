// ============================================================
// Axon -- Tests for useBreakpoint + useIsMobileBreakpoint
//
// Tailwind-style breakpoints (sm/md/lg/xl) via matchMedia.
// SSR default = true (desktop-first). jsdom mock mirrors a
// MediaQueryList with addEventListener('change', cb).
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useBreakpoint,
  useIsMobileBreakpoint,
  BREAKPOINTS,
} from '@/app/hooks/useBreakpoint';

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

beforeEach(() => {
  installMatchMediaMock(() => false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BREAKPOINTS', () => {
  it('matches Tailwind defaults', () => {
    expect(BREAKPOINTS.sm).toBe(640);
    expect(BREAKPOINTS.md).toBe(768);
    expect(BREAKPOINTS.lg).toBe(1024);
    expect(BREAKPOINTS.xl).toBe(1280);
  });
});

describe('useBreakpoint', () => {
  it('builds (min-width: Xpx) query for "md"', () => {
    renderHook(() => useBreakpoint('md'));
    const q = (window.matchMedia as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(q).toBe('(min-width: 768px)');
  });

  it('builds (min-width: 1280px) for "xl"', () => {
    renderHook(() => useBreakpoint('xl'));
    const q = (window.matchMedia as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(q).toBe('(min-width: 1280px)');
  });

  it('returns initial match from matchMedia', () => {
    installMatchMediaMock(() => true);
    const { result } = renderHook(() => useBreakpoint('lg'));
    expect(result.current).toBe(true);
  });

  it('returns false when matchMedia reports false', () => {
    installMatchMediaMock(() => false);
    const { result } = renderHook(() => useBreakpoint('lg'));
    expect(result.current).toBe(false);
  });

  it('updates when MediaQueryList dispatches "change"', () => {
    const { result } = renderHook(() => useBreakpoint('lg'));
    expect(result.current).toBe(false);

    const mql = mqlRegistry.get('(min-width: 1024px)');
    act(() => {
      mql?.__setMatches(true);
    });
    expect(result.current).toBe(true);
  });

  it('removes the listener on unmount', () => {
    const { unmount } = renderHook(() => useBreakpoint('sm'));
    const mql = mqlRegistry.get('(min-width: 640px)');
    expect(mql?.listeners.length).toBe(1);
    unmount();
    expect(mql?.listeners.length).toBe(0);
  });
});

describe('useIsMobileBreakpoint', () => {
  it('returns TRUE when viewport < lg', () => {
    installMatchMediaMock((q) =>
      q === '(min-width: 1024px)' ? false : true,
    );
    const { result } = renderHook(() => useIsMobileBreakpoint());
    expect(result.current).toBe(true);
  });

  it('returns FALSE when viewport >= lg', () => {
    installMatchMediaMock(() => true);
    const { result } = renderHook(() => useIsMobileBreakpoint());
    expect(result.current).toBe(false);
  });

  it('reacts to "change" events on the lg query', () => {
    installMatchMediaMock(() => false);
    const { result } = renderHook(() => useIsMobileBreakpoint());
    expect(result.current).toBe(true); // viewport is < lg

    const mql = mqlRegistry.get('(min-width: 1024px)');
    act(() => {
      mql?.__setMatches(true); // now viewport >= lg
    });
    expect(result.current).toBe(false);
  });
});
