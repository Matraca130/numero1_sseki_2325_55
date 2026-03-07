// ============================================================
// Axon — Centralized Logger
//
// Replaces direct console.error/warn/log across the codebase.
//
// Behavior by environment:
//   ┌──────────┬───────────────────────┬──────────────────────┐
//   │ Method   │ Dev                   │ Prod                 │
//   ├──────────┼───────────────────────┼──────────────────────┤
//   │ error()  │ console.error + xport │ console.error + xport│
//   │ warn()   │ console.warn  + xport │ transport only       │
//   │ info()   │ console.info          │ silent               │
//   │ debug()  │ console.debug         │ silent               │
//   └──────────┴───────────────────────┴──────────────────────┘
//
// Transport: pluggable sink for Sentry, LogFlare, etc.
//   import { setLogTransport } from '@/app/lib/logger';
//   setLogTransport((level, tag, args) => {
//     if (level === 'error') Sentry.captureException(args[0]);
//   });
//
// Usage:
//   import { logger } from '@/app/lib/logger';
//   logger.error('ModelManager', 'fetch error:', err);
// ============================================================

const IS_DEV = import.meta.env.DEV;

// ── Pluggable transport ───────────────────────────────────

export type LogLevel = 'error' | 'warn' | 'info';

export type LogTransport = (
  level: LogLevel,
  tag: string,
  args: unknown[],
) => void;

let _transport: LogTransport | null = null;

/**
 * Set (or clear) the remote log transport.
 * Call once at app startup, e.g. in main.tsx.
 *
 * @example
 *   setLogTransport((level, tag, args) => {
 *     if (level === 'error') Sentry.captureException(args[0]);
 *   });
 */
export function setLogTransport(transport: LogTransport | null): void {
  _transport = transport;
}

// ── Logger ────────────────────────────────────────────────

export const logger = {
  /**
   * ALWAYS logs (dev + prod). Errors should never be invisible.
   * Forwards to transport for remote monitoring.
   */
  error(tag: string, ...args: unknown[]): void {
    console.error(`[${tag}]`, ...args);
    _transport?.('error', tag, args);
  },

  /**
   * Console only in dev. Always forwards to transport.
   */
  warn(tag: string, ...args: unknown[]): void {
    if (IS_DEV) console.warn(`[${tag}]`, ...args);
    _transport?.('warn', tag, args);
  },

  /**
   * Dev-only. No transport (info is too noisy for remote).
   */
  info(tag: string, ...args: unknown[]): void {
    if (IS_DEV) console.info(`[${tag}]`, ...args);
  },

  /**
   * Dev-only. No transport.
   */
  debug(tag: string, ...args: unknown[]): void {
    if (IS_DEV) console.debug(`[${tag}]`, ...args);
  },
};
