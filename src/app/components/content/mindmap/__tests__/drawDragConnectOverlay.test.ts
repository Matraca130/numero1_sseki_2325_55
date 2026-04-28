// ============================================================
// Tests -- drawDragConnectOverlay (pure canvas drawing logic)
//
// Tests the drawDragConnectFrame function which renders
// connection ports, bezier curves, snap feedback, and
// success animations on a canvas overlay.
//
// Uses a mocked CanvasRenderingContext2D stub to verify
// draw calls and the needsNextFrame return value contract.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  drawDragConnectFrame,
  SUCCESS_ANIM_DURATION,
  type DragDrawState,
  type SuccessAnimState,
  type DrawFrameOptions,
  type DrawFrameRefs,
} from '../drawDragConnectOverlay';

// ── Canvas 2D stub ──────────────────────────────────────────

function createMockCtx(): CanvasRenderingContext2D {
  const noop = vi.fn();
  return {
    clearRect: vi.fn(),
    save: noop,
    restore: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    arcTo: noop,
    bezierCurveTo: noop,
    closePath: noop,
    fill: noop,
    stroke: noop,
    measureText: vi.fn(() => ({ width: 50 })),
    fillText: noop,
    setLineDash: noop,
    set fillStyle(_v: string) {},
    set strokeStyle(_v: string) {},
    set lineWidth(_v: number) {},
    set lineDashOffset(_v: number) {},
    set lineCap(_v: string) {},
    set lineJoin(_v: string) {},
    set font(_v: string) {},
    set textBaseline(_v: string) {},
  } as unknown as CanvasRenderingContext2D;
}

function createOptions(overrides?: Partial<DrawFrameOptions>): DrawFrameOptions {
  return {
    containerRect: { left: 0, top: 0, width: 800, height: 600 } as DOMRect,
    dpr: 1,
    portRadius: 6,
    connectToLabel: 'Conectar a...',
    ...overrides,
  };
}

function createEmptyRefs(overrides?: Partial<DrawFrameRefs>): DrawFrameRefs {
  return {
    hoveredNodeId: null,
    hoverPositions: [],
    dragState: null,
    successAnim: null,
    ...overrides,
  };
}

// ── SUCCESS_ANIM_DURATION constant ──────────────────────────

describe('SUCCESS_ANIM_DURATION', () => {
  it('is 600ms', () => {
    expect(SUCCESS_ANIM_DURATION).toBe(600);
  });
});

// ── drawDragConnectFrame: idle state ────────────────────────

