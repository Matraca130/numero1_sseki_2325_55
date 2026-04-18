// ============================================================
// Tests -- useMapToolState (tool state management)
//
// Tests the hook that manages toolbar/editing states:
// active tool, connect source/target, confirm-delete node,
// annotation node, and tool change handler.
//
// Uses renderHook from @testing-library/react.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { MapNode } from '@/app/types/mindmap';
import type { MasteryColor } from '@/app/lib/mastery-helpers';

// Mock sonner toast before importing the hook
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { useMapToolState } from '../useMapToolState';

// ── Helpers ────────────────────────────────────────────────────

function mkNode(id: string, label: string): MapNode {
  return {
    id,
    label,
    type: 'keyword',
    mastery: 0.5,
    masteryColor: 'green' as MasteryColor,
  };
}

const mockI18n = { connectionCancelled: 'Connection cancelled' };

function renderToolState() {
  const showOnboardingRef = { current: false };
  return renderHook(() =>
    useMapToolState(
      showOnboardingRef as React.MutableRefObject<boolean>,
      mockI18n,
    ),
  );
}

// ── Default state ──────────────────────────────────────────────

describe('useMapToolState: default state', () => {
  it('default tool is pointer', () => {
    const { result } = renderToolState();
    expect(result.current.activeTool).toBe('pointer');
  });

  it('connect source starts as null', () => {
    const { result } = renderToolState();
    expect(result.current.connectSource).toBeNull();
  });

  it('connect target starts as null', () => {
    const { result } = renderToolState();
    expect(result.current.connectTarget).toBeNull();
  });

  it('confirmDeleteNode starts as null', () => {
    const { result } = renderToolState();
    expect(result.current.confirmDeleteNode).toBeNull();
  });

  it('annotationNode starts as null', () => {
    const { result } = renderToolState();
    expect(result.current.annotationNode).toBeNull();
  });
});

// ── handleToolChange ───────────────────────────────────────────

describe('useMapToolState: handleToolChange', () => {
  it('switches to add-node tool', () => {
    const { result } = renderToolState();
    act(() => {
      result.current.handleToolChange('add-node');
    });
    expect(result.current.activeTool).toBe('add-node');
  });

  it('switches to connect tool', () => {
    const { result } = renderToolState();
    act(() => {
      result.current.handleToolChange('connect');
    });
    expect(result.current.activeTool).toBe('connect');
  });

  it('switches to delete tool', () => {
    const { result } = renderToolState();
    act(() => {
      result.current.handleToolChange('delete');
    });
    expect(result.current.activeTool).toBe('delete');
  });

  it('switches to annotate tool', () => {
    const { result } = renderToolState();
    act(() => {
      result.current.handleToolChange('annotate');
    });
    expect(result.current.activeTool).toBe('annotate');
  });

  it('switches back to pointer', () => {
    const { result } = renderToolState();
    act(() => {
      result.current.handleToolChange('delete');
    });
    act(() => {
      result.current.handleToolChange('pointer');
    });
    expect(result.current.activeTool).toBe('pointer');
  });

  it('clears connect source and target when switching away from connect', () => {
    const { result } = renderToolState();
    const node = mkNode('n1', 'Mitosis');

    act(() => {
      result.current.handleToolChange('connect');
    });
    act(() => {
      result.current.setConnectSource(node);
    });
    expect(result.current.connectSource).toEqual(node);

    act(() => {
      result.current.handleToolChange('pointer');
    });
    expect(result.current.connectSource).toBeNull();
    expect(result.current.connectTarget).toBeNull();
  });

  it('does not clear connect state when switching to connect', () => {
    const { result } = renderToolState();
    const node = mkNode('n1', 'Mitosis');

    act(() => {
      result.current.setConnectSource(node);
    });
    act(() => {
      result.current.handleToolChange('connect');
    });
    expect(result.current.connectSource).toEqual(node);
  });
});

// ── Connect source/target state ────────────────────────────────

