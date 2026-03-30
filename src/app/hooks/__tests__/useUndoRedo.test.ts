// ============================================================
// Hook Tests -- useUndoRedo
//
// Tests the useUndoRedo hook (push, undo, redo, max stack,
// redo discard on new push, empty stack safety).
//
// RUN: npx vitest run src/app/hooks/__tests__/useUndoRedo.test.ts
// ============================================================

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from '@/app/hooks/useUndoRedo';

describe('useUndoRedo', () => {
  it('push → undo → returns to previous state', () => {
    const { result } = renderHook(() => useUndoRedo('init'));

    act(() => result.current.set('A'));
    act(() => result.current.set('B'));
    act(() => result.current.undo());

    expect(result.current.state).toBe('A');
  });

  it('undo → redo → restores the undone state', () => {
    const { result } = renderHook(() => useUndoRedo('init'));

    act(() => result.current.set('A'));
    act(() => result.current.set('B'));
    act(() => result.current.undo());
    act(() => result.current.redo());

    expect(result.current.state).toBe('B');
  });

  it('undo on empty stack does not crash', () => {
    const { result } = renderHook(() => useUndoRedo('init'));

    expect(() => {
      act(() => result.current.undo());
    }).not.toThrow();

    expect(result.current.state).toBe('init');
  });

  it('redo on empty stack does not crash', () => {
    const { result } = renderHook(() => useUndoRedo('init'));

    expect(() => {
      act(() => result.current.redo());
    }).not.toThrow();

    expect(result.current.state).toBe('init');
  });

  it('respects max stack size and discards oldest entries', () => {
    const { result } = renderHook(() => useUndoRedo('init', 3));

    act(() => result.current.set('A'));
    act(() => result.current.set('B'));
    act(() => result.current.set('C'));
    act(() => result.current.set('D'));

    // Stack has max 3 entries, so only 3 undos should work
    act(() => result.current.undo()); // D → C
    expect(result.current.state).toBe('C');

    act(() => result.current.undo()); // C → B
    expect(result.current.state).toBe('B');

    act(() => result.current.undo()); // B → A
    expect(result.current.state).toBe('A');

    // 4th undo should not change state (oldest 'init' was discarded)
    act(() => result.current.undo());
    expect(result.current.state).toBe('A');
    expect(result.current.canUndo).toBe(false);
  });

  it('push after undo discards redo stack', () => {
    const { result } = renderHook(() => useUndoRedo('init'));

    act(() => result.current.set('A'));
    act(() => result.current.set('B'));
    act(() => result.current.undo()); // back to A
    act(() => result.current.set('C')); // new branch, redo should be gone

    expect(result.current.state).toBe('C');
    expect(result.current.canRedo).toBe(false);

    // redo should have no effect
    act(() => result.current.redo());
    expect(result.current.state).toBe('C');
  });
});