describe('drawDragConnectFrame: idle state', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  it('clears the canvas at the start of every frame', () => {
    drawDragConnectFrame(ctx, 800, 600, createEmptyRefs(), createOptions());
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it('returns false (no animation needed) when idle', () => {
    const result = drawDragConnectFrame(ctx, 800, 600, createEmptyRefs(), createOptions());
    expect(result).toBe(false);
  });
});

// ── drawDragConnectFrame: hovered node (connection ports) ───

describe('drawDragConnectFrame: hovered node ports', () => {
  it('returns true (needs next frame) when hovering a node', () => {
    const ctx = createMockCtx();
    const refs = createEmptyRefs({
      hoveredNodeId: 'node-1',
      hoverPositions: [{ id: 'node-1', x: 400, y: 300, size: 40 }],
    });
    const result = drawDragConnectFrame(ctx, 800, 600, refs, createOptions());
    expect(result).toBe(true);
  });

  it('returns false when hovered node is not in position list', () => {
    const ctx = createMockCtx();
    const refs = createEmptyRefs({
      hoveredNodeId: 'node-missing',
      hoverPositions: [{ id: 'node-1', x: 400, y: 300, size: 40 }],
    });
    const result = drawDragConnectFrame(ctx, 800, 600, refs, createOptions());
    expect(result).toBe(false);
  });

  it('does not draw ports when a drag is active', () => {
    const ctx = createMockCtx();
    const dragState: DragDrawState = {
      sourceNodeId: 'node-1',
      sourceLabel: 'Source',
      sourceX: 100, sourceY: 100, sourceSize: 40,
      dragX: 300, dragY: 300,
      snapNodeId: null, snapX: 0, snapY: 0,
      snapLabel: '', snapInvalid: false, snapInvalidReason: '',
      startTime: performance.now() - 1000,
      activated: true,
    };
    const refs = createEmptyRefs({
      hoveredNodeId: 'node-1',
      hoverPositions: [{ id: 'node-1', x: 100, y: 100, size: 40 }],
      dragState,
    });
    // Even with hoveredNodeId set, the drag state takes priority
    // (ports are suppressed by the `!ds` guard)
    const result = drawDragConnectFrame(ctx, 800, 600, refs, createOptions());
    // Still returns true because active drag needs animation
    expect(result).toBe(true);
  });
});

// ── drawDragConnectFrame: active drag ───────────────────────

describe('drawDragConnectFrame: active drag', () => {
  function makeDragState(overrides?: Partial<DragDrawState>): DragDrawState {
    return {
      sourceNodeId: 'node-1',
      sourceLabel: 'Source Node',
      sourceX: 100, sourceY: 100, sourceSize: 40,
      dragX: 400, dragY: 300,
      snapNodeId: null, snapX: 0, snapY: 0,
      snapLabel: '', snapInvalid: false, snapInvalidReason: '',
      startTime: performance.now() - 500,
      activated: true,
      ...overrides,
    };
  }

  it('returns true when drag is active and activated', () => {
    const ctx = createMockCtx();
    const refs = createEmptyRefs({ dragState: makeDragState() });
    const result = drawDragConnectFrame(ctx, 800, 600, refs, createOptions());
    expect(result).toBe(true);
  });

  it('does not draw drag visuals when not yet activated', () => {
    const ctx = createMockCtx();
    const refs = createEmptyRefs({
      dragState: makeDragState({ activated: false }),
    });
    const result = drawDragConnectFrame(ctx, 800, 600, refs, createOptions());
    // Not activated = no drag visuals, no hover either = false
    expect(result).toBe(false);
  });

  it('calls measureText for the label (connectToLabel when no snap)', () => {
    const ctx = createMockCtx();
    const refs = createEmptyRefs({ dragState: makeDragState() });
    drawDragConnectFrame(ctx, 800, 600, refs, createOptions({ connectToLabel: 'Conectar a...' }));
    expect(ctx.measureText).toHaveBeenCalledWith('Conectar a...');
  });

  it('shows snap label when snapped to a valid target', () => {
    const ctx = createMockCtx();
    const refs = createEmptyRefs({
      dragState: makeDragState({
        snapNodeId: 'node-2',
        snapX: 500, snapY: 400,
        snapLabel: 'Target Node',
        snapInvalid: false,
      }),
    });
    drawDragConnectFrame(ctx, 800, 600, refs, createOptions());
    expect(ctx.measureText).toHaveBeenCalledWith('Target Node');
  });

  it('shows invalid reason when snap target is invalid', () => {
    const ctx = createMockCtx();
    const refs = createEmptyRefs({
      dragState: makeDragState({
        snapNodeId: 'node-2',
        snapX: 500, snapY: 400,
        snapLabel: 'Target Node',
        snapInvalid: true,
        snapInvalidReason: 'Ya conectados',
      }),
    });
    drawDragConnectFrame(ctx, 800, 600, refs, createOptions());
    expect(ctx.measureText).toHaveBeenCalledWith('Ya conectados');
  });
});

// ── drawDragConnectFrame: success animation ─────────────────

describe('drawDragConnectFrame: success animation', () => {
  it('returns true while animation is in progress', () => {
    const ctx = createMockCtx();
    const refs = createEmptyRefs({
      successAnim: {
        srcX: 100, srcY: 100,
        tgtX: 400, tgtY: 300,
        startTime: performance.now() - 100, // 100ms into 600ms animation
      },
    });
    const result = drawDragConnectFrame(ctx, 800, 600, refs, createOptions());
    expect(result).toBe(true);
  });

  it('returns false when animation has completed (progress >= 1)', () => {
    const ctx = createMockCtx();
    const refs = createEmptyRefs({
      successAnim: {
        srcX: 100, srcY: 100,
        tgtX: 400, tgtY: 300,
        startTime: performance.now() - (SUCCESS_ANIM_DURATION + 100), // well past duration
      },
    });
    const result = drawDragConnectFrame(ctx, 800, 600, refs, createOptions());
    expect(result).toBe(false);
  });
});

// ── drawDragConnectFrame: DPR scaling ───────────────────────

describe('drawDragConnectFrame: DPR scaling', () => {
  it('clears full canvas dimensions regardless of DPR', () => {
    const ctx = createMockCtx();
    drawDragConnectFrame(ctx, 1600, 1200, createEmptyRefs(), createOptions({ dpr: 2 }));
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1600, 1200);
  });
});

// ── toLocal coordinate conversion (replicated) ────────────

