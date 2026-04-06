// ============================================================
// useScrollPositionSave — Persist reader position to sessionStorage
//
// Writes activeBlockId + viewMode + contentPage to sessionStorage
// on every change (debounced 500ms). Also exposes getScrollPercentage()
// for the reading time tracker to include in API saves.
// ============================================================

import { useEffect, useRef, useCallback } from 'react';

const STORAGE_PREFIX = 'axon_reader_pos_';
const DEBOUNCE_MS = 500;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface ScrollPositionData {
  activeBlockId: string | null;
  viewMode: 'enriched' | 'reading';
  contentPage: number;
  timestamp: number;
}

export function useScrollPositionSave(
  summaryId: string,
  activeBlockId: string | null,
  viewMode: 'enriched' | 'reading',
  contentPage: number,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced save to sessionStorage
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const data: ScrollPositionData = {
          activeBlockId,
          viewMode,
          contentPage,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(
          `${STORAGE_PREFIX}${summaryId}`,
          JSON.stringify(data),
        );
      } catch {
        // sessionStorage quota exceeded or unavailable — ignore
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [summaryId, activeBlockId, viewMode, contentPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const getScrollPercentage = useCallback(
    (containerRef: React.RefObject<HTMLElement | null>) => {
      const el = containerRef?.current;
      if (!el) return undefined;

      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight;
      const clientHeight = el.clientHeight;
      const max = scrollHeight - clientHeight;

      if (max <= 0) return 0;
      return Math.min(100, Math.round((scrollTop / max) * 100));
    },
    [],
  );

  return { getScrollPercentage };
}

/** Read saved position from sessionStorage (synchronous, for initialization) */
export function readSavedPosition(summaryId: string): ScrollPositionData | null {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${summaryId}`);
    if (!raw) return null;

    const data: ScrollPositionData = JSON.parse(raw);

    // TTL check
    if (Date.now() - data.timestamp > TTL_MS) {
      sessionStorage.removeItem(`${STORAGE_PREFIX}${summaryId}`);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}
