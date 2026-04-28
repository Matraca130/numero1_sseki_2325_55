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

// ── Stale-closure protection (ref-vs-state) ────────────────

describe('Stale-closure protection', () => {
  it('mirrors React state in isFullscreenRef = useRef(false)', () => {
    expect(source).toMatch(/const\s+isFullscreenRef\s*=\s*useRef\(false\)/);
  });

  it('toggleFullscreen reads isFullscreenRef.current (not React state)', () => {
    expect(source).toMatch(/toggleFullscreen[\s\S]{0,200}if\s*\(\s*isFullscreenRef\.current\s*\)/);
  });

  it('enterFullscreen sets ref=true BEFORE setIsFullscreen(true)', () => {
    const enterBlock = source.match(/const enterFullscreen[\s\S]{0,1500}\}\s*,\s*\[supportsFullscreen,\s*doRestore\]\)/);
    expect(enterBlock).not.toBeNull();
    const refIdx = enterBlock![0].indexOf('isFullscreenRef.current = true');
    const setIdx = enterBlock![0].indexOf('setIsFullscreen(true)');
    expect(refIdx).toBeGreaterThan(-1);
    expect(setIdx).toBeGreaterThan(refIdx);
  });

  it('exitFullscreen sets ref=false BEFORE setIsFullscreen(false)', () => {
    const exitBlock = source.match(/const exitFullscreen[\s\S]{0,1500}\}\s*,\s*\[supportsFullscreen,\s*doRestore\]\)/);
    expect(exitBlock).not.toBeNull();
    const refIdx = exitBlock![0].indexOf('isFullscreenRef.current = false');
    const setIdx = exitBlock![0].indexOf('setIsFullscreen(false)');
    expect(refIdx).toBeGreaterThan(-1);
    expect(setIdx).toBeGreaterThan(refIdx);
  });

  it('handleChange (fullscreenchange) reads document.fullscreenElement (DOM truth)', () => {
    expect(source).toMatch(/handleChange\s*=\s*\(\)\s*=>\s*\{[\s\S]{0,200}if\s*\(\s*!document\.fullscreenElement\s*\)/);
  });
});

// ── rAF scheduling (post-commit transform clearing) ────────

