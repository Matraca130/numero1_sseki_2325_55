// ============================================================
// Tests for getErrorMessage.ts — Error message extraction
//
// Verifies:
//   - getErrorMessage() extraction from various types
//   - hasHttpStatus() detection
//   - Handling of different error formats
// ============================================================

import { describe, it, expect } from 'vitest';
import { getErrorMessage, hasHttpStatus } from '@/app/utils/getErrorMessage';

// ──────────────────────────────────────────────────────────
// SUITE 1: getErrorMessage()
// ──────────────────────────────────────────────────────────

describe('getErrorMessage()', () => {
  it('extracts message from Error instance', () => {
    const err = new Error('Something failed');
    const msg = getErrorMessage(err);
    expect(msg).toBe('Something failed');
  });

  it('extracts message from TypeError', () => {
    const err = new TypeError('Cannot read property x');
    const msg = getErrorMessage(err);
    expect(msg).toBe('Cannot read property x');
  });

  it('extracts message from RangeError', () => {
    const err = new RangeError('Invalid range');
    const msg = getErrorMessage(err);
    expect(msg).toBe('Invalid range');
  });

  it('returns string input unchanged', () => {
    const msg = getErrorMessage('Error string');
    expect(msg).toBe('Error string');
  });

  it('returns default for number', () => {
    const msg = getErrorMessage(404);
    // Numbers are not Error or string, so returns default
    expect(msg).toBe('Error desconocido');
  });

  it('converts null to default message', () => {
    const msg = getErrorMessage(null);
    expect(msg).toBe('Error desconocido');
  });

  it('converts undefined to default message', () => {
    const msg = getErrorMessage(undefined);
    expect(msg).toBe('Error desconocido');
  });

  it('converts object without message to default', () => {
    const msg = getErrorMessage({ code: 'ERR_CODE' });
    expect(msg).toBe('Error desconocido');
  });

  it('converts empty string to itself', () => {
    const msg = getErrorMessage('');
    expect(msg).toBe('');
  });

  it('handles error with special characters', () => {
    const err = new Error('Error: "something" failed [code: 123]');
    const msg = getErrorMessage(err);
    expect(msg).toBe('Error: "something" failed [code: 123]');
  });

  it('handles multiline error message', () => {
    const err = new Error('Line 1\nLine 2\nLine 3');
    const msg = getErrorMessage(err);
    expect(msg).toContain('Line 1');
    expect(msg).toContain('Line 2');
  });

  it('returns "Error desconocido" for unknown types', () => {
    const msg = getErrorMessage(Symbol('error'));
    expect(msg).toBe('Error desconocido');
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 2: hasHttpStatus()
// ──────────────────────────────────────────────────────────

describe('hasHttpStatus()', () => {
  it('detects 404 status', () => {
    const err = { status: 404, message: 'Not found' };
    expect(hasHttpStatus(err, 404)).toBe(true);
  });

  it('detects 500 status', () => {
    const err = { status: 500, message: 'Server error' };
    expect(hasHttpStatus(err, 500)).toBe(true);
  });

  it('detects 400 status', () => {
    const err = { status: 400, message: 'Bad request' };
    expect(hasHttpStatus(err, 400)).toBe(true);
  });

  it('detects 401 status', () => {
    const err = { status: 401, message: 'Unauthorized' };
    expect(hasHttpStatus(err, 401)).toBe(true);
  });

  it('detects 403 status', () => {
    const err = { status: 403, message: 'Forbidden' };
    expect(hasHttpStatus(err, 403)).toBe(true);
  });

  it('returns false when status does not match', () => {
    const err = { status: 404, message: 'Not found' };
    expect(hasHttpStatus(err, 500)).toBe(false);
  });

  it('returns false when object has no status property', () => {
    const err = { message: 'Error' };
    expect(hasHttpStatus(err, 404)).toBe(false);
  });

  it('returns false for null', () => {
    expect(hasHttpStatus(null, 404)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(hasHttpStatus(undefined, 404)).toBe(false);
  });

  it('returns false for string', () => {
    expect(hasHttpStatus('error', 404)).toBe(false);
  });

  it('returns false for number', () => {
    expect(hasHttpStatus(404, 404)).toBe(false);
  });

  it('returns false for object with wrong status type', () => {
    const err = { status: '404' };
    expect(hasHttpStatus(err, 404)).toBe(false);
  });

  it('returns false for Error instance without status property', () => {
    const err = new Error('Not found');
    expect(hasHttpStatus(err, 404)).toBe(false);
  });

  it('detects status in Error-like object', () => {
    const err = new Error('Not found') as Error & { status?: number };
    err.status = 404;
    expect(hasHttpStatus(err, 404)).toBe(true);
  });

  it('handles various status codes', () => {
    expect(hasHttpStatus({ status: 200 }, 200)).toBe(true);
    expect(hasHttpStatus({ status: 201 }, 201)).toBe(true);
    expect(hasHttpStatus({ status: 204 }, 204)).toBe(true);
    expect(hasHttpStatus({ status: 301 }, 301)).toBe(true);
    expect(hasHttpStatus({ status: 302 }, 302)).toBe(true);
  });

  it('returns false when status is falsy but exists', () => {
    expect(hasHttpStatus({ status: 0 }, 0)).toBe(true);
    expect(hasHttpStatus({ status: 0 }, 1)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 3: Combined usage patterns
// ──────────────────────────────────────────────────────────

describe('getErrorMessage & hasHttpStatus — combined', () => {
  it('checks status and gets message from same object', () => {
    const err = { status: 404, message: 'Not found' };

    if (hasHttpStatus(err, 404)) {
      // This pattern is used in catch handlers
      const msg = getErrorMessage(err.message);
      expect(msg).toBe('Not found');
    }
  });

  it('handles mixed error types in sequence', () => {
    const errors = [
      new Error('Error 1'),
      { status: 404, message: 'Not found' },
      'String error',
      null,
    ];

    const messages = errors.map(e => getErrorMessage(e));
    expect(messages[0]).toBe('Error 1');
    expect(messages[1]).toBe('Error desconocido');
    expect(messages[2]).toBe('String error');
    expect(messages[3]).toBe('Error desconocido');
  });

  it('typical catch block pattern', () => {
    const testCatch = (err: unknown) => {
      const msg = getErrorMessage(err);
      const is404 = hasHttpStatus(err, 404);
      return { msg, is404 };
    };

    const result1 = testCatch(new Error('test'));
    expect(result1.msg).toBe('test');
    expect(result1.is404).toBe(false);

    const result2 = testCatch({ status: 404, message: 'Not found' });
    expect(result2.is404).toBe(true);
  });
});
