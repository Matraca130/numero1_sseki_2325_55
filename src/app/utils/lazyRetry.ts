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

    // Prevent infinite reload loop: only retry once per session
    const hasRetried = sessionStorage.getItem(RETRY_KEY);
    if (hasRetried) {
      sessionStorage.removeItem(RETRY_KEY);
      throw error;
    }

    // Mark that we're retrying and reload to get new chunk manifest
    sessionStorage.setItem(RETRY_KEY, '1');
    if (import.meta.env.DEV) {
      console.warn('[lazyRetry] Stale chunk detected, reloading...', error.message);
    }
    window.location.reload();

    // Return a never-resolving promise (page is reloading)
    return new Promise<T>(() => {});
  });
}
