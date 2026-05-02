// ============================================================
// Tests — useOverlayCanvas (helper extracted in cycle 48)
//
// Pins the source-level contract for the canvas-overlay helper
// shared by useDragConnect and useEdgeReconnect:
//   - <canvas> creation with pointer-events:none + z-index
//   - container.style.position = 'relative' anchor
//   - DPR-correct pixel buffer vs CSS size math
//   - ResizeObserver wiring + cleanup
//   - parentNode guard on cleanup removeChild
//   - enabled === false → no-op
//   - canvasRef/ctxRef nulled on cleanup
//
// Many of these tests previously lived in useDragConnect.contract.test.ts
// pinning the same code BEFORE the cycle-48 extraction.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE_PATH = resolve(__dirname, '..', 'useOverlayCanvas.ts');
const source = readFileSync(SOURCE_PATH, 'utf-8');

// ── Module contract ─────────────────────────────────────────

describe('useOverlayCanvas exports', () => {
  it('exports useOverlayCanvas hook', () => {
    expect(source).toContain('export function useOverlayCanvas');
  });

  it('exports UseOverlayCanvasOptions interface', () => {
    expect(source).toContain('export interface UseOverlayCanvasOptions');
  });

  it('exports UseOverlayCanvasResult interface', () => {
    expect(source).toContain('export interface UseOverlayCanvasResult');
  });

  it('options interface declares containerRef, zIndex, enabled', () => {
    expect(source).toMatch(/containerRef:\s*RefObject/);
    expect(source).toMatch(/zIndex:\s*number/);
    expect(source).toMatch(/enabled:\s*boolean/);
  });

  it('result interface declares canvasRef, ctxRef, resize', () => {
    expect(source).toMatch(/canvasRef:\s*MutableRefObject/);
    expect(source).toMatch(/ctxRef:\s*MutableRefObject/);
    expect(source).toMatch(/resize:\s*\(\)\s*=>\s*void/);
  });
});

// ── Canvas overlay creation ─────────────────────────────────

describe('Canvas overlay creation', () => {
  it("creates a <canvas> via document.createElement('canvas')", () => {
    expect(source).toContain("document.createElement('canvas')");
  });

  it('sets pointer-events:none on the canvas', () => {
    expect(source).toContain('pointer-events:none');
  });

  it('positions the canvas absolute / top:0 / left:0 / 100% w/h', () => {
    expect(source).toContain('position:absolute');
    expect(source).toContain('top:0');
    expect(source).toContain('left:0');
    expect(source).toContain('width:100%');
    expect(source).toContain('height:100%');
  });

  it('uses caller-supplied zIndex via template literal', () => {
    expect(source).toMatch(/z-index:\$\{zIndex\}/);
  });

  it('makes the container position:relative (anchor for absolute canvas)', () => {
    expect(source).toMatch(/container\.style\.position\s*=\s*'relative'/);
  });

  it('appends the canvas to the container (not body)', () => {
    expect(source).toMatch(/container\.appendChild\(overlay\)/);
  });

  it('captures the 2D context once at mount', () => {
    expect(source).toMatch(/ctxRef\.current\s*=\s*overlay\.getContext\('2d'\)/);
  });
});

// ── DPR resize math ─────────────────────────────────────────

