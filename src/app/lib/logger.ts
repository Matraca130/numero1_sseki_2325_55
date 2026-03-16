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
// Usage (two styles, both valid):
//
//   // Style A — direct methods:
//   import { logger } from '@/app/lib/logger';
//   logger.error('ModelManager', 'fetch error:', err);
//
//   // Style B — factory (scoped tag):
//   import { logger } from '@/app/lib/logger';
//   const log = logger('ModelManager');
//   log.error('fetch error:', err);
//
//   // errStatus — extract HTTP status from Error message:
//   import { errStatus } from '@/app/lib/logger';
//   if (errStatus(err) === 404) { ... }
// ============================================================

const IS_DEV = import.meta.env?.DEV ?? false;

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
 */
export function setLogTransport(transport: LogTransport | null): void {
  _transport = transport;
}

// ── Core log methods ──────────────────────────────────────

const _logMethods = {
  error(tag: string, ...args: unknown[]): void {
    console.error(`[${tag}]`, ...args);
    _transport?.('error', tag, args);
  },
  warn(tag: string, ...args: unknown[]): void {
    if (IS_DEV) console.warn(`[${tag}]`, ...args);
    _transport?.('warn', tag, args);
  },
  info(tag: string, ...args: unknown[]): void {
    if (IS_DEV) console.info(`[${tag}]`, ...args);
  },
  debug(tag: string, ...args: unknown[]): void {
    if (IS_DEV) console.debug(`[${tag}]`, ...args);
  },
};

// ── Scoped logger type ────────────────────────────────────

export interface ScopedLogger {
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  info(...args: unknown[]): void;
  debug(...args: unknown[]): void;
}

/**
 * Create a scoped logger with a pre-bound tag.
 * @example
 *   const log = createLogger('MyComponent');
 *   log.error('something broke:', err);
 */
export function createLogger(tag: string): ScopedLogger {
  return {
    error: (...args: unknown[]) => _logMethods.error(tag, ...args),
    warn: (...args: unknown[]) => _logMethods.warn(tag, ...args),
    info: (...args: unknown[]) => _logMethods.info(tag, ...args),
    debug: (...args: unknown[]) => _logMethods.debug(tag, ...args),
  };
}

// ── Dual-mode logger (object + callable factory) ──────────
// Supports both:
//   logger.error('Tag', ...)   — direct method call
//   logger('Tag')              — factory, returns scoped logger

type LoggerDual = typeof _logMethods & ((tag: string) => ScopedLogger);

export const logger: LoggerDual = new Proxy(_logMethods as LoggerDual, {
  apply(_target, _thisArg, argArray: [string]) {
    return createLogger(argArray[0]);
  },
}) as LoggerDual;

// ── errStatus helper ──────────────────────────────────────

/**
 * Extract HTTP status code from an Error message.
 * Returns 0 if no status code found.
 *
 * Works with apiCall errors which include status in the message:
 *   "API Error 404", "Proxy returned 404 while routing", etc.
 *
 * @example
 *   if (errStatus(err) === 404) { ... }
 */
export function errStatus(err: unknown): number {
  if (err instanceof Error) {
    const match = err.message.match(/\b([45]\d{2})\b/);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
}
