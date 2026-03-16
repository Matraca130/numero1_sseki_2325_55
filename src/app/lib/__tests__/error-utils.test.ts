// ============================================================
// TEST: error-utils.ts — ApiError class + getErrorMsg utility
//
// Used by: apiCall() throws ApiError; getErrorMsg() consumed
// by 20+ components for user-facing error display.
//
// All pure, zero mocks.
// ============================================================

import { describe, it, expect } from 'vitest';
import { ApiError, getErrorMsg } from '../error-utils';

// ── ApiError construction ─────────────────────────────────

describe('ApiError', () => {
  it('stores message, status, and path', () => {
    const err = new ApiError('Not found', 404, '/flashcards');
    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
    expect(err.path).toBe('/flashcards');
  });

  it('has name = "ApiError"', () => {
    const err = new ApiError('fail', 500, '/test');
    expect(err.name).toBe('ApiError');
  });

  it('is instanceof Error', () => {
    const err = new ApiError('fail', 500, '/test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it('works with try-catch instanceof check', () => {
    let caught = false;
    try {
      throw new ApiError('Unauthorized', 401, '/me');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        caught = true;
      }
    }
    expect(caught).toBe(true);
  });
});

// ── getErrorMsg ───────────────────────────────────────────

describe('getErrorMsg', () => {
  it('ApiError → "[status] message"', () => {
    const err = new ApiError('Not found', 404, '/flashcards');
    expect(getErrorMsg(err)).toBe('[404] Not found');
  });

  it('regular Error → message only', () => {
    expect(getErrorMsg(new Error('Something broke'))).toBe('Something broke');
  });

  it('string → returns the string', () => {
    expect(getErrorMsg('raw error string')).toBe('raw error string');
  });

  it('number → stringified', () => {
    expect(getErrorMsg(42)).toBe('42');
  });

  it('null → "null"', () => {
    expect(getErrorMsg(null)).toBe('null');
  });

  it('undefined → "undefined"', () => {
    expect(getErrorMsg(undefined)).toBe('undefined');
  });

  it('ApiError takes priority over Error (correct dispatch)', () => {
    // ApiError extends Error, so instanceof Error is also true.
    // getErrorMsg should check ApiError FIRST.
    const err = new ApiError('Forbidden', 403, '/admin');
    const msg = getErrorMsg(err);
    expect(msg).toBe('[403] Forbidden');
    expect(msg).not.toBe('Forbidden'); // Would be wrong if dispatched as plain Error
  });
});
