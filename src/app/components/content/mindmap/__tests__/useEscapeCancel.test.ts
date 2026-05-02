// ============================================================
// Tests — useEscapeCancel (helper extracted in cycle 48)
//
// Pins the source-level contract for the document-level Escape
// listener shared by useDragConnect and useEdgeReconnect:
//   - listener bound on `document` with { capture: true }
//   - Escape only fires onCancel when isActive() returns true
//   - preventDefault + stopPropagation called BEFORE onCancel
//   - listener unbound symmetrically with the same { capture: true }
//   - enabled === false → no-op (no listener installed)
//
// Several of these tests previously lived in
// useDragConnect.contract.test.ts and useEdgeReconnect.test.ts
// pinning the same code BEFORE the cycle-48 extraction.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE_PATH = resolve(__dirname, '..', 'useEscapeCancel.ts');
const source = readFileSync(SOURCE_PATH, 'utf-8');

// ── Module contract ─────────────────────────────────────────

describe('useEscapeCancel exports', () => {
  it('exports useEscapeCancel hook', () => {
    expect(source).toContain('export function useEscapeCancel');
  });

  it('exports UseEscapeCancelOptions interface', () => {
    expect(source).toContain('export interface UseEscapeCancelOptions');
  });

  it('options interface declares enabled, isActive, onCancel', () => {
    expect(source).toMatch(/enabled:\s*boolean/);
    expect(source).toMatch(/isActive:\s*\(\)\s*=>\s*boolean/);
    expect(source).toMatch(/onCancel:\s*\(\)\s*=>\s*void/);
  });

  it('returns void (no surface to test against)', () => {
    expect(source).toMatch(/\):\s*void\s*\{/);
  });
});

// ── Listener registration ───────────────────────────────────

describe('Listener registration', () => {
  it('binds keydown on document (NOT container) for app-wide capture', () => {
    expect(source).toMatch(/document\.addEventListener\('keydown'/);
  });

  it('uses capture phase: { capture: true }', () => {
    expect(source).toMatch(/document\.addEventListener\('keydown',\s*\w+,\s*\{\s*capture:\s*true\s*\}/);
  });

  it('symmetric removeEventListener with { capture: true } on cleanup', () => {
    expect(source).toMatch(/document\.removeEventListener\('keydown',\s*\w+,\s*\{\s*capture:\s*true\s*\}/);
  });

  it('listener is gated by enabled (early-return when false)', () => {
    expect(source).toMatch(/if\s*\(!enabled\)\s*return/);
  });
});

// ── Escape semantics ────────────────────────────────────────

describe('Escape key semantics', () => {
  it("only fires for e.key === 'Escape'", () => {
    expect(source).toMatch(/e\.key\s*===\s*'Escape'/);
  });

  it('also gates on isActive() returning truthy (not just any Escape)', () => {
    expect(source).toMatch(/e\.key\s*===\s*'Escape'\s*&&\s*isActive\(\)/);
  });

  it('preventDefault + stopPropagation called BEFORE onCancel', () => {
    expect(source).toMatch(/e\.preventDefault\(\)[\s\S]*?e\.stopPropagation\(\)[\s\S]*?onCancel\(\)/);
  });

  it('preventDefault is called on the keydown event (panel stopPropagation guard)', () => {
    expect(source).toMatch(/e\.preventDefault\(\)/);
  });

  it('stopPropagation is called on the keydown event', () => {
    expect(source).toMatch(/e\.stopPropagation\(\)/);
  });

  it('Escape with isActive()===false is a complete no-op (no preventDefault/stop)', () => {
    // The whole branch (preventDefault/stopPropagation/onCancel) lives
    // INSIDE the && isActive() guard.
    expect(source).toMatch(/if\s*\(e\.key\s*===\s*'Escape'\s*&&\s*isActive\(\)\)\s*\{\s*e\.preventDefault\(\)/);
  });
});

// ── Effect dep array ────────────────────────────────────────

describe('Effect dependency array', () => {
  it('effect deps = [enabled, isActive, onCancel] (re-bind when callbacks change)', () => {
    expect(source).toMatch(/\[enabled,\s*isActive,\s*onCancel\]/);
  });
});

// ── Replicated semantics — behavior pinning ────────────────

describe('Replicated escape gate', () => {
  function shouldFire(key: string, isActive: () => boolean): boolean {
    if (key === 'Escape' && isActive()) return true;
    return false;
  }

  it("non-Escape keys never fire (e.g. 'Enter' / 'a' / ' ')", () => {
    expect(shouldFire('Enter', () => true)).toBe(false);
    expect(shouldFire('a', () => true)).toBe(false);
    expect(shouldFire(' ', () => true)).toBe(false);
  });

  it("Escape with isActive=false is a no-op", () => {
    expect(shouldFire('Escape', () => false)).toBe(false);
  });

  it("Escape with isActive=true fires", () => {
    expect(shouldFire('Escape', () => true)).toBe(true);
  });

  it("isActive is called as a callback (not a value) — late-bound state", () => {
    let active = false;
    const isActive = () => active;
    expect(shouldFire('Escape', isActive)).toBe(false);
    active = true;
    expect(shouldFire('Escape', isActive)).toBe(true);
  });
});
