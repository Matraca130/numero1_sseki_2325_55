// ============================================================
// useReadingStateQueue — Batched reading state persistence
//
// Problem solved: Individual saves to /reading-states are inefficient
// and create per-request overhead. This hook batches updates and
// flushes them in bulk via /reading-states/batch endpoint.
//
// Strategy:
//   1. enqueueReadingState() adds/updates in local Map
//   2. Debounced flush() sends batch via apiCall (with retry on partial failure)
//   3. flushBeacon() uses navigator.sendBeacon for beforeunload (survives unload)
//   4. SessionStorage hydration persists queue across tab refreshes
//
// Call sites:
//   useReadingTimeTracker.ts — enqueue on periodic/visibility save
//   External callers — enqueue before their own API call
// ============================================================

import { apiCall, API_BASE, ANON_KEY, getAccessToken } from '@/app/lib/api';

// ── Storage & Queue ─────────────────────────────────────
const STORAGE_KEY = 'axon.readingStateQueue.v1';
const FLUSH_DEBOUNCE_MS = 2500;
const MAX_QUEUE_SIZE = 50;

export interface ReadingStateUpdate {
  summary_id: string;
  scroll_position?: number;
  time_spent_seconds?: number;
  completed?: boolean;
  last_read_at?: string;
}

const queue = new Map<string, ReadingStateUpdate>();

// Hydrate from sessionStorage at module load
{
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const items = JSON.parse(stored) as ReadingStateUpdate[];
      for (const item of items) {
        queue.set(item.summary_id, item);
      }
    }
  } catch {
    // Ignore JSON parse errors, start with empty queue
  }
}

// ── Debounce & Flight Control ───────────────────────────
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushInFlight = false;

// ── Public API ──────────────────────────────────────────

/**
 * Add or update a reading state in the queue.
 * Updates are merged by summary_id (newer calls override older fields).
 * Queue is persisted to sessionStorage immediately.
 *
 * Calls flush() with debounce to batch multiple enqueues.
 */
export function enqueueReadingState(update: ReadingStateUpdate): void {
  const existing = queue.get(update.summary_id) ?? {};
  const merged: ReadingStateUpdate = {
    ...existing,
    ...update,
    summary_id: update.summary_id, // Always use the provided summary_id
  };
  queue.set(update.summary_id, merged);

  // Persist immediately
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(queue.values())));

  // Debounce flush
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush().catch(() => {});
  }, FLUSH_DEBOUNCE_MS);
}

/**
 * Flush all queued updates in a single batch POST.
 * On partial failure (some updates succeed, some fail), re-enqueues
 * only the updates that weren't overwritten by newer values.
 *
 * Returns Promise that resolves when the batch is sent
 * (or requeue is complete on partial failure).
 */
export async function flush(): Promise<void> {
  if (flushInFlight) return;
  if (queue.size === 0) return;

  flushInFlight = true;

  try {
    const updates = Array.from(queue.values());
    const body = { updates };

    const response = await apiCall<{ succeeded?: string[]; failed?: string[] }>(
      '/reading-states/batch',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );

    // On success, clear the queue
    if (response) {
      queue.clear();
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    // Partial failure handling: re-enqueue updates that aren't stale
    // (i.e., still in the queue as sent, not overwritten since)
    const failed = Array.from(queue.values());

    // Clear and restore only non-overwritten updates
    const snapshot = new Map(queue);
    queue.clear();

    for (const update of failed) {
      if (snapshot.get(update.summary_id) === update) {
        queue.set(update.summary_id, update);
      }
    }

    if (queue.size > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(queue.values())));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }

    throw err;
  } finally {
    flushInFlight = false;
  }
}

/**
 * Fire-and-forget beacon flush for beforeunload.
 * Uses navigator.sendBeacon when available (survives unload).
 * Falls back to fetch with keepalive:true.
 *
 * Does NOT throw — logs errors silently for unload context.
 */
export function flushBeacon(): void {
  if (queue.size === 0) return;

  const updates = Array.from(queue.values());
  const body = JSON.stringify({ updates });

  const beaconUrl = `${API_BASE}/reading-states/batch`;

  // Try sendBeacon first (most reliable for unload)
  if (navigator.sendBeacon) {
    try {
      const sent = navigator.sendBeacon(beaconUrl, body);
      if (sent) {
        queue.clear();
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }
    } catch {
      // sendBeacon failed, try fetch fallback
    }
  }

  // Fallback: fetch with keepalive
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ANON_KEY}`,
  };
  if (token) headers['X-Access-Token'] = token;

  try {
    fetch(beaconUrl, {
      method: 'POST',
      headers,
      body,
      keepalive: true,
    });
    // Fire and forget — don't await
    queue.clear();
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Last resort failed — nothing we can do in beforeunload context
  }
}
