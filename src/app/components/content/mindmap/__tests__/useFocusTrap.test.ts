// ============================================================
// useFocusTrap — Unit Tests
//
// Verifies focus trapping behavior used by KM modals
// (AddNodeEdgeModal, NodeAnnotationModal, AiTutorPanel,
// ConfirmDialog, etc.):
//   - Initial focus on activation
//   - Tab / Shift+Tab cycling at edges
//   - Recapture when focus escapes
//   - Focusable selector semantics
//   - Active-gating, cleanup, focus restoration
//   - Listener placement (container, not document)
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

/** Empty container with no focusables (used for fallback path). */
function createEmptyContainer(): HTMLDivElement {
  const container = document.createElement('div');
  // Make container itself focusable for the fallback path
  container.tabIndex = -1;
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
 * Render the hook inactive, wire the ref to a container,
 * then optionally activate it and flush the rAF.
 */
function setupTrap(container: HTMLDivElement | null, active = true) {
  const hook = renderHook(
    ({ active }: { active: boolean }) => useFocusTrap<HTMLDivElement>(active),
    { initialProps: { active: false } },
  );

  // Wire ref to the container before activating (skip if intentionally null)
  if (container) {
    (hook.result.current as React.MutableRefObject<HTMLDivElement | null>).current =
      container;
  }

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

  // ═══════════════════════════════════════════════════════════
  // GROUP 1: Ref shape
  // ═══════════════════════════════════════════════════════════

  describe('ref shape', () => {
    it('returns a ref object', () => {
      const { result } = renderHook(() => useFocusTrap(false));
      expect(result.current).toBeDefined();
      expect(result.current).toHaveProperty('current');
    });

    it('initial ref.current is null', () => {
      const { result } = renderHook(() => useFocusTrap(false));
      expect(result.current.current).toBeNull();
    });

    it('returns same ref instance across rerenders', () => {
      const { result, rerender } = renderHook(
        ({ active }: { active: boolean }) => useFocusTrap(active),
        { initialProps: { active: false } },
      );
      const initial = result.current;
      rerender({ active: true });
      expect(result.current).toBe(initial);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GROUP 2: Initial focus on activation
  // ═══════════════════════════════════════════════════════════

  describe('initial focus', () => {
    it('focuses the first focusable element when active=true', () => {
      const container = createContainer(3);
      const buttons = container.querySelectorAll('button');

      const hook = setupTrap(container, true);

      expect(document.activeElement).toBe(buttons[0]);

      hook.unmount();
    });

    it('does not focus anything before rAF fires', () => {
      const container = createContainer(3);

      // Some other element holds focus
      const outside = document.createElement('input');
      document.body.appendChild(outside);
      outside.focus();

      const hook = renderHook(
        ({ active }: { active: boolean }) => useFocusTrap<HTMLDivElement>(active),
        { initialProps: { active: false } },
      );
      (hook.result.current as React.MutableRefObject<HTMLDivElement>).current =
        container;

      hook.rerender({ active: true });
      // Do NOT flush timers — rAF hasn't fired yet
      expect(document.activeElement).toBe(outside);

      vi.runAllTimers();
      hook.unmount();
    });

    it('rAF is cancelled if hook deactivates before it fires', () => {
      const container = createContainer(3);

      const outside = document.createElement('input');
      document.body.appendChild(outside);
      outside.focus();

      const hook = renderHook(
        ({ active }: { active: boolean }) => useFocusTrap<HTMLDivElement>(active),
        { initialProps: { active: false } },
      );
      (hook.result.current as React.MutableRefObject<HTMLDivElement>).current =
        container;

      hook.rerender({ active: true });
      // Deactivate BEFORE rAF fires — should cancel the focus call
      hook.rerender({ active: false });
      vi.runAllTimers();

      expect(document.activeElement).toBe(outside);

      hook.unmount();
    });

    it('does nothing when ref.current is null even with active=true', () => {
      // Don't wire any ref
      expect(() => {
        const hook = renderHook(
          ({ active }: { active: boolean }) =>
            useFocusTrap<HTMLDivElement>(active),
          { initialProps: { active: false } },
        );
        hook.rerender({ active: true });
        vi.runAllTimers();
        hook.unmount();
      }).not.toThrow();
    });

    it('focuses single focusable element on activation', () => {
      const container = createContainer(1);
      const button = container.querySelector('button')!;

      const hook = setupTrap(container, true);

      expect(document.activeElement).toBe(button);

      hook.unmount();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GROUP 3: Tab forward wrap
  // ═══════════════════════════════════════════════════════════

  describe('Tab forward wrap', () => {
    it('wraps focus from last to first on Tab', () => {
      const container = createContainer(3);
      const buttons = container.querySelectorAll('button');

      const hook = setupTrap(container, true);

      act(() => {
        buttons[2].focus();
      });

      const event = pressKey(container, 'Tab');

      expect(document.activeElement).toBe(buttons[0]);
      expect(event.defaultPrevented).toBe(true);

      hook.unmount();
    });

    it('does NOT preventDefault when Tab pressed on a middle element', () => {
      const container = createContainer(4);
      const buttons = container.querySelectorAll('button');

      const hook = setupTrap(container, true);

      // Focus middle (index 1, neither first nor last)
      act(() => {
        buttons[1].focus();
      });

      const event = pressKey(container, 'Tab');

      // Native browser Tab navigation should proceed — handler is a no-op here
      expect(event.defaultPrevented).toBe(false);

      hook.unmount();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GROUP 4: Shift+Tab backward wrap
  // ═══════════════════════════════════════════════════════════

  describe('Shift+Tab backward wrap', () => {
    it('wraps focus from first to last on Shift+Tab', () => {
      const container = createContainer(3);
      const buttons = container.querySelectorAll('button');

      const hook = setupTrap(container, true);

      // First button should already be focused
      expect(document.activeElement).toBe(buttons[0]);

      const event = pressKey(container, 'Tab', { shiftKey: true });

      expect(document.activeElement).toBe(buttons[2]);
      expect(event.defaultPrevented).toBe(true);

      hook.unmount();
    });

    it('does NOT preventDefault when Shift+Tab pressed on a middle element', () => {
      const container = createContainer(4);
      const buttons = container.querySelectorAll('button');

      const hook = setupTrap(container, true);

      act(() => {
        buttons[2].focus();
      });

      const event = pressKey(container, 'Tab', { shiftKey: true });

      expect(event.defaultPrevented).toBe(false);

      hook.unmount();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GROUP 5: Single-element edge case
  // ═══════════════════════════════════════════════════════════

  describe('single focusable element', () => {
    it('Tab on single focusable element preventDefaults and stays', () => {
      const container = createContainer(1);
      const button = container.querySelector('button')!;

      const hook = setupTrap(container, true);
      expect(document.activeElement).toBe(button);

      // first === last; activeElement === last → preventDefault + focus(first)
      const event = pressKey(container, 'Tab');

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(button);

      hook.unmount();
    });

    it('Shift+Tab on single focusable element preventDefaults and stays', () => {
      const container = createContainer(1);
      const button = container.querySelector('button')!;

      const hook = setupTrap(container, true);
      expect(document.activeElement).toBe(button);

      // first === last; activeElement === first → preventDefault + focus(last)
      const event = pressKey(container, 'Tab', { shiftKey: true });

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(button);

      hook.unmount();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GROUP 6: Recapture when focus escapes
  // ═══════════════════════════════════════════════════════════

  describe('recapture on focus escape', () => {
    it('recaptures focus to first element when focus is outside on Tab', () => {
      const container = createContainer(3);
      const buttons = container.querySelectorAll('button');

      const outside = document.createElement('input');
      document.body.appendChild(outside);

      const hook = setupTrap(container, true);

      act(() => {
        outside.focus();
      });
      expect(document.activeElement).toBe(outside);

      const event = pressKey(container, 'Tab');

      expect(document.activeElement).toBe(buttons[0]);
      expect(event.defaultPrevented).toBe(true);

      hook.unmount();
    });

    it('recaptures focus to first element on Shift+Tab when outside', () => {
      // Source recaptures to FIRST in either direction when outside the container.
      const container = createContainer(3);
      const buttons = container.querySelectorAll('button');

      const outside = document.createElement('input');
      document.body.appendChild(outside);

      const hook = setupTrap(container, true);

      act(() => {
        outside.focus();
      });

      pressKey(container, 'Tab', { shiftKey: true });

      expect(document.activeElement).toBe(buttons[0]);

      hook.unmount();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GROUP 7: Zero focusables (fallback path)
  // ═══════════════════════════════════════════════════════════

  describe('zero focusable elements', () => {
    it('preventDefaults Tab when no focusable elements exist', () => {
      const container = createEmptyContainer();

      const hook = setupTrap(container, true);

      const event = pressKey(container, 'Tab');

      expect(event.defaultPrevented).toBe(true);

      hook.unmount();
    });

    it('preventDefaults Shift+Tab when no focusable elements exist', () => {
      const container = createEmptyContainer();

      const hook = setupTrap(container, true);

      const event = pressKey(container, 'Tab', { shiftKey: true });

      expect(event.defaultPrevented).toBe(true);

      hook.unmount();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GROUP 8: Non-Tab keys are ignored
  // ═══════════════════════════════════════════════════════════

  describe('non-Tab keys ignored', () => {
    it.each(['Enter', 'Escape', ' ', 'ArrowDown', 'ArrowUp', 'a', 'F1'])(
      'does not preventDefault on %s',
      (key) => {
        const container = createContainer(3);
        const buttons = container.querySelectorAll('button');

        const hook = setupTrap(container, true);

        // Move to last so handler would fire on Tab
        act(() => {
          buttons[2].focus();
        });

        const event = pressKey(container, key);

        expect(event.defaultPrevented).toBe(false);
        // And activeElement is unchanged
        expect(document.activeElement).toBe(buttons[2]);

        hook.unmount();
      },
    );
  });

  // ═══════════════════════════════════════════════════════════
  // GROUP 9: Active-gating
  // ═══════════════════════════════════════════════════════════

  describe('active gating', () => {
    it('does not trap focus when active=false', () => {
      const container = createContainer(3);

      const outside = document.createElement('input');
      document.body.appendChild(outside);

      act(() => {
        outside.focus();
      });

      const hook = setupTrap(container, false);
      vi.runAllTimers();

      expect(document.activeElement).toBe(outside);

      hook.unmount();
    });

    it('does not respond to Tab when active=false', () => {
      const container = createContainer(3);
      const buttons = container.querySelectorAll('button');

      const hook = setupTrap(container, false);

      act(() => {
        buttons[2].focus();
      });

      const event = pressKey(container, 'Tab');

      // No listener was attached — preventDefault never called
      expect(event.defaultPrevented).toBe(false);
      // And focus was not wrapped to first
      expect(document.activeElement).toBe(buttons[2]);

      hook.unmount();
    });

    it('toggling active=true→false detaches the keydown listener', () => {
      const container = createContainer(3);
      const buttons = container.querySelectorAll('button');

      const hook = setupTrap(container, true);

      act(() => {
        buttons[2].focus();
      });

      // Verify listener is attached
      const before = pressKey(container, 'Tab');
      expect(before.defaultPrevented).toBe(true);

      // Restore focus to last for next pressKey
      act(() => {
        buttons[2].focus();
      });

      // Deactivate
      hook.rerender({ active: false });

      const after = pressKey(container, 'Tab');
      expect(after.defaultPrevented).toBe(false);

      hook.unmount();
    });

    it('reactivating false→true→false→true captures fresh previouslyFocused each time', () => {
      const container = createContainer(2);
      const buttons = container.querySelectorAll('button');

      const prev1 = document.createElement('button');
      const prev2 = document.createElement('button');
      document.body.appendChild(prev1);
      document.body.appendChild(prev2);

      const hook = renderHook(
        ({ active }: { active: boolean }) => useFocusTrap<HTMLDivElement>(active),
        { initialProps: { active: false } },
      );
      (hook.result.current as React.MutableRefObject<HTMLDivElement>).current =
        container;

      // Activation #1 — prev1 focused before
      prev1.focus();
      hook.rerender({ active: true });
      vi.runAllTimers();
      expect(document.activeElement).toBe(buttons[0]);

      // Deactivate → restore to prev1
      hook.rerender({ active: false });
      expect(document.activeElement).toBe(prev1);

      // Activation #2 — prev2 focused before
      prev2.focus();
      hook.rerender({ active: true });
      vi.runAllTimers();
      expect(document.activeElement).toBe(buttons[0]);

      // Deactivate → restore to prev2 (NOT prev1)
      hook.rerender({ active: false });
      expect(document.activeElement).toBe(prev2);

      hook.unmount();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GROUP 10: Focus restoration on cleanup
  // ═══════════════════════════════════════════════════════════

  describe('focus restoration', () => {
    it('restores focus to previously focused element on deactivation', () => {
      const container = createContainer(3);
      const buttons = container.querySelectorAll('button');

      const previousButton = document.createElement('button');
      previousButton.textContent = 'Previous';
      document.body.appendChild(previousButton);

      act(() => {
        previousButton.focus();
      });

      const hook = setupTrap(container, true);
      expect(document.activeElement).toBe(buttons[0]);

      hook.rerender({ active: false });

      expect(document.activeElement).toBe(previousButton);

      hook.unmount();
    });

    it('restores focus on unmount while active=true', () => {
      const container = createContainer(3);
      const buttons = container.querySelectorAll('button');

      const previousButton = document.createElement('button');
      document.body.appendChild(previousButton);
      previousButton.focus();

      const hook = setupTrap(container, true);
      expect(document.activeElement).toBe(buttons[0]);

      hook.unmount();

      expect(document.activeElement).toBe(previousButton);
    });

    it('does not throw if previouslyFocused was removed from DOM before cleanup', () => {
      const container = createContainer(3);

      const previousButton = document.createElement('button');
      document.body.appendChild(previousButton);
      previousButton.focus();

      const hook = setupTrap(container, true);

      // Remove the previously focused element from the DOM before cleanup
      previousButton.remove();

      expect(() => {
        hook.rerender({ active: false });
      }).not.toThrow();

      hook.unmount();
    });

    it('handles previouslyFocused === document.body (no prior real focus)', () => {
      const container = createContainer(3);

      // No element focused → activeElement is body
      expect(document.activeElement).toBe(document.body);

      expect(() => {
        const hook = setupTrap(container, true);
        hook.rerender({ active: false });
        hook.unmount();
      }).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GROUP 11: Focusable selector — what counts
  // ═══════════════════════════════════════════════════════════

  describe('focusable selector', () => {
    it('includes a[href] but skips <a> without href', () => {
      const container = document.createElement('div');
      const aNoHref = document.createElement('a');
      aNoHref.textContent = 'no-href';
      const aWithHref = document.createElement('a');
      aWithHref.href = '#';
      aWithHref.textContent = 'with-href';
      container.appendChild(aNoHref);
      container.appendChild(aWithHref);
      document.body.appendChild(container);

      const hook = setupTrap(container, true);

      // First focusable should be the one WITH href, not the one without
      expect(document.activeElement).toBe(aWithHref);

      hook.unmount();
    });

    it('skips disabled buttons', () => {
      const container = document.createElement('div');
      const disabledBtn = document.createElement('button');
      disabledBtn.disabled = true;
      const enabledBtn = document.createElement('button');
      container.appendChild(disabledBtn);
      container.appendChild(enabledBtn);
      document.body.appendChild(container);

      const hook = setupTrap(container, true);
      expect(document.activeElement).toBe(enabledBtn);

      hook.unmount();
    });

    it('skips disabled inputs', () => {
      const container = document.createElement('div');
      const disabledInput = document.createElement('input');
      disabledInput.disabled = true;
      const enabledInput = document.createElement('input');
      container.appendChild(disabledInput);
      container.appendChild(enabledInput);
      document.body.appendChild(container);

      const hook = setupTrap(container, true);
      expect(document.activeElement).toBe(enabledInput);

      hook.unmount();
    });

    it('skips disabled textareas', () => {
      const container = document.createElement('div');
      const disabledTa = document.createElement('textarea');
      disabledTa.disabled = true;
      const enabledTa = document.createElement('textarea');
      container.appendChild(disabledTa);
      container.appendChild(enabledTa);
      document.body.appendChild(container);

      const hook = setupTrap(container, true);
      expect(document.activeElement).toBe(enabledTa);

      hook.unmount();
    });

    it('skips disabled selects', () => {
      const container = document.createElement('div');
      const disabledSel = document.createElement('select');
      disabledSel.disabled = true;
      const enabledSel = document.createElement('select');
      container.appendChild(disabledSel);
      container.appendChild(enabledSel);
      document.body.appendChild(container);

      const hook = setupTrap(container, true);
      expect(document.activeElement).toBe(enabledSel);

      hook.unmount();
    });

    it('includes [tabindex="0"] elements', () => {
      const container = document.createElement('div');
      const tabbableDiv = document.createElement('div');
      tabbableDiv.tabIndex = 0;
      tabbableDiv.textContent = 'tabbable';
      container.appendChild(tabbableDiv);
      document.body.appendChild(container);

      const hook = setupTrap(container, true);
      expect(document.activeElement).toBe(tabbableDiv);

      hook.unmount();
    });

    it('includes positive tabindex elements', () => {
      const container = document.createElement('div');
      const positive = document.createElement('div');
      positive.tabIndex = 2;
      container.appendChild(positive);
      document.body.appendChild(container);

      const hook = setupTrap(container, true);
      expect(document.activeElement).toBe(positive);

      hook.unmount();
    });

    it('excludes [tabindex="-1"] elements', () => {
      const container = document.createElement('div');
      const negative = document.createElement('div');
      negative.tabIndex = -1;
      const button = document.createElement('button');
      container.appendChild(negative);
      container.appendChild(button);
      document.body.appendChild(container);

      const hook = setupTrap(container, true);
      // tabindex=-1 div skipped → focus lands on the button
      expect(document.activeElement).toBe(button);

      hook.unmount();
    });

    it('does NOT include contenteditable elements (current behavior)', () => {
      const container = document.createElement('div');
      const editable = document.createElement('div');
      editable.setAttribute('contenteditable', 'true');
      const button = document.createElement('button');
      container.appendChild(editable);
      container.appendChild(button);
      document.body.appendChild(container);

      const hook = setupTrap(container, true);
      // The selector does NOT match contenteditable — button gets focus
      expect(document.activeElement).toBe(button);

      hook.unmount();
    });

    it('Tab cycle skips disabled elements correctly', () => {
      const container = document.createElement('div');
      const b1 = document.createElement('button');
      b1.textContent = 'first';
      const dis = document.createElement('button');
      dis.disabled = true;
      const b2 = document.createElement('button');
      b2.textContent = 'last';
      container.appendChild(b1);
      container.appendChild(dis);
      container.appendChild(b2);
      document.body.appendChild(container);

      const hook = setupTrap(container, true);
      expect(document.activeElement).toBe(b1);

      // Move to last, Tab should wrap to first (skipping disabled)
      act(() => {
        b2.focus();
      });

      pressKey(container, 'Tab');
      expect(document.activeElement).toBe(b1);

      hook.unmount();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GROUP 12: Listener placement & scope
  // ═══════════════════════════════════════════════════════════

  describe('listener placement', () => {
    it('listener is on container — keydown on a sibling does not fire handler', () => {
      const container = createContainer(3);
      const buttons = container.querySelectorAll('button');

      // Sibling that does NOT contain the container
      const sibling = document.createElement('div');
      document.body.appendChild(sibling);

      const hook = setupTrap(container, true);

      // Move focus to the last button so handler WOULD wrap if it fired
      act(() => {
        buttons[2].focus();
      });

      // Dispatch Tab on the sibling — handler should NOT see it
      const event = pressKey(sibling, 'Tab');

      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(buttons[2]);

      hook.unmount();
    });

    it('keydown bubbling from a child of the container DOES reach handler', () => {
      const container = createContainer(3);
      const buttons = container.querySelectorAll('button');

      const hook = setupTrap(container, true);

      act(() => {
        buttons[2].focus();
      });

      // Dispatch on inner button — bubbles up to container listener
      const event = pressKey(buttons[2], 'Tab');

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(buttons[0]);

      hook.unmount();
    });

    it('cleanup removes the keydown listener', () => {
      const container = createContainer(3);
      const buttons = container.querySelectorAll('button');

      const hook = setupTrap(container, true);

      // Confirm it's attached
      act(() => {
        buttons[2].focus();
      });
      expect(pressKey(container, 'Tab').defaultPrevented).toBe(true);

      // Unmount → cleanup
      hook.unmount();

      // After unmount, listener should be gone — Tab on the container is now no-op
      act(() => {
        buttons[2].focus();
      });
      const event = pressKey(container, 'Tab');
      expect(event.defaultPrevented).toBe(false);
    });
  });
});
