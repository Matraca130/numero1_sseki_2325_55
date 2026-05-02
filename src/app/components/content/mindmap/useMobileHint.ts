// ============================================================
// Axon — useMobileHint (Cycle 62 extraction)
//
// Self-contained sessionStorage-backed timer + visibility flag
// for the mobile-hint pill rendered by KnowledgeGraph.tsx.
//
// Concerns owned by this hook:
//   - Initial visibility: read the seen-flag from sessionStorage
//     once, on mount. If the flag is present, the hint stays
//     hidden across this session.
//   - Auto-dismiss timer: 4 seconds after the graph is `ready`
//     and there is at least one node, the hint dismisses itself
//     and writes the seen-flag.
//   - Imperative dismiss(): callers (e.g. a tap handler) can
//     dismiss the hint immediately; same effects as the timer.
//
// Concerns NOT owned by this hook (kept in the parent):
//   - The JSX render of the pill itself.
//   - The "data.nodes.length > 5" noise gate — the parent
//     already gates the JSX block; the hook only cares whether
//     there are any nodes at all, which is the layout-ready
//     signal.
//
// Storage I/O is funneled through storageHelpers (cycle 57/59)
// so Safari private mode and disabled-storage errors are
// swallowed silently.
//
// Behavior delta from pre-extraction parent (cycle 62 audit):
// the original parent's auto-dismiss effect had deps
// `[ready, showMobileHint]`; this hook uses
// `[ready, nodeCount, showHint]`. The added `nodeCount` dep
// means: if the user adds a node while the hint is visible,
// the previously-armed 4s timer is cleared and a fresh 4s timer
// schedules. Negligible UX impact for the 99% case where users
// don't add nodes within the 4s hint window. Pinned by the
// "reschedules a fresh 4s timer when deps change before fire"
// test in useMobileHint.test.ts.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { safeGetItem, safeSetItem } from './storageHelpers';

/** sessionStorage key the dismissal flag is written under. */
export const MOBILE_HINT_KEY = 'axon_map_mobile_hint_seen';

export interface UseMobileHintOptions {
  /** Whether the underlying graph has finished its first layout. */
  ready: boolean;
  /** Number of rendered nodes. The auto-dismiss timer only arms
   *  when there is at least one node — pre-data renders don't
   *  burn the 4-second budget. */
  nodeCount: number;
}

export interface UseMobileHintResult {
  /** True if the mobile hint pill should be visible. */
  showHint: boolean;
  /** Programmatically dismiss the hint (also writes the seen flag). */
  dismiss: () => void;
}

/**
 * Manage the mobile-hint visibility flag for KnowledgeGraph.
 *
 * The hint is initially visible iff the sessionStorage flag is
 * absent. Once `ready && nodeCount > 0 && showHint` is true the
 * hook arms a 4s timer that flips `showHint` to false and writes
 * the flag. The timer is cleared on unmount or whenever the deps
 * change before it fires (e.g. parent calls `dismiss()` first).
 */
export function useMobileHint(opts: UseMobileHintOptions): UseMobileHintResult {
  const { ready, nodeCount } = opts;

  const [showHint, setShowHint] = useState<boolean>(
    () => !safeGetItem(MOBILE_HINT_KEY, sessionStorage),
  );

  // Track the live timer so dismiss() can cancel it. We don't strictly
  // need this for correctness (a late timer's setShowHint(false) is
  // idempotent), but it avoids a redundant safeSetItem after dismiss().
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
    setShowHint(false);
    safeSetItem(MOBILE_HINT_KEY, '1', sessionStorage);
  }, []);

  useEffect(() => {
    if (!ready || nodeCount <= 0 || !showHint) return;
    const hintTimer = setTimeout(() => {
      setShowHint(false);
      safeSetItem(MOBILE_HINT_KEY, '1', sessionStorage);
      hintTimerRef.current = null;
    }, 4000);
    hintTimerRef.current = hintTimer;
    return () => {
      clearTimeout(hintTimer);
      if (hintTimerRef.current === hintTimer) hintTimerRef.current = null;
    };
  }, [ready, nodeCount, showHint]);

  return { showHint, dismiss };
}