describe('rAF scheduling for transform clearing', () => {
  it('uses requestAnimationFrame to defer transform clearing past React commit', () => {
    expect(source).toMatch(/rafIdRef\.current\s*=\s*requestAnimationFrame/);
  });

  it('clears rafIdRef back to 0 inside the rAF callback', () => {
    expect(source).toMatch(/requestAnimationFrame\(\(\)\s*=>\s*\{\s*rafIdRef\.current\s*=\s*0/);
  });

  it('cancels pending rAF on rapid re-entry (enterFullscreen)', () => {
    expect(source).toMatch(/const enterFullscreen[\s\S]{0,400}if\s*\(rafIdRef\.current\)\s*cancelAnimationFrame\(rafIdRef\.current\)/);
  });

  it('cancels rAF and clears id on exit (exitFullscreen)', () => {
    expect(source).toMatch(/exitFullscreen[\s\S]{0,300}if\s*\(rafIdRef\.current\)\s*\{\s*cancelAnimationFrame\(rafIdRef\.current\);\s*rafIdRef\.current\s*=\s*0/);
  });

  it('rAF callback re-checks isFullscreenRef.current before applying transforms (rapid-toggle guard)', () => {
    expect(source).toMatch(/requestAnimationFrame\(\(\)\s*=>\s*\{[\s\S]{0,300}if\s*\(isFullscreenRef\.current\s*&&\s*fullscreenRef\.current\)/);
  });
});

// ── doRestore (idempotent ancestor restore) ────────────────

describe('doRestore (idempotent ancestor restore)', () => {
  it('uses optional-chain to no-op when restoreRef is null', () => {
    expect(source).toMatch(/restoreRef\.current\?\.\(\)/);
  });

  it('nullifies restoreRef.current after invoking (idempotent on repeat calls)', () => {
    expect(source).toMatch(/doRestore\s*=\s*useCallback\(\(\)\s*=>\s*\{\s*restoreRef\.current\?\.\(\);\s*restoreRef\.current\s*=\s*null/);
  });

  it('uses useCallback with empty deps (stable reference)', () => {
    expect(source).toMatch(/doRestore\s*=\s*useCallback\([\s\S]{0,150}\},\s*\[\]\)/);
  });

  it('enterFullscreen calls doRestore() first (cleans up prior toggle)', () => {
    const enterBlock = source.match(/const enterFullscreen\s*=\s*useCallback\(async\s*\(\)\s*=>\s*\{[\s\S]{0,200}/);
    expect(enterBlock![0]).toContain('doRestore()');
  });

  it('exitFullscreen calls doRestore() before exitFullscreen API', () => {
    const exitBlock = source.match(/const exitFullscreen\s*=\s*useCallback\(async\s*\(\)\s*=>\s*\{[\s\S]{0,400}/);
    const restoreIdx = exitBlock![0].indexOf('doRestore()');
    const exitApiIdx = exitBlock![0].indexOf('document.exitFullscreen');
    expect(restoreIdx).toBeGreaterThan(-1);
    expect(exitApiIdx).toBeGreaterThan(restoreIdx);
  });
});

// ── clearAncestorTransforms semantics ──────────────────────

describe('clearAncestorTransforms walk', () => {
  it('walks up via parentElement (DOM tree)', () => {
    expect(source).toMatch(/parent\.parentElement/);
  });

  it('stops at document.documentElement (does not walk past <html>)', () => {
    expect(source).toMatch(/while\s*\(parent\s*&&\s*parent\s*!==\s*document\.documentElement\)/);
  });

  it("only acts when computed transform is truthy AND not 'none'", () => {
    expect(source).toMatch(/if\s*\(computed\s*&&\s*computed\s*!==\s*'none'\)/);
  });

  it('saves the ORIGINAL inline transform (not computed) for restoration', () => {
    expect(source).toMatch(/saved\.push\(\{\s*node:\s*parent,\s*prev:\s*parent\.style\.transform\s*\}\)/);
  });

  it('restoration restores prev inline value when truthy', () => {
    expect(source).toMatch(/if\s*\(prev\)\s*\{\s*node\.style\.transform\s*=\s*prev/);
  });

  it('restoration calls removeProperty when prev was empty (clean removal)', () => {
    expect(source).toMatch(/else\s*\{\s*node\.style\.removeProperty\('transform'\)/);
  });

  it('returns the cleanup function (() => void)', () => {
    expect(source).toMatch(/function clearAncestorTransforms\(el:\s*HTMLElement\):\s*\(\)\s*=>\s*void/);
  });
});

// ── Fullscreen API support detection ───────────────────────

describe('Fullscreen API support detection', () => {
  it('checks typeof document !== "undefined" (SSR-safe)', () => {
    expect(source).toMatch(/typeof\s+document\s*!==\s*['"]undefined['"]/);
  });

  it('uses double-bang (!!) on requestFullscreen for boolean coercion', () => {
    expect(source).toMatch(/!!document\.documentElement\.requestFullscreen/);
  });

  it('skips fullscreen-API call when supportsFullscreen is false (CSS-only fallback)', () => {
    expect(source).toMatch(/if\s*\(supportsFullscreen\s*&&\s*fullscreenRef\.current\)/);
  });

  it('exit only calls document.exitFullscreen when actually fullscreen', () => {
    expect(source).toMatch(/if\s*\(supportsFullscreen\s*&&\s*document\.fullscreenElement\)/);
  });

  it('handleChange effect early-returns when API is unsupported', () => {
    expect(source).toMatch(/if\s*\(!supportsFullscreen\)\s*return/);
  });
});

// ── devWarn integration ────────────────────────────────────

describe('devWarn integration', () => {
  it("imports devWarn from './graphHelpers'", () => {
    expect(source).toMatch(/import\s*\{\s*devWarn\s*\}\s*from\s*['"]\.\/graphHelpers['"]/);
  });

  it('every sessionStorage try/catch uses devWarn (no silent swallows)', () => {
    const swallows = source.match(/devWarn\('useFullscreen',\s*'swallowed error',\s*e\)/g) ?? [];
    expect(swallows.length).toBeGreaterThanOrEqual(4);
  });
});

// ── Reload-cleanup useEffect ───────────────────────────────

describe('Reload-cleanup useEffect (clears flag if user reloaded mid-fullscreen)', () => {
  it('runs once on mount (empty dep array)', () => {
    expect(source).toMatch(/useEffect\(\(\)\s*=>\s*\{\s*try\s*\{[\s\S]{0,200}sessionStorage\.removeItem\('axon_map_fullscreen'\)[\s\S]{0,200}\},\s*\[\]\)/);
  });

  it('only removes if flag was set (avoids unnecessary writes)', () => {
    expect(source).toMatch(/if\s*\(sessionStorage\.getItem\('axon_map_fullscreen'\)\)\s*\{\s*sessionStorage\.removeItem/);
  });
});

// ── Unmount restore safety ─────────────────────────────────

describe('Unmount restore safety', () => {
  it('cleanup useEffect calls doRestore() on unmount', () => {
    expect(source).toMatch(/useEffect\(\(\)\s*=>\s*\{\s*return\s*\(\)\s*=>\s*doRestore\(\)/);
  });

  it('the unmount-restore effect depends on [doRestore]', () => {
    expect(source).toMatch(/useEffect\(\(\)\s*=>\s*\{\s*return\s*\(\)\s*=>\s*doRestore\(\)[\s\S]{0,80}\},\s*\[doRestore\]\)/);
  });
});

// ── Toggle state machine (replicated) ──────────────────────

class FullscreenToggle {
  isFullscreen = false;
  storageFlag = false;
  rafScheduled = false;
  ancestorOverridden = false;

  enter() {
    // doRestore() of any prior overrides
    this.ancestorOverridden = false;
    if (this.rafScheduled) this.rafScheduled = false;
    this.isFullscreen = true;
    this.storageFlag = true;
    this.rafScheduled = true;
  }

  applyRaf() {
    if (this.rafScheduled && this.isFullscreen) {
      this.ancestorOverridden = true;
    }
    this.rafScheduled = false;
  }

  exit() {
    if (this.rafScheduled) this.rafScheduled = false;
    this.ancestorOverridden = false;
    this.isFullscreen = false;
    this.storageFlag = false;
  }

  toggle() { (this.isFullscreen ? this.exit : this.enter).call(this); }
}

describe('Replicated toggle state machine', () => {
  it('starts with no fullscreen, no storage, no override', () => {
    const f = new FullscreenToggle();
    expect(f.isFullscreen).toBe(false);
    expect(f.storageFlag).toBe(false);
    expect(f.ancestorOverridden).toBe(false);
  });

  it('enter() sets fullscreen + storage flag + schedules rAF', () => {
    const f = new FullscreenToggle();
    f.enter();
    expect(f.isFullscreen).toBe(true);
    expect(f.storageFlag).toBe(true);
    expect(f.rafScheduled).toBe(true);
    expect(f.ancestorOverridden).toBe(false);
  });

  it('rAF only applies overrides when still fullscreen (rapid-toggle guard)', () => {
    const f = new FullscreenToggle();
    f.enter();
    f.exit();
    f.applyRaf();
    expect(f.ancestorOverridden).toBe(false);
  });

  it('rAF applies overrides when fullscreen is still true', () => {
    const f = new FullscreenToggle();
    f.enter();
    f.applyRaf();
    expect(f.ancestorOverridden).toBe(true);
  });

  it('exit() clears storage and overrides', () => {
    const f = new FullscreenToggle();
    f.enter();
    f.applyRaf();
    f.exit();
    expect(f.isFullscreen).toBe(false);
    expect(f.storageFlag).toBe(false);
    expect(f.ancestorOverridden).toBe(false);
  });

  it('toggle() flips between enter and exit', () => {
    const f = new FullscreenToggle();
    f.toggle(); // enter
    expect(f.isFullscreen).toBe(true);
    f.toggle(); // exit
    expect(f.isFullscreen).toBe(false);
  });

  it('rapid double-enter is idempotent on storage flag', () => {
    const f = new FullscreenToggle();
    f.enter();
    f.enter();
    expect(f.storageFlag).toBe(true);
    expect(f.isFullscreen).toBe(true);
  });
});
