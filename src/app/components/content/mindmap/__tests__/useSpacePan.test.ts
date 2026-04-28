// ============================================================
// Tests — useSpacePan (export check + state toggle logic)
//
// The hook requires React + G6 + DOM, so we test the export
// contract and verify the internal state toggle logic using
// a lightweight simulation.
// ============================================================

import { describe, it, expect } from 'vitest';

// ── Export check ────────────────────────────────────────────

describe('useSpacePan — export check', () => {
  it('exports useSpacePan as a function', async () => {
    const mod = await import('../useSpacePan');
    expect(mod.useSpacePan).toBeDefined();
    expect(typeof mod.useSpacePan).toBe('function');
  });
});

// ── State toggle logic simulation ───────────────────────────

/**
 * Simulates the internal state machine of useSpacePan:
 *   idle → (Space down) → panning → (Space up) → idle
 *   panning → (blur) → idle
 */
class SpacePanState {
  spaceHeld = false;
  cursor = '';
  dragElementEnabled = true;

  keyDown(code: string, isInput: boolean) {
    if (code !== 'Space' || this.spaceHeld) return;
    if (isInput) return; // Don't intercept in input fields

    this.spaceHeld = true;
    this.cursor = 'grab';
    this.dragElementEnabled = false;
  }

  keyUp(code: string) {
    if (code !== 'Space' || !this.spaceHeld) return;

    this.spaceHeld = false;
    this.cursor = '';
    this.dragElementEnabled = true;
  }

  blur() {
    if (this.spaceHeld) {
      this.spaceHeld = false;
      this.cursor = '';
      this.dragElementEnabled = true;
    }
  }
}

describe('SpacePan state logic', () => {
  it('starts in idle state', () => {
    const state = new SpacePanState();
    expect(state.spaceHeld).toBe(false);
    expect(state.cursor).toBe('');
    expect(state.dragElementEnabled).toBe(true);
  });

  it('Space down activates panning mode', () => {
    const state = new SpacePanState();
    state.keyDown('Space', false);
    expect(state.spaceHeld).toBe(true);
    expect(state.cursor).toBe('grab');
    expect(state.dragElementEnabled).toBe(false);
  });

  it('Space up deactivates panning mode', () => {
    const state = new SpacePanState();
    state.keyDown('Space', false);
    state.keyUp('Space');
    expect(state.spaceHeld).toBe(false);
    expect(state.cursor).toBe('');
    expect(state.dragElementEnabled).toBe(true);
  });

  it('blur resets panning mode', () => {
    const state = new SpacePanState();
    state.keyDown('Space', false);
    expect(state.spaceHeld).toBe(true);
    state.blur();
    expect(state.spaceHeld).toBe(false);
    expect(state.cursor).toBe('');
    expect(state.dragElementEnabled).toBe(true);
  });

  it('blur does nothing when not panning', () => {
    const state = new SpacePanState();
    state.blur(); // should be a no-op
    expect(state.spaceHeld).toBe(false);
    expect(state.cursor).toBe('');
  });

  it('ignores non-Space keys', () => {
    const state = new SpacePanState();
    state.keyDown('Enter', false);
    expect(state.spaceHeld).toBe(false);
    expect(state.cursor).toBe('');
  });

  it('ignores Space when already held (no double-activate)', () => {
    const state = new SpacePanState();
    state.keyDown('Space', false);
    state.keyDown('Space', false); // second press ignored
    expect(state.spaceHeld).toBe(true);
  });

  it('ignores Space in input fields', () => {
    const state = new SpacePanState();
    state.keyDown('Space', true);
    expect(state.spaceHeld).toBe(false);
    expect(state.cursor).toBe('');
  });

  it('keyUp for non-Space is ignored', () => {
    const state = new SpacePanState();
    state.keyDown('Space', false);
    state.keyUp('Enter');
    expect(state.spaceHeld).toBe(true); // still held
  });

  it('keyUp when not held is ignored', () => {
    const state = new SpacePanState();
    state.keyUp('Space'); // no-op
    expect(state.spaceHeld).toBe(false);
  });
});

