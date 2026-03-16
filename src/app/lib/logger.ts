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

const IS_DEV = typeof import.meta !== 'undefined' && import.meta.env?.DEV || false;

// ── Pluggable transport ───────────────────────────────────

export type LogLevel = 'error' | 'warn' | 'info';

export type LogTransport = (
  level: LogLevel,
  tag: string,
  args: unknown[],
) => void;

let _transport: LogTransport | null = null;

export function setLogTransport(transport: LogTransport | null): void {
  _transport = transport;
}

// ── Scoped logger type ────────────────────────────────────

export interface ScopedLogger {
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  info(...args: unknown[]): void;
  debug(...args: unknown[]): void;
}

// ── Core log implementations ─────────────────────────────

function _error(tag: string, ...args: unknown[]): void {
  console.error(`[${tag}]`, ...args);
  _transport?.('error', tag, args);
}

function _warn(tag: string, ...args: unknown[]): void {
  if (IS_DEV) console.warn(`[${tag}]`, ...args);
  _transport?.('warn', tag, args);
}

function _info(tag: string, ...args: unknown[]): void {
  if (IS_DEV) console.info(`[${tag}]`, ...args);
}

function _debug(tag: string, ...args: unknown[]): void {
  if (IS_DEV) console.debug(`[${tag}]`, ...args);
}

// ── createLogger factory ─────────────────────────────────

/**
 * Create a scoped logger with a pre-bound tag.
 * @example
 *   const log = createLogger('MyComponent');
 *   log.error('something broke:', err);
 */
export function createLogger(tag: string): ScopedLogger {
  return {
    error: (...args: unknown[]) => _error(tag, ...args),
    warn: (...args: unknown[]) => _warn(tag, ...args),
    info: (...args: unknown[]) => _info(tag, ...args),
    debug: (...args: unknown[]) => _debug(tag, ...args),
  };
}

// ── Dual-mode logger ─────────────────────────────────────
// Supports both:
//   logger.error('Tag', ...)   — direct method call
//   logger('Tag')              — factory, returns scoped logger
//
// Implementation: a real function with methods assigned as properties.
// This is the classic JS pattern (works everywhere, no Proxy needed).

interface LoggerFunction {
  (tag: string): ScopedLogger;
  error(tag: string, ...args: unknown[]): void;
  warn(tag: string, ...args: unknown[]): void;
  info(tag: string, ...args: unknown[]): void;
  debug(tag: string, ...args: unknown[]): void;
}

function _loggerFactory(tag: string): ScopedLogger {
  return createLogger(tag);
}

// Assign direct methods to the function object
_loggerFactory.error = _error;
_loggerFactory.warn = _warn;
_loggerFactory.info = _info;
_loggerFactory.debug = _debug;

export const logger: LoggerFunction = _loggerFactory as LoggerFunction;

// ── errStatus helper ──────────────────────────────────────

/**
 * Extract HTTP status code from an Error message.
 * Returns 0 if no status code found.
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
