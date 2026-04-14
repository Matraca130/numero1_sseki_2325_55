// ============================================================
// Contract test — useFullscreen
//
// Validates the fullscreen hook's exports, DOM interaction
// patterns, sessionStorage usage, and cleanup logic.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE_PATH = resolve(__dirname, '..', 'useFullscreen.ts');
const source = readFileSync(SOURCE_PATH, 'utf-8');

// ── Module exports ──────────────────────────────────────────

describe('useFullscreen module contract', () => {
  it('exports useFullscreen hook', () => {
    expect(source).toContain('export function useFullscreen');
  });

  it('exports UseFullscreenReturn interface', () => {
    expect(source).toContain('export interface UseFullscreenReturn');
  });

  it('returns isFullscreen state', () => {
    expect(source).toContain('isFullscreen');
  });

  it('returns toggleFullscreen function', () => {
    expect(source).toContain('toggleFullscreen');
  });

  it('returns fullscreenRef', () => {
    expect(source).toContain('fullscreenRef');
  });
});

// ── Fullscreen API ──────────────────────────────────────────

describe('Fullscreen API usage', () => {
  it('uses requestFullscreen API', () => {
    expect(source).toContain('requestFullscreen');
  });

  it('listens for fullscreenchange event', () => {
    expect(source).toContain('fullscreenchange');
  });

  it('checks document.fullscreenElement', () => {
    expect(source).toContain('document.fullscreenElement');
  });
});

// ── Ancestor transform workaround ───────────────────────────

describe('ancestor transform clearing', () => {
  it('defines clearAncestorTransforms utility', () => {
    expect(source).toContain('function clearAncestorTransforms');
  });

  it('checks getComputedStyle for transform', () => {
    expect(source).toContain('getComputedStyle');
    expect(source).toContain('.transform');
  });

  it('sets transform to none with important flag', () => {
    expect(source).toContain("'none', 'important'");
  });

  it('returns a cleanup function that restores styles', () => {
    expect(source).toContain('saved');
  });
});

// ── SessionStorage persistence ──────────────────────────────

describe('sessionStorage persistence', () => {
  it('stores fullscreen state in sessionStorage', () => {
    expect(source).toContain('axon_map_fullscreen');
  });

  it('uses try/catch around sessionStorage access', () => {
    const tryCatches = source.match(/try\s*\{[^}]*sessionStorage/g);
    expect(tryCatches).not.toBeNull();
    expect(tryCatches!.length).toBeGreaterThanOrEqual(2);
  });

  it('removes sessionStorage key on exit', () => {
    expect(source).toContain("sessionStorage.removeItem('axon_map_fullscreen')");
  });

  it('restores fullscreen on mount if sessionStorage flag is set', () => {
    expect(source).toContain("sessionStorage.getItem('axon_map_fullscreen')");
  });
});

// ── Cleanup ─────────────────────────────────────────────────

describe('cleanup patterns', () => {
  it('removes event listener on cleanup', () => {
    expect(source).toContain('removeEventListener');
  });

  it('relies on fullscreenchange event for ESC handling', () => {
    expect(source).toContain('fullscreenchange');
  });
});
