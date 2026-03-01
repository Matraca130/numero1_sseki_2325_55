// ============================================================
// Axon — Logger utility
//
// Usage: import { logger } from '@/app/lib/logger';
//   logger.debug('[Quiz] loaded', data);  // Only in dev
//   logger.error('[Quiz] failed', err);   // Always visible
//
// In production builds, debug/info are no-ops.
// ============================================================

const isDev = import.meta.env.DEV;

export const logger = {
  debug: isDev ? console.log.bind(console) : () => {},
  info:  isDev ? console.info.bind(console) : () => {},
  warn:  console.warn.bind(console),
  error: console.error.bind(console),
};
