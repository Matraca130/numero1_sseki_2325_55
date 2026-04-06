// ============================================================
// useReadingTimeTracker — Reliable reading time persistence
//
// Problem solved: StudentSummaryReader only saved time_spent_seconds
// on unmount (async cleanup, unreliable) or "mark completed" click.
// If the student read for 30 min and closed the tab, time was LOST.
//
// Solution: 3-layer persistence strategy:
//   1. Periodic save every 30s (reliable while tab is active)
//   2. visibilitychange → save when tab becomes hidden
//   3. beforeunload → fetch with keepalive:true (survives page unload)
//   4. Unmount cleanup (best-effort)
//
// Race condition safety:
//   External callers (e.g. markCompleted) must call `snapshotForExternalSave()`
//   BEFORE their own API call. This atomically captures the current total
//   and resets the session clock so the periodic save won't overlap.
// ============================================================

import { useRef, useEffect, useCallback } from 'react';
import { API_BASE, ANON_KEY, getAccessToken } from '@/app/lib/api';
import * as studentApi from '@/app/services/studentSummariesApi';

const SAVE_INTERVAL_MS = 30_000; // 30 seconds
const MIN_ELAPSED_TO_SAVE = 5;   // don't save trivial amounts (<5s)

export function useReadingTimeTracker(
  summaryId: string,
  initialTimeSpent: number,
  getScrollPosition?: () => number | undefined,
) {
  // Accumulated total from the DB (updated after each successful save)
  const accumulatedRef = useRef(initialTimeSpent);
  // Timestamp of the last save (or mount). Elapsed = now - lastSave.
  const lastSaveTimeRef = useRef(Date.now());
  // Guard against concurrent saves (periodic + visibility)
  const savingRef = useRef(false);

  // Sync from prop — use Math.max to never overwrite a higher local value.
  // This handles: markCompleted returns 125 from API, but tracker already
  // has 125 in accumulatedRef. We take the max to be safe.
  useEffect(() => {
    accumulatedRef.current = Math.max(accumulatedRef.current, initialTimeSpent);
  }, [initialTimeSpent]);

  // ── Core save function ──────────────────────────────────
  const save = useCallback(async () => {
    if (savingRef.current) return;

    const now = Date.now();
    const sessionElapsed = Math.round((now - lastSaveTimeRef.current) / 1000);

    if (sessionElapsed < MIN_ELAPSED_TO_SAVE) return;

    savingRef.current = true;
    const newTotal = accumulatedRef.current + sessionElapsed;

    const scrollPos = getScrollPosition?.();
    try {
      await studentApi.upsertReadingState({
        summary_id: summaryId,
        time_spent_seconds: newTotal,
        last_read_at: new Date().toISOString(),
        ...(scrollPos != null && { scroll_position: scrollPos }),
      });

      // Success: update refs so next save doesn't double-count
      accumulatedRef.current = newTotal;
      lastSaveTimeRef.current = Date.now();
    } catch (err) {
      // PN-3: Guard console.warn — silently fail, will retry on next interval
      if (import.meta.env.DEV) {
        console.warn('[ReadingTimeTracker] Save failed:', err);
      }
    } finally {
      savingRef.current = false;
    }
  }, [summaryId]);

  // ── Fire-and-forget save (for beforeunload) ─────────────
  // Uses fetch with keepalive:true which survives page unload
  const saveBeacon = useCallback(() => {
    const sessionElapsed = Math.round(
      (Date.now() - lastSaveTimeRef.current) / 1000,
    );
    if (sessionElapsed < MIN_ELAPSED_TO_SAVE) return;

    const total = accumulatedRef.current + sessionElapsed;
    const token = getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
    };
    if (token) headers['X-Access-Token'] = token;

    const scrollPos = getScrollPosition?.();
    try {
      fetch(`${API_BASE}/reading-states`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          summary_id: summaryId,
          time_spent_seconds: total,
          last_read_at: new Date().toISOString(),
          ...(scrollPos != null && { scroll_position: scrollPos }),
        }),
        keepalive: true, // browser completes request even after page unloads
      });
      // Don't await — fire and forget
    } catch {
      // Last resort failed — nothing else we can do
    }
  }, [summaryId]);

  // ── Layer 1: Periodic save every 30s ────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      save().catch(() => {});
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [save]);

  // ── Layer 2: Save on visibilitychange (tab hidden) ──────
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden') {
        save().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [save]);

  // ── Layer 3: Save on beforeunload (keepalive fetch) ─────
  useEffect(() => {
    const handler = () => saveBeacon();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveBeacon]);

  // ── Layer 4: Unmount cleanup (best-effort) ──────────────
  useEffect(() => {
    return () => {
      // Fire and forget — React doesn't wait for async cleanup
      save().catch(() => {});
    };
  }, [save]);

  // ── Public API ──────────────────────────────────────────

  /**
   * Atomically snapshot the current total AND reset the session clock.
   * Call this BEFORE your own upsertReadingState (e.g. markCompleted)
   * so the periodic save won't race with your call.
   *
   * Returns the total time_spent_seconds to send to the API.
   */
  const snapshotForExternalSave = useCallback(() => {
    const sessionElapsed = Math.round(
      (Date.now() - lastSaveTimeRef.current) / 1000,
    );
    const total = accumulatedRef.current + sessionElapsed;
    // Reset session: periodic save will see 0 elapsed and skip
    accumulatedRef.current = total;
    lastSaveTimeRef.current = Date.now();
    return total;
  }, []);

  /** Get current total time including unsaved session elapsed (read-only) */
  const getCurrentTotal = useCallback(() => {
    const sessionElapsed = Math.round(
      (Date.now() - lastSaveTimeRef.current) / 1000,
    );
    return accumulatedRef.current + sessionElapsed;
  }, []);

  return {
    /** Manually trigger a save (e.g. on mark completed) */
    save,
    /** Atomic snapshot + reset — use before external upsert calls */
    snapshotForExternalSave,
    /** Get total time including unsaved session (read-only, no side effects) */
    getCurrentTotal,
  };
}
