// ============================================================
// Tests for error-utils.ts — Error extraction and handling
//
// Verifies:
//   - ApiError class construction and properties
//   - getErrorMsg() extraction from various error types
//   - HTTP status detection
// ============================================================

import { describe, it, expect } from 'vitest';
import { ApiError, getErrorMsg } from '@/app/lib/error-utils';

// ──────────────────────────────────────────────────────────
// SUITE 1: ApiError class
// ──────────────────────────────────────────────────────────

describe('ApiError', () => {
  it('constructs with message, status, and path', () => {
    const err = new ApiError('Not found', 404, '/api/quizzes');

    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
    expect(err.path).toBe('/api/quizzes');
  });

  it('has name "ApiError"', () => {
    const err = new ApiError('Error', 500, '/test');
    expect(err.name).toBe('ApiError');
  });

  it('is an instanceof Error', () => {
    const err = new ApiError('Error', 400, '/test');
    expect(err instanceof Error).toBe(true);
  });

  it('has correct status codes', () => {
    expect(new ApiError('Not found', 404, '/').status).toBe(404);
    expect(new ApiError('Server error', 500, '/').status).toBe(500);
    expect(new ApiError('Bad request', 400, '/').status).toBe(400);
    expect(new ApiError('Unauthorized', 401, '/').status).toBe(401);
    expect(new ApiError('Forbidden', 403, '/').status).toBe(403);
  });

  it('stores the path correctly', () => {
    const err = new ApiError('Error', 500, '/api/v1/quizzes/123');
    expect(err.path).toBe('/api/v1/quizzes/123');
  });

  it('can be caught as ApiError', () => {
    const err = new ApiError('Test', 418, '/test');

    try {
      throw err;
    } catch (caught) {
      expect(caught instanceof ApiError).toBe(true);
      if (caught instanceof ApiError) {
        expect(caught.status).toBe(418);
      }
    }
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 2: getErrorMsg()
// ──────────────────────────────────────────────────────────

describe('getErrorMsg()', () => {
  it('extracts message from ApiError with status prefix', () => {
    const err = new ApiError('Quiz not found', 404, '/quizzes');
    const msg = getErrorMsg(err);

    expect(msg).toContain('[404]');
    expect(msg).toContain('Quiz not found');
    expect(msg).toBe('[404] Quiz not found');
  });

  it('extracts message from standard Error', () => {
    const err = new Error('Something went wrong');
    const msg = getErrorMsg(err);

    expect(msg).toBe('Something went wrong');
  });

  it('handles TypeError', () => {
    const err = new TypeError('Cannot read property x of undefined');
    const msg = getErrorMsg(err);

    expect(msg).toBe('Cannot read property x of undefined');
  });

  it('converts string to itself', () => {
    const msg = getErrorMsg('Error message');
    expect(msg).toBe('Error message');
  });

  it('converts number to string', () => {
    const msg = getErrorMsg(404);
    expect(msg).toBe('404');
  });

  it('converts null to "null" string', () => {
    const msg = getErrorMsg(null);
    expect(msg).toBe('null');
  });

  it('converts undefined to "undefined" string', () => {
    const msg = getErrorMsg(undefined);
    expect(msg).toBe('undefined');
  });

  it('converts object without message to its string representation', () => {
    const msg = getErrorMsg({ code: 'ERR_UNKNOWN' });
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('extracts message from various Error subclasses', () => {
    const rangeErr = new RangeError('Invalid range');
    expect(getErrorMsg(rangeErr)).toBe('Invalid range');

    const syntaxErr = new SyntaxError('Invalid syntax');
    expect(getErrorMsg(syntaxErr)).toBe('Invalid syntax');

    const refErr = new ReferenceError('x is not defined');
    expect(getErrorMsg(refErr)).toBe('x is not defined');
  });

  it('prioritizes ApiError format over generic Error', () => {
    // ApiError extends Error but has special formatting
    const apiErr = new ApiError('Custom message', 403, '/protected');
    const msg = getErrorMsg(apiErr);

    expect(msg).toBe('[403] Custom message');
    expect(msg).not.toBe('Custom message');
  });

  it('handles empty string error message', () => {
    const err = new Error('');
    const msg = getErrorMsg(err);
    expect(msg).toBe('');
  });

  it('handles error message with special characters', () => {
    const err = new Error('Error: "something" failed [code: 123]');
    const msg = getErrorMsg(err);
    expect(msg).toBe('Error: "something" failed [code: 123]');
  });

  it('handles multiline error messages', () => {
    const err = new Error('Line 1\nLine 2\nLine 3');
    const msg = getErrorMsg(err);
    expect(msg).toContain('Line 1');
    expect(msg).toContain('Line 2');
  });

  it('handles ApiError with various status codes', () => {
    expect(getErrorMsg(new ApiError('Bad', 400, '/'))).toBe('[400] Bad');
    expect(getErrorMsg(new ApiError('Unauthorized', 401, '/'))).toBe('[401] Unauthorized');
    expect(getErrorMsg(new ApiError('Forbidden', 403, '/'))).toBe('[403] Forbidden');
    expect(getErrorMsg(new ApiError('Not found', 404, '/'))).toBe('[404] Not found');
    expect(getErrorMsg(new ApiError('Server error', 500, '/'))).toBe('[500] Server error');
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 3: formatDateCompact re-export
// ──────────────────────────────────────────────────────────

describe('error-utils exports', () => {
  it('re-exports formatDateCompact from date-utils', async () => {
    // The re-export should be available via dynamic import
    const errorUtils = await import('@/app/lib/error-utils');
    expect(typeof errorUtils.formatDateCompact).toBe('function');
  });
});
