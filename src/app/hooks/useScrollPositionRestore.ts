// ============================================================
// useScrollPositionRestore — Restore reader position after refresh
//
// On mount: reads sessionStorage for activeBlockId/viewMode/contentPage.
// Returns initial values for state + a restoreScroll() function that
// uses MutationObserver to wait for the target block to appear in DOM,
// then scrolls to it. Falls back to DB scroll_position percentage.
// ============================================================

import { useRef, useCallback, useEffect } from 'react';
import { readSavedPosition } from '@/app/hooks/useScrollPositionSave';

const RESTORE_TIMEOUT_MS = 5_000;

interface RestoreResult {
  initialViewMode: 'enriched' | 'reading' | null;
  initialContentPage: number | null;
  restoreScroll: (containerRef: React.RefObject<HTMLElement | null>) => void;
}

export function useScrollPositionRestore(
  summaryId: string,
  dbScrollPosition: number | null,
): RestoreResult {
  const restoredRef = useRef(false);
  const savedRef = useRef(readSavedPosition(summaryId));
  const saved = savedRef.current;
  // Track observer/timeout for cleanup on unmount
  const cleanupRef = useRef<{ observer?: MutationObserver; timeout?: ReturnType<typeof setTimeout> }>({});

  useEffect(() => {
    return () => {
      cleanupRef.current.observer?.disconnect();
      clearTimeout(cleanupRef.current.timeout);
    };
  }, []);

  const restoreScroll = useCallback(
    (containerRef: React.RefObject<HTMLElement | null>) => {
      if (restoredRef.current) return;
      restoredRef.current = true;

      const container = containerRef?.current;
      if (!container) return;

      const blockId = saved?.activeBlockId;

      // Strategy 1: Scroll to saved block ID
      if (blockId) {
        const existing = container.querySelector(`[data-block-id="${blockId}"]`);
        if (existing) {
          existing.scrollIntoView({ behavior: 'instant', block: 'start' });
          return;
        }

        // Block not yet in DOM — watch for it with MutationObserver
        const observer = new MutationObserver(() => {
          const el = container.querySelector(`[data-block-id="${blockId}"]`);
          if (el) {
            observer.disconnect();
            clearTimeout(cleanupRef.current.timeout);
            el.scrollIntoView({ behavior: 'instant', block: 'start' });
          }
        });

        observer.observe(container, { childList: true, subtree: true });
        cleanupRef.current.observer = observer;

        cleanupRef.current.timeout = setTimeout(() => {
          observer.disconnect();
          // Fallback to percentage after timeout
          restoreByPercentage(container, dbScrollPosition);
        }, RESTORE_TIMEOUT_MS);

        return;
      }

      // Strategy 2: Restore from DB scroll percentage
      restoreByPercentage(container, dbScrollPosition);
    },
    [saved?.activeBlockId, dbScrollPosition],
  );

  return {
    initialViewMode: saved?.viewMode ?? null,
    initialContentPage: saved?.contentPage ?? null,
    restoreScroll,
  };
}

function restoreByPercentage(
  container: HTMLElement,
  percentage: number | null,
) {
  if (percentage == null || percentage <= 0) return;

  const max = container.scrollHeight - container.clientHeight;
  if (max <= 0) return;

  const targetScroll = Math.round((percentage / 100) * max);
  container.scrollTo({ top: targetScroll, behavior: 'instant' });
}