// ── Source-level guarantees ────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';
const SOURCE_PATH = resolve(__dirname, '..', 'useSpacePan.ts');
const source = readFileSync(SOURCE_PATH, 'utf-8');

describe('useSpacePan source contract', () => {
  it('exports useSpacePan as a named function returning void', () => {
    expect(source).toMatch(/export function useSpacePan\([^)]+\):\s*void/);
  });

  it('accepts graphRef typed as React.RefObject<Graph | null>', () => {
    expect(source).toContain('graphRef: React.RefObject<Graph | null>');
  });

  it('accepts containerRef typed as React.RefObject<HTMLDivElement | null>', () => {
    expect(source).toContain('containerRef: React.RefObject<HTMLDivElement | null>');
  });

  it('accepts ready: boolean', () => {
    expect(source).toMatch(/ready:\s*boolean/);
  });

  it('keeps Space-held state in a useRef (no rerender on toggle)', () => {
    expect(source).toMatch(/const\s+spaceHeldRef\s*=\s*useRef\(false\)/);
  });

  it('useEffect dep array is [graphRef, containerRef, ready]', () => {
    expect(source).toMatch(/\},\s*\[graphRef,\s*containerRef,\s*ready\]\)/);
  });

  it('returns early if container is null OR ready is false', () => {
    expect(source).toMatch(/if\s*\(!container\s*\|\|\s*!ready\)\s*return/);
  });

  it('imports devWarn from graphHelpers (cycle 17 helper)', () => {
    expect(source).toMatch(/import\s*\{\s*devWarn\s*\}\s*from\s*['"]\.\/graphHelpers['"]/);
  });
});

// ── Hijack-prevention zones (source) ───────────────────────

