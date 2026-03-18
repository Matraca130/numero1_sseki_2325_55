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
