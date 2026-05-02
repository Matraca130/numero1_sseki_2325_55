// ============================================================
// Tests — storageHelpers (Cycle 57 extraction)
//
// Covers safeGetJSON / safeSetJSON / safeRemoveItem:
//   - happy paths (round-trip)
//   - missing key returns null
//   - malformed JSON returns null
//   - JSON.parse-throwing pathological inputs caught
//   - setItem QuotaExceededError swallowed (returns false)
//   - removeItem disabled-storage caught
//   - sessionStorage opt-in via the explicit `storage` arg
//   - default storage is localStorage (no arg)
//   - returns true/false contract on safeSetJSON
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// In-memory Storage stub. Same shape used elsewhere in the suite.
class MemStorage {
  store = new Map<string, string>();
  getItem(k: string): string | null {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.store.set(k, String(v));
  }
  removeItem(k: string): void {
    this.store.delete(k);
  }
  clear(): void {
    this.store.clear();
  }
  key(i: number): string | null {
    return Array.from(this.store.keys())[i] ?? null;
  }
  get length(): number {
    return this.store.size;
  }
}

// We pin localStorage to a fresh MemStorage between tests so the
// "default arg" tests are deterministic.
let memLocal: MemStorage;
let memSession: MemStorage;

beforeEach(() => {
  memLocal = new MemStorage();
  memSession = new MemStorage();
  vi.stubGlobal('localStorage', memLocal);
  vi.stubGlobal('sessionStorage', memSession);
});

import { safeGetJSON, safeSetJSON, safeRemoveItem } from '../storageHelpers';

// ── safeGetJSON ─────────────────────────────────────────────

