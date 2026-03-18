// ============================================================
// useFocusTrap — Unit Tests
//
// Verifies focus trapping behavior: Tab/Shift+Tab cycling,
// auto-focus on activation, recapture on escape, and cleanup
// restoration of previously focused element.
//
// RUN: pnpm test
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFocusTrap } from '../useFocusTrap';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a container with N buttons and attach it to document.body. */
function createContainer(buttonCount: number): HTMLDivElement {
  const container = document.createElement('div');
  for (let i = 0; i < buttonCount; i++) {
    const btn = document.createElement('button');
    btn.textContent = `Button ${i + 1}`;
    container.appendChild(btn);
  }
  document.body.appendChild(container);
  return container;
}

/** Dispatch a keydown event on the given target. */
function pressKey(
  target: HTMLElement,
  key: string,
  opts: Partial<KeyboardEventInit> = {},
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  target.dispatchEvent(event);
  return event;
}

/**
 * Helper: render the hook inactive, wire the ref to a container,
 * then optionally activate it and flush the rAF.
 */
function setupTrap(container: HTMLDivElement, active = true) {
  const hook = renderHook(
    ({ active }: { active: boolean }) => useFocusTrap<HTMLDivElement>(active),
    { initialProps: { active: false } },
  );

  // Wire ref to the container before activating
  (hook.result.current as React.MutableRefObject<HTMLDivElement>).current =
    container;

  if (active) {
    hook.rerender({ active: true });
    // Flush the requestAnimationFrame that focuses the first element
    vi.runAllTimers();
  }

  return hook;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFocusTrap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  // 1. Returns a ref ----------------------------------------------------------
  it('returns a ref object', () => {
    const { result } = renderHook(() => useFocusTrap(false));
    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('current');
  });

  // 2. When active=true, focuses the first focusable element ------------------
  it('focuses the first focusable element when active=true', () => {
    const container = createContainer(3);
    const buttons = container.querySelectorAll('button');

    const hook = setupTrap(container, true);

    expect(document.activeElement).toBe(buttons[0]);

    hook.unmount();
  });

  // 3. Tab on last element wraps to first element ----------------------------
  it('wraps focus from last to first on Tab', () => {
    const container = createContainer(3);
    const buttons = container.querySelectorAll('button');

    const hook = setupTrap(container, true);

    // Focus the last button
    act(() => {
      buttons[2].focus();
    });
    expect(document.activeElement).toBe(buttons[2]);

    // Press Tab — should wrap to first
    pressKey(container, 'Tab');

    expect(document.activeElement).toBe(buttons[0]);

    hook.unmount();
  });

  // 4. Shift+Tab on first element wraps to last element ----------------------
  it('wraps focus from first to last on Shift+Tab', () => {
    const container = createContainer(3);
    const buttons = container.querySelectorAll('button');

    const hook = setupTrap(container, true);

    // First button should already be focused
    expect(document.activeElement).toBe(buttons[0]);

    // Press Shift+Tab — should wrap to last
    pressKey(container, 'Tab', { shiftKey: true });

    expect(document.activeElement).toBe(buttons[2]);

    hook.unmount();
  });

  // 5. When focus escapes the container, Tab recaptures to first element ------
  it('recaptures focus to first element when focus escapes the container', () => {
    const container = createContainer(3);
    const buttons = container.querySelectorAll('button');

    // Create an outside element to steal focus
    const outside = document.createElement('input');
    document.body.appendChild(outside);

    const hook = setupTrap(container, true);

    // Simulate focus escaping the container
    act(() => {
      outside.focus();
    });
    expect(document.activeElement).toBe(outside);

    // Press Tab on the container — should recapture to first element
    pressKey(container, 'Tab');

    expect(document.activeElement).toBe(buttons[0]);

    hook.unmount();
  });

  // 6. When active=false, does nothing ----------------------------------------
  it('does not trap focus when active=false', () => {
    const container = createContainer(3);

    // Create an outside element
    const outside = document.createElement('input');
    document.body.appendChild(outside);

    // Focus the outside element first
    act(() => {
      outside.focus();
    });

    const hook = setupTrap(container, false);

    // Also flush any pending timers to confirm nothing fires
    vi.runAllTimers();

    // Focus should remain on the outside element — the hook didn't move it
    expect(document.activeElement).toBe(outside);

    hook.unmount();
  });

  // 7. On cleanup, restores focus to previously focused element ---------------
  it('restores focus to previously focused element on cleanup', () => {
    const container = createContainer(3);
    const buttons = container.querySelectorAll('button');

    // Create an element to hold focus before the trap activates
    const previousButton = document.createElement('button');
    previousButton.textContent = 'Previous';
    document.body.appendChild(previousButton);

    act(() => {
      previousButton.focus();
    });
    expect(document.activeElement).toBe(previousButton);

    const hook = setupTrap(container, true);

    // Focus should have moved into the container
    expect(document.activeElement).toBe(buttons[0]);

    // Deactivate the trap — cleanup should restore focus
    hook.rerender({ active: false });

    expect(document.activeElement).toBe(previousButton);

    hook.unmount();
  });
});