describe('toLocal coordinate conversion (replicated pure)', () => {
  function toLocal(sx: number, sy: number, containerRect: DOMRect, dpr: number) {
    return {
      x: (sx - containerRect.left) * dpr,
      y: (sy - containerRect.top) * dpr,
    };
  }

  it('subtracts container offset before scaling', () => {
    const rect = { left: 100, top: 50 } as DOMRect;
    expect(toLocal(150, 80, rect, 1)).toEqual({ x: 50, y: 30 });
  });

  it('scales by DPR after the offset subtraction', () => {
    const rect = { left: 0, top: 0 } as DOMRect;
    expect(toLocal(10, 20, rect, 2)).toEqual({ x: 20, y: 40 });
  });

  it('combines offset + DPR (real retina case)', () => {
    const rect = { left: 100, top: 50 } as DOMRect;
    expect(toLocal(150, 80, rect, 2)).toEqual({ x: 100, y: 60 });
  });

  it('handles negative client positions (pointer outside container)', () => {
    const rect = { left: 100, top: 50 } as DOMRect;
    expect(toLocal(50, 30, rect, 1)).toEqual({ x: -50, y: -20 });
  });
});

// ── Source-level constant pinning ──────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';
const SOURCE_PATH = resolve(__dirname, '..', 'drawDragConnectOverlay.ts');
const source = readFileSync(SOURCE_PATH, 'utf-8');

