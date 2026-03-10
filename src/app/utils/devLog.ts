// ============================================================
// devLog — Development-only logging utilities.
//
// All output is gated behind `import.meta.env.DEV` so that
// production builds tree-shake these calls to no-ops.
// ============================================================

/**
 * Logs a message to the console only in development mode.
 * Accepts the same arguments as `console.log`.
 */
export function devLog(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
}

/**
 * Logs a warning to the console only in development mode.
 * Accepts the same arguments as `console.warn`.
 */
export function devWarn(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
}
