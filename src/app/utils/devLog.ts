// ============================================================
// Axon — devLog utility
// Logs messages only in development mode.
// Silently no-ops in production builds.
// ============================================================

/**
 * Log a message to the console only in development mode.
 * Accepts the same arguments as console.log.
 */
export function devLog(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.log('[Axon]', ...args);
  }
}

/**
 * Log a warning only in development mode.
 */
export function devWarn(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.warn('[Axon]', ...args);
  }
}

/**
 * Log an error only in development mode.
 */
export function devError(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.error('[Axon]', ...args);
  }
}

export default devLog;
