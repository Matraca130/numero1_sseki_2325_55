// ============================================================
// Axon — Calendar Focus Management Utilities
//
// Focus management helpers for Sheet/Drawer interactions.
// - focusElement(): focus a ref'd element when a panel opens
// - restoreFocus(): return focus to trigger when panel closes
//
// Used by ExamDetailsPanel and any overlay/modal in the
// calendar feature to maintain keyboard accessibility.
// ============================================================

import { type RefObject } from 'react';

/**
 * Focus an element referenced by a React ref.
 * Useful for focusing the first interactive element
 * when a Sheet or Drawer opens.
 *
 * Uses requestAnimationFrame to ensure the DOM has settled
 * (e.g., after a Radix animation).
 *
 * @param ref - React ref to the element to focus
 * @param options.preventScroll - Prevent scrolling on focus (default: true)
 */
export function focusElement(
  ref: RefObject<HTMLElement | null>,
  options: { preventScroll?: boolean } = {},
): void {
  const { preventScroll = true } = options;

  requestAnimationFrame(() => {
    ref.current?.focus({ preventScroll });
  });
}

/**
 * Creates a focus-restore handler.
 * Captures the currently focused element and returns a function
 * that restores focus to it when called (e.g., on panel close).
 *
 * Usage:
 * ```ts
 * const restore = captureFocusTrigger();
 * // ... open panel ...
 * // on close:
 * restore();
 * ```
 */
export function captureFocusTrigger(): () => void {
  const trigger = document.activeElement as HTMLElement | null;

  return () => {
    requestAnimationFrame(() => {
      trigger?.focus({ preventScroll: true });
    });
  };
}

/**
 * React-friendly hook helper: manages focus for open/close cycles.
 *
 * Returns an object with:
 * - `onOpen(targetRef)`: call when panel opens — focuses the target
 * - `onClose()`: call when panel closes — restores focus to trigger
 *
 * Usage inside a component:
 * ```ts
 * const focusManager = createFocusManager();
 * // When opening:
 * focusManager.onOpen(closeButtonRef);
 * // When closing:
 * focusManager.onClose();
 * ```
 */
export function createFocusManager() {
  let restoreFn: (() => void) | null = null;

  return {
    onOpen(targetRef: RefObject<HTMLElement | null>): void {
      restoreFn = captureFocusTrigger();
      focusElement(targetRef);
    },

    onClose(): void {
      restoreFn?.();
      restoreFn = null;
    },
  };
}