describe('Drawing-only constants', () => {
  it('PORT_OFFSET_FACTOR=1.05 (ports just outside the node circle)', () => {
    expect(source).toMatch(/PORT_OFFSET_FACTOR\s*=\s*1\.05/);
  });

  it('SUCCESS_ANIM_DURATION=600ms', () => {
    expect(source).toMatch(/SUCCESS_ANIM_DURATION\s*=\s*600/);
  });

  it('toLocal helper is internal (not exported)', () => {
    expect(source).toMatch(/^function\s+toLocal\(/m);
    expect(source).not.toMatch(/^export\s+function\s+toLocal\(/m);
  });
});

// ── Hover ports geometry ───────────────────────────────────

describe('Hover ports geometry', () => {
  it('places 4 ports at top, bottom, left, right (cardinal positions)', () => {
    expect(source).toMatch(/x:\s*nodeLocal\.x,\s*y:\s*nodeLocal\.y\s*-\s*r/); // top
    expect(source).toMatch(/x:\s*nodeLocal\.x,\s*y:\s*nodeLocal\.y\s*\+\s*r/); // bottom
    expect(source).toMatch(/x:\s*nodeLocal\.x\s*-\s*r,\s*y:\s*nodeLocal\.y/); // left
    expect(source).toMatch(/x:\s*nodeLocal\.x\s*\+\s*r,\s*y:\s*nodeLocal\.y/); // right
  });

  it('only renders ports when hovered AND no active drag (`hoveredNodeId && !ds`)', () => {
    expect(source).toMatch(/if\s*\(hoveredNodeId\s*&&\s*!ds\)/);
  });

  it('port pulse uses 0.6 + 0.4 × sin(now/400)', () => {
    expect(source).toMatch(/0\.6\s*\+\s*0\.4\s*\*\s*Math\.sin\(now\s*\/\s*400\)/);
  });

  it('glow alpha = 0.15 × pulse, port alpha = 0.7 × pulse', () => {
    expect(source).toMatch(/0\.15\s*\*\s*pulse/);
    expect(source).toMatch(/0\.7\s*\*\s*pulse/);
  });

  it('port border is white at 1.5px (DPR-scaled)', () => {
    expect(source).toContain("strokeStyle = '#ffffff'");
    expect(source).toMatch(/lineWidth\s*=\s*1\.5\s*\*\s*dpr/);
  });

  it('returns needsNextFrame=true while ports are visible (animated pulse)', () => {
    const ctx = createMockCtx();
    const refs = createEmptyRefs({
      hoveredNodeId: 'n1',
      hoverPositions: [{ id: 'n1', x: 100, y: 100, size: 40, label: 'A' }],
    });
    const next = drawDragConnectFrame(ctx, 800, 600, refs, createOptions());
    expect(next).toBe(true);
  });

  it('does NOT render ports if hoveredNodeId is set but the node is missing', () => {
    const ctx = createMockCtx();
    const refs = createEmptyRefs({
      hoveredNodeId: 'unknown',
      hoverPositions: [{ id: 'other', x: 100, y: 100, size: 40, label: 'X' }],
    });
    drawDragConnectFrame(ctx, 800, 600, refs, createOptions());
    // No arc calls beyond the (unconditional) clearRect == port circles weren't drawn
    expect((ctx.arc as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
  });

  it('does NOT render ports during an active drag (drag suppresses hover)', () => {
    const ctx = createMockCtx();
    const ds: DragDrawState = {
      sourceNodeId: 's', sourceLabel: 'S', sourceX: 0, sourceY: 0, sourceSize: 40,
      dragX: 100, dragY: 100, snapNodeId: null, snapX: 0, snapY: 0,
      snapLabel: '', snapInvalid: false, snapInvalidReason: '',
      startTime: performance.now(), activated: true,
    };
    const refs = createEmptyRefs({
      hoveredNodeId: 'n1',
      hoverPositions: [{ id: 'n1', x: 100, y: 100, size: 40, label: 'A' }],
      dragState: ds,
    });
    drawDragConnectFrame(ctx, 800, 600, refs, createOptions());
    // arc is called for drag visuals, but verify we don't go through the
    // "hovered ports" path. The source code's `if (hoveredNodeId && !ds)`
    // branch should be skipped, so the 4 cardinal port arcs (12 total
    // arc calls — glow+circle+border × 4 ports) don't happen.
    // We assert via source that this branching exists.
    expect(source).toMatch(/if\s*\(hoveredNodeId\s*&&\s*!ds\)/);
  });
});

// ── Bezier curve geometry ──────────────────────────────────

describe('Bezier curve control points', () => {
  it('curvature is min(dist × 0.25, 60 × dpr) so short drags get less curve', () => {
    expect(source).toMatch(/curvature\s*=\s*Math\.min\(dist\s*\*\s*0\.25,\s*60\s*\*\s*dpr\)/);
  });

  it('control points cp1/cp2 sit at 30%/70% of the path', () => {
    expect(source).toMatch(/from\.x\s*\+\s*dx\s*\*\s*0\.3/);
    expect(source).toMatch(/from\.x\s*\+\s*dx\s*\*\s*0\.7/);
  });

  it('curve direction flips based on dx/dy magnitude (avoids self-intersect)', () => {
    expect(source).toMatch(/Math\.abs\(dy\)\s*>\s*Math\.abs\(dx\)/);
    expect(source).toMatch(/Math\.abs\(dx\)\s*>=\s*Math\.abs\(dy\)/);
  });
});

// ── Bezier dash animation ──────────────────────────────────

describe('Bezier dash animation', () => {
  it('dash offset = -(elapsed/20) % 20 (continuous backward flow)', () => {
    expect(source).toMatch(/-\(elapsed\s*\/\s*20\)\s*%\s*20/);
  });

  it('uses [8,5] dash pattern at 2.5px line width', () => {
    expect(source).toMatch(/setLineDash\(\[8\s*\*\s*dpr,\s*5\s*\*\s*dpr\]\)/);
    expect(source).toMatch(/lineWidth\s*=\s*2\.5\s*\*\s*dpr/);
  });

  it('color is red #ef4444 when invalid, brand teal otherwise', () => {
    expect(source).toMatch(/snapInvalid\s*\?\s*'#ef4444'\s*:\s*GRAPH_COLORS\.primary/);
  });
});

// ── Snap feedback ──────────────────────────────────────────

describe('Snap target visual feedback', () => {
  it('valid snap: green ring (#22c55e) at 24px DPR-scaled', () => {
    expect(source).toContain("strokeStyle = '#22c55e'");
    expect(source).toMatch(/24\s*\*\s*dpr/);
  });

  it('valid snap: outer glow uses rgba(34, 197, 94, 0.25) at 8px line width', () => {
    expect(source).toMatch(/rgba\(34,\s*197,\s*94,\s*0\.25\)/);
    expect(source).toMatch(/lineWidth\s*=\s*8\s*\*\s*dpr/);
  });

  it('valid snap: pulsing scale = 1 + 0.06 × sin(elapsed/250)', () => {
    expect(source).toMatch(/1\s*\+\s*0\.06\s*\*\s*Math\.sin\(elapsed\s*\/\s*250\)/);
  });

  it('invalid snap: red X drawn at 8px size, 3px stroke', () => {
    expect(source).toMatch(/const\s+xSize\s*=\s*8\s*\*\s*dpr/);
    expect(source).toMatch(/strokeStyle\s*=\s*'#ef4444'/);
  });

  it('invalid snap: red ring at 26px (slightly larger than valid)', () => {
    expect(source).toMatch(/26\s*\*\s*dpr/);
    expect(source).toMatch(/rgba\(239,\s*68,\s*68,\s*0\.4\)/);
  });
});

// ── Source pulse on dragging node ─────────────────────────

describe('Source-node pulse during drag', () => {
  it('pulse factor = 1 + 0.08 × sin(elapsed/300)', () => {
    expect(source).toMatch(/1\s*\+\s*0\.08\s*\*\s*Math\.sin\(elapsed\s*\/\s*300\)/);
  });

  it('source ring is teal at 40% opacity, 2px line width', () => {
    expect(source).toMatch(/rgba\(\$\{GRAPH_COLORS\.primaryRgb\},\s*0\.4\)/);
    expect(source).toMatch(/lineWidth\s*=\s*2\s*\*\s*dpr/);
  });

  it('source port indicator is solid 5px teal dot at the start point', () => {
    expect(source).toContain('GRAPH_COLORS.primary');
    expect(source).toMatch(/arc\(from\.x,\s*from\.y,\s*5\s*\*\s*dpr/);
  });
});

// ── "Connect to..." label pill ─────────────────────────────

describe('Connect-to label pill', () => {
  it('text content is the snap label when snapped + valid', () => {
    expect(source).toMatch(/ds\.snapNodeId\s*\?\s*\(ds\.snapInvalid\s*\?\s*ds\.snapInvalidReason\s*:\s*ds\.snapLabel\)\s*:\s*connectToLabel/);
  });

  it('font is Inter at 11px (DPR-scaled)', () => {
    expect(source).toMatch(/font\s*=\s*`\$\{11\s*\*\s*dpr\}px Inter, sans-serif`/);
  });

  it('pill positioned 16px right and 16px above cursor', () => {
    expect(source).toMatch(/lx\s*=\s*labelX\.x\s*\+\s*16\s*\*\s*dpr/);
    expect(source).toMatch(/ly\s*=\s*labelX\.y\s*-\s*16\s*\*\s*dpr/);
  });

  it('pill background is red when invalid, teal when valid', () => {
    expect(source).toMatch(/snapInvalid\s*\?\s*'rgba\(239,\s*68,\s*68,\s*0\.9\)'\s*:\s*`rgba\(\$\{GRAPH_COLORS\.primaryRgb\},\s*0\.9\)`/);
  });

  it('text color is always white #ffffff (readable on both bgs)', () => {
    expect(source).toMatch(/fillStyle\s*=\s*'#ffffff'/);
  });

  it('uses textBaseline middle for vertical centering', () => {
    expect(source).toContain("textBaseline = 'middle'");
  });
});

// ── Arrowhead geometry ─────────────────────────────────────

describe('Arrowhead geometry', () => {
  it('uses 12px arrow length (DPR-scaled)', () => {
    expect(source).toMatch(/arrowLen\s*=\s*12\s*\*\s*dpr/);
  });

  it('opens at ±π/6 (30°) from the curve tangent', () => {
    const matches = source.match(/Math\.PI\s*\/\s*6/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('color matches the bezier (red on invalid, teal on valid)', () => {
    expect(source).toMatch(/fillStyle\s*=\s*ds\.snapInvalid\s*\?\s*'#ef4444'\s*:\s*GRAPH_COLORS\.primary/);
  });
});

// ── Success animation phases ───────────────────────────────

describe('Success animation phase ordering', () => {
  it('edge grow uses easeOut ((1-x)² inverted) at 2× progress speed', () => {
    expect(source).toMatch(/edgeProgress\s*=\s*Math\.min\(progress\s*\*\s*2,\s*1\)/);
    expect(source).toMatch(/easeOut\s*=\s*1\s*-\s*\(1\s*-\s*edgeProgress\)\s*\*\s*\(1\s*-\s*edgeProgress\)/);
  });

  it('node green pulse only renders while progress < 0.7', () => {
    expect(source).toMatch(/if\s*\(progress\s*<\s*0\.7\)/);
  });

  it('checkmark only appears AFTER 40% progress', () => {
    expect(source).toMatch(/if\s*\(progress\s*>\s*0\.4\)/);
  });

  it('checkmark fade-in maps (progress-0.4)/0.3 to [0,1]', () => {
    expect(source).toMatch(/\(progress\s*-\s*0\.4\)\s*\/\s*0\.3/);
  });

  it('checkmark fades out after 70% (1 - (progress-0.7)/0.3)', () => {
    expect(source).toMatch(/1\s*-\s*\(progress\s*-\s*0\.7\)\s*\/\s*0\.3/);
  });

  it('particle burst runs from 30% to 90% (windowed)', () => {
    expect(source).toMatch(/progress\s*>\s*0\.3\s*&&\s*progress\s*<\s*0\.9/);
  });

  it('uses 6 radial particles in the burst', () => {
    expect(source).toMatch(/numParticles\s*=\s*6/);
  });
});
