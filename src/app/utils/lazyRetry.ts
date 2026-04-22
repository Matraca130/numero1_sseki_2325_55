// ============================================================
// Axon — Lazy Import Retry (survives stale chunks after deploy)
//
// When Vite rebuilds, chunk hashes change. Users with a cached
// main bundle still reference old hashes → "Failed to fetch
// dynamically imported module". This wrapper:
//   1. Catches the fetch error
//   2. Sets a sessionStorage flag
//   3. Reloads the page ONCE (gets new manifest)
//   4. If already retried, throws (hits error boundary)
// ============================================================

const RETRY_KEY = 'axon-chunk-retry';

// In-memory fallback for private-browsing contexts where sessionStorage throws
// SecurityError. We still want loop-prevention across this chunk-retry flow
// even when storage is unavailable (the reload clears it anyway).
let _memRetry = false;

function getRetried(): boolean {
  try {
    return sessionStorage.getItem(RETRY_KEY) === '1';
  } catch {
    return _memRetry;
  }
}

function setRetried(): void {
  _memRetry = true;
  try { sessionStorage.setItem(RETRY_KEY, '1'); } catch { /* private mode */ }
}

function clearRetried(): void {
  _memRetry = false;
  try { sessionStorage.removeItem(RETRY_KEY); } catch { /* private mode */ }
}

/**
 * Wraps a dynamic import with stale-chunk detection and auto-reload.
 *
 * Usage in route files:
 * ```ts
 * lazy: () => lazyRetry(() => import('./MyComponent')).then(m => ({ Component: m.MyComponent }))
 * ```
 */
export function lazyRetry<T>(importFn: () => Promise<T>): Promise<T> {
  return importFn().catch((error: unknown) => {
    const isChunkError =
      error instanceof TypeError &&
      (error.message.includes('dynamically imported module') ||
       error.message.includes('Failed to fetch') ||
       error.message.includes('Loading chunk') ||
       error.message.includes('is not a valid JavaScript MIME type'));

    if (!isChunkError) {
      throw error;
    }

    // Prevent infinite reload loop: only retry once per session.
    if (getRetried()) {
      clearRetried();
      throw error;
    }

    // Mark that we're retrying and reload to get new chunk manifest
    setRetried();
    if (import.meta.env.DEV) {
      console.warn('[lazyRetry] Stale chunk detected, reloading...', error.message);
    }
    window.location.reload();

    // Return a never-resolving promise (page is reloading)
    return new Promise<T>(() => {});
  });
}
