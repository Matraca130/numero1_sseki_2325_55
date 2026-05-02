// ============================================================
// Axon — useEscapeCancel hook
//
// Document-level Escape-key listener that fires onCancel when
// `isActive()` returns true. Used by useDragConnect and
// useEdgeReconnect to cancel an in-flight drag.
//
// Extracted in cycle #48 (was duplicated as ~12 LOC across
// useDragConnect.ts and useEdgeReconnect.ts).
//
// Behavior preserved verbatim:
//   - listener bound on `document` with { capture: true } so it
//     fires before bubble-phase handlers that may stopPropagation
//   - Escape only fires onCancel when isActive() returns truthy
//   - preventDefault + stopPropagation are called BEFORE onCancel
//   - listener is unbound symmetrically with the same { capture: true }
//
// The host typically passes an onCancel that synthesises a
// PointerEvent('pointercancel') and forwards it to its real
// pointer-cancel handler, so the synthetic-dispatch idiom remains
// at the host (and remains testable there).
// ============================================================

import { useEffect } from 'react';

export interface UseEscapeCancelOptions {
  /** When true, the hook installs the listener. Pass `false` to disable. */
  enabled: boolean;
  /** Returns truthy when an Escape press should fire onCancel. */
  isActive: () => boolean;
  /** Called after preventDefault + stopPropagation when isActive() is true. */
  onCancel: () => void;
}

export function useEscapeCancel({
  enabled,
  isActive,
  onCancel,
}: UseEscapeCancelOptions): void {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isActive()) {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [enabled, isActive, onCancel]);
}