describe('safeGetJSON', () => {
  it('returns null when the key is absent', () => {
    expect(safeGetJSON('missing')).toBeNull();
  });

  it('returns the parsed value on a valid payload', () => {
    memLocal.setItem('k', JSON.stringify({ a: 1, b: 'x' }));
    expect(safeGetJSON('k')).toEqual({ a: 1, b: 'x' });
  });

  it('returns null on malformed JSON', () => {
    memLocal.setItem('k', '{not-json{');
    expect(safeGetJSON('k')).toBeNull();
  });

  it('returns null when the parse throws', () => {
    // Any non-JSON garbage triggers the catch path.
    memLocal.setItem('k', 'undefined');
    expect(safeGetJSON('k')).toBeNull();
  });

  it('returns null when storage.getItem itself throws', () => {
    const broken = {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage;
    expect(safeGetJSON('k', broken)).toBeNull();
  });

  it('round-trips primitive values: numbers, strings, booleans, null', () => {
    memLocal.setItem('n', JSON.stringify(42));
    memLocal.setItem('s', JSON.stringify('hello'));
    memLocal.setItem('t', JSON.stringify(true));
    memLocal.setItem('z', JSON.stringify(null));
    expect(safeGetJSON('n')).toBe(42);
    expect(safeGetJSON('s')).toBe('hello');
    expect(safeGetJSON('t')).toBe(true);
    // JSON-encoded `null` parses back to null — same code path as missing key.
    expect(safeGetJSON('z')).toBeNull();
  });

  it('round-trips arrays', () => {
    memLocal.setItem('arr', JSON.stringify([1, 'two', { three: 3 }]));
    expect(safeGetJSON('arr')).toEqual([1, 'two', { three: 3 }]);
  });

  it('reads from sessionStorage when storage arg is sessionStorage', () => {
    memSession.setItem('only-in-session', JSON.stringify({ scope: 'session' }));
    // Default localStorage doesn't have it
    expect(safeGetJSON('only-in-session')).toBeNull();
    // Explicit sessionStorage finds it
    expect(safeGetJSON('only-in-session', sessionStorage)).toEqual({ scope: 'session' });
  });

  it('defaults to localStorage when no storage arg is provided', () => {
    memLocal.setItem('default-test', JSON.stringify('hit'));
    expect(safeGetJSON('default-test')).toBe('hit');
  });
});

// ── safeSetJSON ─────────────────────────────────────────────

describe('safeSetJSON', () => {
  it('writes a JSON-serialized payload to storage', () => {
    expect(safeSetJSON('k', { a: 1 })).toBe(true);
    expect(memLocal.getItem('k')).toBe(JSON.stringify({ a: 1 }));
  });

  it('returns true on success', () => {
    expect(safeSetJSON('k', [1, 2, 3])).toBe(true);
  });

  it('returns false on QuotaExceededError', () => {
    const broken = {
      getItem: () => null,
      setItem: () => {
        const e = new Error('QuotaExceededError');
        e.name = 'QuotaExceededError';
        throw e;
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage;
    expect(safeSetJSON('k', { a: 1 }, broken)).toBe(false);
  });

  it('returns false when storage is disabled / setItem throws', () => {
    const broken = {
      getItem: () => null,
      setItem: () => { throw new Error('SecurityError'); },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage;
    expect(safeSetJSON('k', 'value', broken)).toBe(false);
  });

  it('does not throw when serialization fails (circular reference)', () => {
    // JSON.stringify throws on circular structures — should be swallowed.
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => safeSetJSON('k', circular)).not.toThrow();
    expect(safeSetJSON('k', circular)).toBe(false);
  });

  it('writes to sessionStorage when storage arg is sessionStorage', () => {
    expect(safeSetJSON('only-session', { scope: 'session' }, sessionStorage)).toBe(true);
    expect(memSession.getItem('only-session')).toBe(JSON.stringify({ scope: 'session' }));
    // localStorage untouched
    expect(memLocal.getItem('only-session')).toBeNull();
  });

  it('defaults to localStorage when no storage arg is provided', () => {
    expect(safeSetJSON('def-key', { ok: true })).toBe(true);
    expect(memLocal.getItem('def-key')).toBe(JSON.stringify({ ok: true }));
    expect(memSession.getItem('def-key')).toBeNull();
  });
});

// ── safeRemoveItem ──────────────────────────────────────────

describe('safeRemoveItem', () => {
  it('removes the key from storage', () => {
    memLocal.setItem('k', 'v');
    safeRemoveItem('k');
    expect(memLocal.getItem('k')).toBeNull();
  });

  it('does not throw when the key is absent', () => {
    expect(() => safeRemoveItem('does-not-exist')).not.toThrow();
  });

  it('does not throw when storage.removeItem itself throws', () => {
    const broken = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => { throw new Error('blocked'); },
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage;
    expect(() => safeRemoveItem('k', broken)).not.toThrow();
  });

  it('removes from sessionStorage when storage arg is sessionStorage', () => {
    memSession.setItem('only-session', 'v');
    memLocal.setItem('only-session', 'v'); // both have it
    safeRemoveItem('only-session', sessionStorage);
    expect(memSession.getItem('only-session')).toBeNull();
    // localStorage left untouched
    expect(memLocal.getItem('only-session')).toBe('v');
  });

  it('defaults to localStorage when no storage arg is provided', () => {
    memLocal.setItem('k', 'v');
    safeRemoveItem('k');
    expect(memLocal.getItem('k')).toBeNull();
  });
});

// ── Round-trip integration ──────────────────────────────────

describe('round-trip integration', () => {
  it('safeSetJSON → safeGetJSON returns the same value (objects)', () => {
    safeSetJSON('rt', { a: 1, b: [2, 3] });
    expect(safeGetJSON('rt')).toEqual({ a: 1, b: [2, 3] });
  });

  it('safeSetJSON → safeRemoveItem → safeGetJSON returns null', () => {
    safeSetJSON('rt', 'value');
    safeRemoveItem('rt');
    expect(safeGetJSON('rt')).toBeNull();
  });

  it('sessionStorage round-trip works end-to-end', () => {
    safeSetJSON('s-rt', [1, 2, 3], sessionStorage);
    expect(safeGetJSON('s-rt', sessionStorage)).toEqual([1, 2, 3]);
    safeRemoveItem('s-rt', sessionStorage);
    expect(safeGetJSON('s-rt', sessionStorage)).toBeNull();
  });
});

// ── Source-level invariants ─────────────────────────────────

describe('storageHelpers source invariants', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'storageHelpers.ts'),
    'utf-8'
  );

  it('exports exactly the three documented helpers', () => {
    expect(source).toMatch(/export\s+function\s+safeGetJSON\b/);
    expect(source).toMatch(/export\s+function\s+safeSetJSON\b/);
    expect(source).toMatch(/export\s+function\s+safeRemoveItem\b/);
  });

  it('defaults storage to localStorage on every helper signature', () => {
    // The default-parameter contract is what lets consumers omit the arg.
    expect(
      (source.match(/storage:\s*Storage\s*=\s*localStorage/g) ?? []).length
    ).toBeGreaterThanOrEqual(3);
  });

  it('every helper body is wrapped in try/catch (silent failure mode)', () => {
    expect((source.match(/try\s*\{/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect((source.match(/}\s*catch\s*(?:\(.*?\))?\s*\{/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('safeGetJSON returns null on missing key (early return)', () => {
    expect(source).toMatch(/raw\s*===\s*null/);
  });
});
