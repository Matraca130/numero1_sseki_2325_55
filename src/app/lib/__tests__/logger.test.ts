// ============================================================
// Tests for logger.ts — Centralized logging system
//
// Verifies:
//   - Log levels (error, warn, info, debug)
//   - Dev vs Prod behavior
//   - Transport integration
//   - Tag formatting
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, setLogTransport, type LogTransport } from '@/app/lib/logger';

// ── Setup & Teardown ──────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Reset transport before each test
  setLogTransport(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ──────────────────────────────────────────────────────────
// SUITE 1: Transport management
// ──────────────────────────────────────────────────────────

describe('setLogTransport', () => {
  it('sets the global transport', () => {
    const mockTransport = vi.fn() as LogTransport;
    setLogTransport(mockTransport);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('TEST', 'message');

    expect(mockTransport).toHaveBeenCalledWith(
      'error',
      'TEST',
      ['message'],
    );

    consoleSpy.mockRestore();
  });

  it('can clear transport by passing null', () => {
    const mockTransport = vi.fn() as LogTransport;
    setLogTransport(mockTransport);
    setLogTransport(null);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('TEST', 'message');

    // Transport should NOT have been called
    expect(mockTransport).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 2: logger.error()
// ──────────────────────────────────────────────────────────

describe('logger.error()', () => {
  it('logs to console.error with tag prefix', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.error('MyTag', 'something failed');

    expect(consoleSpy).toHaveBeenCalledWith('[MyTag]', 'something failed');
    consoleSpy.mockRestore();
  });

  it('sends to transport when set', () => {
    const mockTransport = vi.fn() as LogTransport;
    setLogTransport(mockTransport);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('ErrorTag', 'fail');

    expect(mockTransport).toHaveBeenCalledWith('error', 'ErrorTag', ['fail']);
    consoleSpy.mockRestore();
  });

  it('handles multiple arguments', () => {
    const mockTransport = vi.fn() as LogTransport;
    setLogTransport(mockTransport);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('MultiArg', 'arg1', 'arg2', { nested: 'object' });

    expect(mockTransport).toHaveBeenCalledWith(
      'error',
      'MultiArg',
      ['arg1', 'arg2', { nested: 'object' }],
    );
    consoleSpy.mockRestore();
  });

  it('is always visible (dev and prod)', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.error('Test', 'error message');

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 3: logger.warn()
// ──────────────────────────────────────────────────────────

describe('logger.warn()', () => {
  it('logs to console.warn in dev', () => {
    // In test environment, import.meta.env.DEV should be true
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logger.warn('WarnTag', 'warning message');

    expect(consoleSpy).toHaveBeenCalledWith('[WarnTag]', 'warning message');
    consoleSpy.mockRestore();
  });

  it('sends to transport', () => {
    const mockTransport = vi.fn() as LogTransport;
    setLogTransport(mockTransport);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('WarnTag', 'warning');

    expect(mockTransport).toHaveBeenCalledWith('warn', 'WarnTag', ['warning']);
    consoleSpy.mockRestore();
  });

  it('handles multiple arguments', () => {
    const mockTransport = vi.fn() as LogTransport;
    setLogTransport(mockTransport);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('Tag', 'msg1', 'msg2', 123);

    expect(mockTransport).toHaveBeenCalledWith(
      'warn',
      'Tag',
      ['msg1', 'msg2', 123],
    );
    consoleSpy.mockRestore();
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 4: logger.info()
// ──────────────────────────────────────────────────────────

describe('logger.info()', () => {
  it('logs to console.info in dev', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    logger.info('InfoTag', 'info message');

    expect(consoleSpy).toHaveBeenCalledWith('[InfoTag]', 'info message');
    consoleSpy.mockRestore();
  });

  it('does NOT send to transport', () => {
    const mockTransport = vi.fn() as LogTransport;
    setLogTransport(mockTransport);

    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('InfoTag', 'info');

    expect(mockTransport).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 5: logger.debug()
// ──────────────────────────────────────────────────────────

describe('logger.debug()', () => {
  it('logs to console.debug in dev', () => {
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    logger.debug('DebugTag', 'debug message');

    expect(consoleSpy).toHaveBeenCalledWith('[DebugTag]', 'debug message');
    consoleSpy.mockRestore();
  });

  it('does NOT send to transport', () => {
    const mockTransport = vi.fn() as LogTransport;
    setLogTransport(mockTransport);

    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logger.debug('DebugTag', 'debug');

    expect(mockTransport).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 6: Complex objects
// ──────────────────────────────────────────────────────────

describe('logger — complex payloads', () => {
  it('handles Error objects', () => {
    const mockTransport = vi.fn() as LogTransport;
    setLogTransport(mockTransport);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('boom');
    logger.error('ErrorLogging', err);

    expect(mockTransport).toHaveBeenCalledWith('error', 'ErrorLogging', [err]);
    consoleSpy.mockRestore();
  });

  it('handles objects and arrays', () => {
    const mockTransport = vi.fn() as LogTransport;
    setLogTransport(mockTransport);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const obj = { id: 123, items: ['a', 'b'] };
    logger.warn('ComplexData', obj);

    expect(mockTransport).toHaveBeenCalledWith('warn', 'ComplexData', [obj]);
    consoleSpy.mockRestore();
  });

  it('handles null and undefined', () => {
    const mockTransport = vi.fn() as LogTransport;
    setLogTransport(mockTransport);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('NullTest', null, undefined);

    expect(mockTransport).toHaveBeenCalledWith('error', 'NullTest', [null, undefined]);
    consoleSpy.mockRestore();
  });
});