describe('useSpacePan hijack-prevention zones', () => {
  it('skips Space when target tag is INPUT', () => {
    expect(source).toContain("tag === 'INPUT'");
  });

  it('skips Space when target tag is TEXTAREA', () => {
    expect(source).toContain("tag === 'TEXTAREA'");
  });

  it('skips Space when target tag is SELECT', () => {
    expect(source).toContain("tag === 'SELECT'");
  });

  it('skips Space when target tag is BUTTON', () => {
    expect(source).toContain("tag === 'BUTTON'");
  });

  it('skips Space when target tag is A (anchor)', () => {
    expect(source).toContain("tag === 'A'");
  });

  it('skips Space when target.isContentEditable', () => {
    expect(source).toContain('isContentEditable');
  });

  it('skips Space when target has role="button"', () => {
    expect(source).toMatch(/getAttribute\(['"]role['"]\)\s*===\s*['"]button['"]/);
  });

  it('skips Space when target is inside a dialog or alertdialog', () => {
    expect(source).toMatch(/closest\?\.\(['"]\[role="dialog"\],\s*\[role="alertdialog"\]['"]\)/);
  });

  it('only activates when focus is in container, body, or documentElement', () => {
    expect(source).toMatch(/!container\.contains\(el\)\s*&&\s*el\s*!==\s*document\.body\s*&&\s*el\s*!==\s*document\.documentElement/);
  });

  it('checks spaceHeldRef early in keyDown to prevent double-activate on auto-repeat', () => {
    expect(source).toMatch(/if\s*\(e\.code\s*!==\s*['"]Space['"]\s*\|\|\s*spaceHeldRef\.current\)\s*return/);
  });

  it('preventDefault is called only AFTER passing all guards', () => {
    const guardZone = source.match(/handleKeyDown[\s\S]{0,2000}preventDefault/);
    expect(guardZone).not.toBeNull();
    const preventIdx = source.indexOf('e.preventDefault()');
    const grabIdx = source.indexOf("container.style.cursor = 'grab'");
    expect(preventIdx).toBeGreaterThan(0);
    expect(grabIdx).toBeGreaterThan(preventIdx);
  });
});

// ── G6 drag-element coordination (source) ─────────────────

describe('useSpacePan G6 drag-element coordination', () => {
  it('disables drag-element on Space down', () => {
    expect(source).toMatch(/updateBehavior\(\{\s*type:\s*['"]drag-element['"],\s*enable:\s*false\s*\}\)/);
  });

  it('re-enables drag-element on Space up', () => {
    const enableTrueCalls = source.match(/updateBehavior\(\{\s*type:\s*['"]drag-element['"],\s*enable:\s*true\s*\}\)/g) ?? [];
    expect(enableTrueCalls.length).toBeGreaterThanOrEqual(3);
  });

  it('has at least 4 updateBehavior call sites (keyDown, keyUp, blur, unmount)', () => {
    const calls = source.match(/graph\.updateBehavior\(/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(4);
  });

  it('every updateBehavior is wrapped in try/catch (graph may be destroyed)', () => {
    const tryCount = (source.match(/try\s*\{/g) ?? []).length;
    expect(tryCount).toBeGreaterThanOrEqual(4);
  });

  it('blur and unmount catch blocks call devWarn (cycle 17 helper)', () => {
    expect(source).toMatch(/devWarn\(['"]useSpacePan['"],\s*['"]ignore['"],\s*e\)/);
  });

  it('keyDown/keyUp catches are silent (behavior may not exist)', () => {
    expect(source).toMatch(/catch\s*\{[\s\S]{0,80}\/\/[\s\S]{0,40}destroyed/);
  });
});

// ── Cursor feedback (source) ──────────────────────────────

describe('useSpacePan cursor feedback', () => {
  it("sets cursor='grab' on Space activation", () => {
    expect(source).toMatch(/container\.style\.cursor\s*=\s*['"]grab['"]/);
  });

  it("clears cursor (= '') on deactivation", () => {
    const clearCalls = source.match(/container\.style\.cursor\s*=\s*['"]['"];?/g) ?? [];
    expect(clearCalls.length).toBeGreaterThanOrEqual(3);
  });
});

// ── Auto-reset paths (source) ─────────────────────────────

describe('useSpacePan auto-reset paths', () => {
  it('resets on window blur (alt-tab while holding Space)', () => {
    expect(source).toMatch(/window\.addEventListener\(['"]blur['"],\s*handleBlur\)/);
  });

  it('resets on container focusout (focus moves to sidebar etc)', () => {
    expect(source).toMatch(/container\.addEventListener\(['"]focusout['"],\s*handleFocusOut\)/);
  });

  it('focusout skips reset if relatedTarget is still inside container', () => {
    expect(source).toMatch(/container\.contains\(e\.relatedTarget as Node\)/);
  });

  it('resets on document visibilitychange when document.hidden (tab switch)', () => {
    expect(source).toMatch(/document\.addEventListener\(['"]visibilitychange['"],\s*handleVisibility\)/);
    expect(source).toMatch(/if\s*\(document\.hidden\)\s*handleBlur\(\)/);
  });

  it('handleBlur is the no-op-if-not-held variant (guards spaceHeldRef.current)', () => {
    expect(source).toMatch(/handleBlur\s*=\s*\(\)\s*=>\s*\{\s*if\s*\(spaceHeldRef\.current\)/);
  });
});

// ── Listener bind/unbind symmetry (source) ────────────────

describe('useSpacePan listener bind/unbind symmetry', () => {
  it('addEventListener and removeEventListener counts match', () => {
    const adds = (source.match(/\baddEventListener\(/g) ?? []).length;
    const removes = (source.match(/\bremoveEventListener\(/g) ?? []).length;
    expect(removes).toBe(adds);
  });

  it('cleans up keydown listener', () => {
    expect(source).toMatch(/document\.removeEventListener\(['"]keydown['"],\s*handleKeyDown\)/);
  });

  it('cleans up keyup listener', () => {
    expect(source).toMatch(/document\.removeEventListener\(['"]keyup['"],\s*handleKeyUp\)/);
  });

  it('cleans up focusout listener (on container, not document)', () => {
    expect(source).toMatch(/container\.removeEventListener\(['"]focusout['"],\s*handleFocusOut\)/);
  });

  it('cleans up window blur listener', () => {
    expect(source).toMatch(/window\.removeEventListener\(['"]blur['"],\s*handleBlur\)/);
  });

  it('cleans up visibilitychange listener', () => {
    expect(source).toMatch(/document\.removeEventListener\(['"]visibilitychange['"],\s*handleVisibility\)/);
  });

  it('listens on document (not container) for keydown/keyup so canvas focus does not block Space', () => {
    expect(source).toMatch(/document\.addEventListener\(['"]keydown['"],\s*handleKeyDown\)/);
    expect(source).toMatch(/document\.addEventListener\(['"]keyup['"],\s*handleKeyUp\)/);
  });
});

// ── Unmount cleanup (source) ──────────────────────────────

describe('useSpacePan unmount cleanup', () => {
  it('checks spaceHeldRef on unmount to ensure no orphaned cursor state', () => {
    expect(source).toMatch(/return\s*\(\)\s*=>\s*\{[\s\S]+if\s*\(spaceHeldRef\.current\)\s*\{[\s\S]{0,80}container\.style\.cursor/);
  });

  it('re-enables drag-element on unmount if Space was held (no stuck behavior)', () => {
    expect(source).toMatch(/return\s*\(\)\s*=>\s*\{[\s\S]+if\s*\(spaceHeldRef\.current\)[\s\S]{0,300}updateBehavior\(\{\s*type:\s*['"]drag-element['"],\s*enable:\s*true\s*\}\)/);
  });
});

// ── Replicated guard logic (table-driven) ─────────────────

interface GuardTarget {
  tag?: string;
  isContentEditable?: boolean;
  role?: string | null;
  insideDialog?: boolean;
  insideContainer?: boolean;
  isBody?: boolean;
  isDocumentElement?: boolean;
}

function shouldHijackSpace(t: GuardTarget): boolean {
  const tag = t.tag;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'A') return false;
  if (t.isContentEditable) return false;
  if (t.role === 'button') return false;
  if (t.insideDialog) return false;
  if (!t.insideContainer && !t.isBody && !t.isDocumentElement) return false;
  return true;
}

describe('Space-key hijack guard (replicated)', () => {
  it('rejects INPUT', () => {
    expect(shouldHijackSpace({ tag: 'INPUT', insideContainer: true })).toBe(false);
  });

  it('rejects TEXTAREA', () => {
    expect(shouldHijackSpace({ tag: 'TEXTAREA', insideContainer: true })).toBe(false);
  });

  it('rejects SELECT', () => {
    expect(shouldHijackSpace({ tag: 'SELECT', insideContainer: true })).toBe(false);
  });

  it('rejects BUTTON', () => {
    expect(shouldHijackSpace({ tag: 'BUTTON', insideContainer: true })).toBe(false);
  });

  it('rejects anchor (A)', () => {
    expect(shouldHijackSpace({ tag: 'A', insideContainer: true })).toBe(false);
  });

  it('rejects contentEditable element', () => {
    expect(shouldHijackSpace({ tag: 'DIV', isContentEditable: true, insideContainer: true })).toBe(false);
  });

  it('rejects role="button" custom widget', () => {
    expect(shouldHijackSpace({ tag: 'DIV', role: 'button', insideContainer: true })).toBe(false);
  });

  it('rejects element inside a [role="dialog"]', () => {
    expect(shouldHijackSpace({ tag: 'DIV', insideDialog: true, insideContainer: true })).toBe(false);
  });

  it('rejects element outside container/body/documentElement', () => {
    expect(shouldHijackSpace({ tag: 'DIV', insideContainer: false, isBody: false, isDocumentElement: false })).toBe(false);
  });

  it('accepts when focus is on body (typical idle state)', () => {
    expect(shouldHijackSpace({ tag: 'BODY', isBody: true })).toBe(true);
  });

  it('accepts when focus is on documentElement (html root)', () => {
    expect(shouldHijackSpace({ tag: 'HTML', isDocumentElement: true })).toBe(true);
  });

  it('accepts when focus is inside the graph container', () => {
    expect(shouldHijackSpace({ tag: 'DIV', insideContainer: true })).toBe(true);
  });

  it('accepts a non-interactive element inside the container (e.g. canvas)', () => {
    expect(shouldHijackSpace({ tag: 'CANVAS', insideContainer: true })).toBe(true);
  });
});
