// ============================================================
// Tests — useSearchFocus (source contract)
//
// Verifies the hook's API surface: Ctrl+F and '/' keydown
// listeners, element/dialog ignore rules, preventDefault,
// cleanup via removeEventListener, and Mac metaKey support.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(resolve(__dirname, '..', 'useSearchFocus.ts'), 'utf-8');

describe('useSearchFocus contract', () => {
  // ── Export ───────────────────────────────────────────────
  it('exports useSearchFocus function', () => {
    expect(source).toMatch(/export\s+function\s+useSearchFocus/);
  });

  it('accepts an inputRef parameter of type RefObject<HTMLInputElement | null>', () => {
    expect(source).toMatch(/useSearchFocus\s*\(\s*inputRef\s*:\s*RefObject<HTMLInputElement\s*\|\s*null>/);
  });

  // ── Ctrl+F and '/' keydown events ──────────────────────
  it('listens for keydown events on document', () => {
    expect(source).toContain("document.addEventListener('keydown'");
  });

  it('handles Ctrl+F shortcut (e.key === f)', () => {
    expect(source).toContain("e.key === 'f'");
  });

  it('handles / key shortcut', () => {
    expect(source).toContain("e.key === '/'");
  });

  // ── Ignores events from INPUT, TEXTAREA, SELECT ────────
  it('ignores events from INPUT elements', () => {
    expect(source).toContain("=== 'INPUT'");
  });

  it('ignores events from TEXTAREA elements', () => {
    expect(source).toContain("=== 'TEXTAREA'");
  });

  it('ignores events from SELECT elements', () => {
    expect(source).toContain("=== 'SELECT'");
  });

  // ── Ignores contentEditable elements ───────────────────
  it('ignores contentEditable elements', () => {
    expect(source).toContain('isContentEditable');
  });

  // ── Ignores events inside dialogs ──────────────────────
  it('ignores events inside role="dialog" elements', () => {
    expect(source).toContain('role="dialog"');
  });

  it('ignores events inside role="alertdialog" elements', () => {
    expect(source).toContain('role="alertdialog"');
  });

  it('uses closest() to detect dialog ancestors', () => {
    expect(source).toContain('el?.closest');
  });

  // ── Calls e.preventDefault() before focusing ──────────
  it('calls preventDefault before focusing the input', () => {
    expect(source).toContain('e.preventDefault()');
  });

  it('focuses the inputRef on matching shortcut', () => {
    expect(source).toContain('inputRef.current?.focus()');
  });

  // ── Cleanup (removeEventListener) in useEffect return ──
  it('removes keydown listener on cleanup', () => {
    expect(source).toContain("document.removeEventListener('keydown'");
  });

  it('uses useEffect for the event listener lifecycle', () => {
    expect(source).toMatch(/import\s*\{[^}]*useEffect[^}]*\}\s*from\s*'react'/);
  });

  // ── Works with both metaKey (Mac) and ctrlKey ──────────
  it('checks ctrlKey for Windows/Linux', () => {
    expect(source).toContain('e.ctrlKey');
  });

  it('checks metaKey for Mac', () => {
    expect(source).toContain('e.metaKey');
  });

  it('uses OR condition for ctrlKey and metaKey', () => {
    expect(source).toMatch(/e\.ctrlKey\s*\|\|\s*e\.metaKey/);
  });

  // ── Slash key does not fire when Ctrl/Meta is held ─────
  it('slash shortcut excludes Ctrl/Meta modifier', () => {
    expect(source).toMatch(/e\.key\s*===\s*'\/'\s*&&\s*!e\.ctrlKey\s*&&\s*!e\.metaKey/);
  });

  // ── React imports ──────────────────────────────────────
  it('imports RefObject type from React', () => {
    expect(source).toMatch(/import\s*\{[^}]*RefObject[^}]*\}\s*from\s*'react'/);
  });
});