describe('useMapToolState: connect source/target', () => {
  it('sets connect source via setConnectSource', () => {
    const { result } = renderToolState();
    const node = mkNode('n1', 'Cell Cycle');

    act(() => {
      result.current.setConnectSource(node);
    });
    expect(result.current.connectSource).toEqual(node);
  });

  it('sets connect target via setConnectTarget', () => {
    const { result } = renderToolState();
    const target = mkNode('n2', 'DNA');

    act(() => {
      result.current.setConnectTarget(target);
    });
    expect(result.current.connectTarget).toEqual(target);
  });

  it('clears connect source to null', () => {
    const { result } = renderToolState();
    const node = mkNode('n1', 'Test');

    act(() => {
      result.current.setConnectSource(node);
    });
    act(() => {
      result.current.setConnectSource(null);
    });
    expect(result.current.connectSource).toBeNull();
  });
});

// ── Ref synchronization ────────────────────────────────────────

describe('useMapToolState: refs stay synchronized with state', () => {
  it('activeToolRef reflects the current active tool', () => {
    const { result } = renderToolState();
    expect(result.current.activeToolRef.current).toBe('pointer');

    act(() => {
      result.current.handleToolChange('delete');
    });
    expect(result.current.activeToolRef.current).toBe('delete');
  });

  it('connectSourceRef reflects the current connect source', () => {
    const { result } = renderToolState();
    expect(result.current.connectSourceRef.current).toBeNull();

    const node = mkNode('n1', 'Meiosis');
    act(() => {
      result.current.setConnectSource(node);
    });
    expect(result.current.connectSourceRef.current).toEqual(node);
  });
});

// ── confirmDeleteNode management ───────────────────────────────

describe('useMapToolState: confirmDeleteNode', () => {
  it('sets a node for deletion confirmation', () => {
    const { result } = renderToolState();
    const node = mkNode('n1', 'Chromosome');

    act(() => {
      result.current.setConfirmDeleteNode(node);
    });
    expect(result.current.confirmDeleteNode).toEqual(node);
  });

  it('clears the deletion confirmation', () => {
    const { result } = renderToolState();
    const node = mkNode('n1', 'Chromosome');

    act(() => {
      result.current.setConfirmDeleteNode(node);
    });
    act(() => {
      result.current.setConfirmDeleteNode(null);
    });
    expect(result.current.confirmDeleteNode).toBeNull();
  });
});

// ── annotationNode management ──────────────────────────────────

describe('useMapToolState: annotationNode', () => {
  it('sets a node for annotation', () => {
    const { result } = renderToolState();
    const node = mkNode('n1', 'Protein');

    act(() => {
      result.current.setAnnotationNode(node);
    });
    expect(result.current.annotationNode).toEqual(node);
  });

  it('clears the annotation node', () => {
    const { result } = renderToolState();
    const node = mkNode('n1', 'Protein');

    act(() => {
      result.current.setAnnotationNode(node);
    });
    act(() => {
      result.current.setAnnotationNode(null);
    });
    expect(result.current.annotationNode).toBeNull();
  });
});

// ── Return shape contract ──────────────────────────────────────

describe('useMapToolState: return shape', () => {
  it('returns all expected properties', () => {
    const { result } = renderToolState();
    const state = result.current;

    expect(state).toHaveProperty('activeTool');
    expect(state).toHaveProperty('setActiveTool');
    expect(state).toHaveProperty('activeToolRef');
    expect(state).toHaveProperty('connectSource');
    expect(state).toHaveProperty('setConnectSource');
    expect(state).toHaveProperty('connectSourceRef');
    expect(state).toHaveProperty('connectTarget');
    expect(state).toHaveProperty('setConnectTarget');
    expect(state).toHaveProperty('confirmDeleteNode');
    expect(state).toHaveProperty('setConfirmDeleteNode');
    expect(state).toHaveProperty('annotationNode');
    expect(state).toHaveProperty('setAnnotationNode');
    expect(state).toHaveProperty('handleToolChange');
  });

  it('handleToolChange is a function', () => {
    const { result } = renderToolState();
    expect(typeof result.current.handleToolChange).toBe('function');
  });

  it('setActiveTool is a function', () => {
    const { result } = renderToolState();
    expect(typeof result.current.setActiveTool).toBe('function');
  });
});
