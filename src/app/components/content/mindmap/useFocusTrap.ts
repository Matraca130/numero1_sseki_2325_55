// ============================================================
// Axon — useFocusTrap hook
//
// Traps keyboard focus within a container element (modal/dialog).
// When the user presses Tab or Shift+Tab, focus cycles through
// focusable elements inside the container instead of escaping.
//
// Usage:
//   const trapRef = useFocusTrap(isOpen);
//   <div ref={trapRef}>...</div>
// ============================================================

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(active: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    // Save the element that had focus before the trap opened
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus into the container (first focusable element)
    const rafId = requestAnimationFrame(() => {
      const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) {
        // No focusable elements — keep focus on container itself as fallback
        e.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      // If focus escaped the container, bring it back
      if (!container.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
        return;
      }

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the element that was focused before the trap (if still in DOM)
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [active]);

  return ref;
}
