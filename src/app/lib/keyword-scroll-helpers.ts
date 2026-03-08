// ============================================================
// Axon — keyword-scroll-helpers
//
// Shared utility for Case A keyword navigation: scroll to a
// highlighted keyword span, flash it, and auto-open its popup.
//
// Extracted from duplicated code in useKeywordNavigation.ts and
// SummaryView.tsx to DRY up scroll + flash + auto-click logic
// and centralize the fixes for edge cases E2/E3/E4:
//   E2: 600ms race (user clicks another keyword during timer)
//   E3: slow scroll (smooth scroll >600ms on slow device)
//   E4: timer leak on unmount
//
// Usage:
//   const handle = scrollFlashAndAutoOpen(keywordId, kwSpan);
//   // To cancel (e.g., new navigation or unmount):
//   handle.cancel();
// ============================================================

/** Handle returned by scrollFlashAndAutoOpen — call cancel() to abort. */
export interface AutoClickHandle {
  cancel: () => void;
}

/** Sentinel for "no pending auto-click". Avoids null checks everywhere. */
export const NOOP_HANDLE: AutoClickHandle = { cancel: () => {} };

/**
 * Walk up the DOM from `el` to find the nearest scrollable ancestor.
 * Uses computed styles (robust against class name changes).
 * Falls back to document.scrollingElement (viewport).
 */
function findScrollParent(el: HTMLElement): Element | null {
  let parent = el.parentElement;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll') return parent;
    parent = parent.parentElement;
  }
  return document.scrollingElement;
}

/**
 * Scroll to `kwSpan`, flash a violet outline, and auto-open its popup
 * once the scroll settles.
 *
 * Auto-open strategy (scrollend race + fallback):
 *   1. Listen for `scrollend` on the nearest scrollable ancestor
 *      (fires when browser finishes smooth scroll — precise timing).
 *   2. Set a fallback timer at 800ms in case:
 *      - Browser doesn't support `scrollend` (pre-2023 Safari <17.4)
 *      - No scroll was needed (element already in view → no event)
 *   3. Whichever fires first wins; the other is cancelled.
 *
 * The returned handle.cancel() cleans up both the listener and the
 * timer — call it on new navigation, manual keyword click, or unmount.
 */
export function scrollFlashAndAutoOpen(
  keywordId: string,
  kwSpan: HTMLElement,
): AutoClickHandle {
  // ── Scroll ──
  kwSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // ── Flash violet outline ──
  kwSpan.style.outline = '2px solid #8b5cf6';
  kwSpan.style.outlineOffset = '2px';
  kwSpan.style.borderRadius = '4px';
  kwSpan.style.transition = 'outline-color 0.3s ease';
  setTimeout(() => {
    kwSpan.style.outlineColor = 'transparent';
    setTimeout(() => {
      kwSpan.style.outline = '';
      kwSpan.style.outlineOffset = '';
    }, 300);
  }, 1500);

  // ── Auto-click with scrollend race ──
  let fired = false;
  const scrollParent = findScrollParent(kwSpan);

  const doAutoClick = () => {
    if (fired) return;
    fired = true;
    // Clean up whichever didn't fire
    clearTimeout(fallbackTimer);
    scrollParent?.removeEventListener('scrollend', doAutoClick);
    // Re-query: TreeWalker may have replaced DOM nodes since the scroll started
    const freshSpan = document.querySelector(
      `[data-keyword-id="${keywordId}"]`,
    ) as HTMLElement | null;
    freshSpan?.click();
  };

  // Path 1: scrollend event (precise, ~94% browser support)
  scrollParent?.addEventListener('scrollend', doAutoClick, { once: true });

  // Path 2: fallback timer (handles no-scroll and old browsers)
  const fallbackTimer = window.setTimeout(doAutoClick, 800);

  // ── Cancel handle (for E2 race / E4 unmount) ──
  return {
    cancel: () => {
      if (fired) return;
      fired = true;
      clearTimeout(fallbackTimer);
      scrollParent?.removeEventListener('scrollend', doAutoClick);
    },
  };
}
