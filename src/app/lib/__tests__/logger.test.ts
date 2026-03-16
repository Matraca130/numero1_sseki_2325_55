// ============================================================
// TEST: logger.ts — errStatus helper + dual-mode logger
//
// Verifies:
//   - errStatus: HTTP status extraction from Error messages
//   - logger('Tag'): factory mode returns scoped logger
//   - logger.error(): direct method mode still works
//   - createLogger(): explicit factory function
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { errStatus, createLogger, logger } from '../logger';

// ── errStatus ────────────────────────────────────────────

describe('errStatus', () => {
  it('should extract 404 from "API Error 404"', () => {
    expect(errStatus(new Error('API Error 404'))).toBe(404);
  });

  it('should extract 500 from "Internal Server Error 500"', () => {
    expect(errStatus(new Error('Internal Server Error 500'))).toBe(500);
  });

  it('should extract 401 from "Unauthorized 401"', () => {
    expect(errStatus(new Error('Unauthorized 401'))).toBe(401);
  });

  it('should extract 404 from verbose message', () => {
    expect(errStatus(new Error('Proxy returned 404 while routing to upstream'))).toBe(404);
  });

  it('should return 0 for Error without status code', () => {
    expect(errStatus(new Error('Failed to fetch'))).toBe(0);
  });

  it('should return 0 for non-Error values', () => {
    expect(errStatus('some string')).toBe(0);
    expect(errStatus(null)).toBe(0);
    expect(errStatus(undefined)).toBe(0);
    expect(errStatus(42)).toBe(0);
  });

  it('should not match non-HTTP status numbers', () => {
    // 200, 301 are not 4xx/5xx
    expect(errStatus(new Error('Success 200'))).toBe(0);
    expect(errStatus(new Error('Redirect 301'))).toBe(0);
  });

  it('should extract first matching status from multi-code message', () => {
    expect(errStatus(new Error('Error 404 then 500'))).toBe(404);
  });
});

// ── createLogger ─────────────────────────────────────────

describe('createLogger', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return an object with error/warn/info/debug methods', () => {
    const log = createLogger('TestTag');
    expect(typeof log.error).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.info).toBe('function');
    expect(typeof log.debug).toBe('function');
  });

  it('error() should log with [Tag] prefix', () => {
    const log = createLogger('MyComponent');
    log.error('something broke', 42);
    expect(errorSpy).toHaveBeenCalledWith('[MyComponent]', 'something broke', 42);
  });
});

// ── logger dual mode ─────────────────────────────────────

describe('logger dual mode', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should work as direct object: logger.error(tag, ...args)', () => {
    logger.error('DirectTag', 'test message');
    expect(errorSpy).toHaveBeenCalledWith('[DirectTag]', 'test message');
  });

  it('should work as factory: logger(tag) returns scoped logger', () => {
    const log = (logger as any)('FactoryTag');
    expect(typeof log.error).toBe('function');
    log.error('factory message');
    expect(errorSpy).toHaveBeenCalledWith('[FactoryTag]', 'factory message');
  });

  it('should have all 4 methods on direct logger', () => {
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });
});
