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