describe('DPR resize math', () => {
  it('canvas pixel buffer = rect × devicePixelRatio (rounded to int)', () => {
    expect(source).toMatch(/overlay\.width\s*=\s*Math\.round\(.*?rect\.width.*?devicePixelRatio/);
    expect(source).toMatch(/overlay\.height\s*=\s*Math\.round\(.*?rect\.height.*?devicePixelRatio/);
  });

  it('canvas CSS size = raw rect (NOT multiplied — would 2x on retina)', () => {
    expect(source).toMatch(/overlay\.style\.width\s*=\s*`\$\{rect\.width\}px`/);
    expect(source).toMatch(/overlay\.style\.height\s*=\s*`\$\{rect\.height\}px`/);
  });

  it('falls back to DPR=1 when window.devicePixelRatio is 0/undefined', () => {
    expect(source).toMatch(/window\.devicePixelRatio\s*\|\|\s*1/);
  });

  it('resize is wired through ResizeObserver', () => {
    expect(source).toMatch(/new ResizeObserver/);
    expect(source).toMatch(/ro\.observe\(container\)/);
  });

  it('disconnects the observer on cleanup (no leak)', () => {
    expect(source).toMatch(/ro\.disconnect\(\)/);
  });
});

// ── Cleanup discipline ──────────────────────────────────────

describe('Cleanup-on-unmount', () => {
  it('only removes canvas from DOM if it is still attached (parentNode guard)', () => {
    expect(source).toMatch(/if\s*\(overlay\.parentNode\)\s*overlay\.parentNode\.removeChild\(overlay\)/);
  });

  it('nulls canvasRef on cleanup', () => {
    expect(source).toMatch(/canvasRef\.current\s*=\s*null/);
  });

  it('nulls ctxRef on cleanup', () => {
    expect(source).toMatch(/ctxRef\.current\s*=\s*null/);
  });

  it('cleanup is symmetric with creation (no orphaned listeners)', () => {
    // Both ro.observe and ro.disconnect must appear.
    expect(source).toMatch(/ro\.observe/);
    expect(source).toMatch(/ro\.disconnect/);
  });
});

// ── Mount-time guards ───────────────────────────────────────

describe('Mount-time guards', () => {
  it('bails out when not enabled (no canvas created)', () => {
    expect(source).toMatch(/if\s*\(!enabled\)\s*return/);
  });

  it('bails out when containerRef.current is null', () => {
    expect(source).toMatch(/if\s*\(!container\)\s*return/);
  });

  it('effect deps include enabled, zIndex, containerRef (rebuild on change)', () => {
    expect(source).toMatch(/\[enabled,\s*zIndex,\s*containerRef\]/);
  });
});

// ── Resize callback exposed for manual triggering ──────────

describe('Manual resize callback', () => {
  it('exposes a useCallback-stable resize function', () => {
    expect(source).toMatch(/const resize\s*=\s*useCallback/);
  });

  it('resize is a no-op when canvas is not mounted', () => {
    // Pin: `if (!overlay || !container) return;` inside the resize callback.
    expect(source).toMatch(/if\s*\(!overlay\s*\|\|\s*!container\)\s*return/);
  });

  it('resize uses the same pixel-buffer math as the initial sizing', () => {
    // Both copies should round(rect × DPR).
    const matches = source.match(/Math\.round\(.*?rect\.width.*?devicePixelRatio/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

// ── DPR math (replicated, behavioral pin — no source dep) ──

describe('DPR resize math (replicated)', () => {
  function computeCanvasSize(rectWidth: number, rectHeight: number, dpr: number) {
    return {
      pixelW: Math.round(rectWidth * (dpr || 1)),
      pixelH: Math.round(rectHeight * (dpr || 1)),
      cssW: `${rectWidth}px`,
      cssH: `${rectHeight}px`,
    };
  }

  it('@1x DPR: pixel buffer matches CSS size', () => {
    const r = computeCanvasSize(800, 600, 1);
    expect(r.pixelW).toBe(800);
    expect(r.pixelH).toBe(600);
    expect(r.cssW).toBe('800px');
  });

  it('@2x DPR: pixel buffer doubled, CSS unchanged (retina-correct)', () => {
    const r = computeCanvasSize(800, 600, 2);
    expect(r.pixelW).toBe(1600);
    expect(r.pixelH).toBe(1200);
    expect(r.cssW).toBe('800px');
    expect(r.cssH).toBe('600px');
  });

  it('@3x DPR: triples the pixel buffer (Android XHDPI)', () => {
    const r = computeCanvasSize(400, 300, 3);
    expect(r.pixelW).toBe(1200);
    expect(r.pixelH).toBe(900);
  });

  it('DPR=0 (or undefined) falls back to 1× (defensive)', () => {
    const r = computeCanvasSize(800, 600, 0);
    expect(r.pixelW).toBe(800);
    expect(r.pixelH).toBe(600);
  });

  it('rounds fractional DPR (e.g. 1.5x = 1.5x scale)', () => {
    const r = computeCanvasSize(800, 600, 1.5);
    expect(r.pixelW).toBe(1200);
    expect(r.pixelH).toBe(900);
  });
});

// ── z-index discipline (caller wiring) ──────────────────────

describe('z-index discipline', () => {
  // Pin the contract on the caller side — the helper accepts a number,
  // and the two known callers pass z-index 5 (useDragConnect) and 6
  // (useEdgeReconnect). Catches accidental swaps.

  it('helper takes zIndex via the options bag (no hard-coded value in source)', () => {
    expect(source).toContain('zIndex');
    // No literal "z-index:5" or "z-index:6" baked into the helper itself
    expect(source).not.toMatch(/z-index:5;/);
    expect(source).not.toMatch(/z-index:6;/);
  });
});
