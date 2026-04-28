// ============================================================
// Contract Tests — NodeAnnotationModal
//
// Source-based contract tests using readFileSync + string/regex
// matching to verify structural contracts without importing
// heavy dependencies (motion/react, etc.).
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(
  resolve(__dirname, '..', 'NodeAnnotationModal.tsx'),
  'utf-8',
);

describe('NodeAnnotationModal contract', () => {
  // ── Export ─────────────────────────────────────────────────

  it('exports NodeAnnotationModal as a memo-wrapped function', () => {
    expect(source).toMatch(
      /export\s+const\s+NodeAnnotationModal\s*=\s*memo\s*\(\s*function\s+NodeAnnotationModal/,
    );
  });

  // ── Dialog semantics ──────────────────────────────────────

  it('has role="dialog" for modal semantics', () => {
    expect(source).toContain('role="dialog"');
  });

  it('has aria-modal="true"', () => {
    expect(source).toContain('aria-modal="true"');
  });

  // ── ConfirmDialog for discard confirmation ────────────────

  it('uses ConfirmDialog for discard confirmation (not window.confirm)', () => {
    expect(source).toContain('ConfirmDialog');
    expect(source).toMatch(/import\s*\{[^}]*ConfirmDialog[^}]*\}\s*from/);
    // Should NOT call window.confirm (comment mentioning it is OK)
    expect(source).not.toMatch(/[^/]\bwindow\.confirm\s*\(/);

  });

  it('ConfirmDialog shows "Cambios sin guardar" title', () => {
    expect(source).toContain('Cambios sin guardar');
  });

  // ── Escape key handler ────────────────────────────────────

  it('has Escape key handler', () => {
    expect(source).toContain("e.key === 'Escape'");
  });

  it('cleans up Escape key listener on unmount', () => {
    expect(source).toContain("document.addEventListener('keydown'");
    expect(source).toContain("document.removeEventListener('keydown'");
  });

  // ── Body scroll lock ──────────────────────────────────────

  it('locks body scroll when open', () => {
    expect(source).toContain("document.body.style.overflow = 'hidden'");
  });

  it('restores body scroll on cleanup (saves/restores original values)', () => {
    expect(source).toContain('document.body.style.overflow = prevBody');
    expect(source).toContain('document.documentElement.style.overflow = prevHtml');
  });

  // ── savingRef to prevent double-save ──────────────────────

  it('uses savingRef to prevent double-save', () => {
    expect(source).toContain('savingRef');
    expect(source).toContain('savingRef.current = true');
    expect(source).toContain('savingRef.current = false');
  });

  it('guards save with savingRef check', () => {
    expect(source).toContain('if (!node || !content.trim() || savingRef.current) return');
  });

  // ── safeClose pattern for unsaved changes ─────────────────

  it('uses safeClose pattern for unsaved changes', () => {
    expect(source).toContain('safeClose');
    // safeClose checks if content differs from initial
    expect(source).toContain('content !== initialContentRef.current');
  });

  it('shows discard confirmation when content has changed', () => {
    expect(source).toContain('setShowDiscardConfirm(true)');
  });

  // ── aria-labelledby with dynamic ID ───────────────────────

  it('has aria-labelledby pointing to a dynamic ID', () => {
    expect(source).toContain('aria-labelledby="annotation-modal-title"');
    expect(source).toContain('id="annotation-modal-title"');
  });

  // ── Textarea for annotation content ───────────────────────

  it('has a textarea for annotation content', () => {
    expect(source).toContain('<textarea');
    expect(source).toContain('id="node-annotation"');
  });

  // ── onCloseRef pattern to avoid stale closures ────────────

  it('uses onCloseRef pattern to avoid stale closures', () => {
    expect(source).toContain('onCloseRef');
    expect(source).toMatch(/onCloseRef\.current\s*=\s*onClose/);
    expect(source).toContain('onCloseRef.current()');
  });
});

// ── i18n: pt / es parity ────────────────────────────────────

describe('NodeAnnotationModal i18n parity', () => {
  // Same regex slice approach as cycles 18 / 19 — diff the keys
  // between locale objects so dropping a string in one but not the
  // other (which would silently render `undefined` in the UI) is
  // caught at test time.
  const ptStart = source.indexOf('  pt: {');
  const esStart = source.indexOf('  es: {');
  const closeIx = source.indexOf('} as const;');

  it('declares both pt and es locale objects', () => {
    expect(ptStart).toBeGreaterThan(-1);
    expect(esStart).toBeGreaterThan(ptStart);
    expect(closeIx).toBeGreaterThan(esStart);
  });

  function keysIn(slice: string): Set<string> {
    const keys = new Set<string>();
    // Object keys in this file appear either at line start (after indent)
    // or compacted on the same line after ", ". Match both. Then strip the
    // locale-name token itself (`pt`/`es`) since it appears as the very
    // first key in our slice.
    const re = /(?:\n\s+|,\s+)([a-zA-Z_][a-zA-Z0-9_]*):/g;
    let m;
    while ((m = re.exec(slice))) keys.add(m[1]);
    keys.delete('pt');
    keys.delete('es');
    return keys;
  }

  const ptKeys = keysIn(source.slice(ptStart, esStart));
  const esKeys = keysIn(source.slice(esStart, closeIx));

  it('pt and es declare identical key sets (no drift)', () => {
    const onlyInPt = [...ptKeys].filter(k => !esKeys.has(k));
    const onlyInEs = [...esKeys].filter(k => !ptKeys.has(k));
    expect({ onlyInPt, onlyInEs }).toEqual({ onlyInPt: [], onlyInEs: [] });
  });

  it('declares the required strings in both locales', () => {
    const required = [
      'close', 'label', 'placeholder', 'delete', 'saving', 'save',
      'savedToast', 'saveError', 'deletedToast', 'deleteError',
      'unsavedTitle', 'unsavedDesc', 'unsavedCancel', 'unsavedConfirm',
    ];
    for (const k of required) {
      expect(ptKeys.has(k)).toBe(true);
      expect(esKeys.has(k)).toBe(true);
    }
  });

  it('hard-codes Portuguese (no locale prop on this modal)', () => {
    expect(source).toContain("const tA = I18N_ANNOTATION['pt'];");
  });
});

// ── Save flow contract ─────────────────────────────────────

describe('NodeAnnotationModal save flow', () => {
  it('uses PATCH on existing note (update path)', () => {
    expect(source).toMatch(/method:\s*'PATCH'/);
    expect(source).toContain('/kw-student-notes/${existingNote.id}');
  });

  it('uses POST on new note (create path)', () => {
    expect(source).toMatch(/method:\s*'POST'/);
    expect(source).toMatch(/'\/kw-student-notes',/);
  });

  it('captures POST response and stores it in existingNote (prevents duplicate POSTs)', () => {
    expect(source).toMatch(/const created\s*=\s*await apiCall<StudentNote>\('\/kw-student-notes'/);
    expect(source).toMatch(/if\s*\(created\)\s*setExistingNote\(created\)/);
  });

  it('trims content before sending (no trailing whitespace persisted)', () => {
    expect(source).toMatch(/content:\s*content\.trim\(\)/);
  });

  it('rejects empty/whitespace content via shake animation (visual feedback)', () => {
    expect(source).toMatch(/if\s*\(\s*!content\.trim\(\)\s*&&\s*!saving\s*\)/);
    expect(source).toContain('setShake(true)');
  });

  it('caps annotation length at 1000 characters', () => {
    expect(source).toMatch(/maxLength=\{1000\}/);
  });

  it('renders a 950-char red-warning threshold (95% of cap)', () => {
    expect(source).toMatch(/content\.length\s*>=\s*950/);
  });

  it('encodes keyword_id in the GET URL (encodeURIComponent)', () => {
    expect(source).toMatch(/encodeURIComponent\(node\.id\)/);
  });

  it('handles both array and {items: array} response shapes', () => {
    expect(source).toMatch(/Array\.isArray\(result\)\s*\?\s*result\s*:\s*result\?\.items\s*\|\|\s*\[\]/);
  });

  it('surfaces the API error message when present (Error instance)', () => {
    expect(source).toMatch(/e\s+instanceof\s+Error\s*\?\s*e\.message\s*:\s*tA\.saveError/);
    expect(source).toMatch(/e\s+instanceof\s+Error\s*\?\s*e\.message\s*:\s*tA\.deleteError/);
  });
});

// ── Delete flow contract ────────────────────────────────────

describe('NodeAnnotationModal delete flow', () => {
  it('only renders the Delete button when an existing note is loaded', () => {
    expect(source).toMatch(/existingNote\s*\?\s*\(\s*<button[\s\S]*?onClick=\{handleDelete\}/);
  });

  it('issues DELETE against the existing note id', () => {
    expect(source).toMatch(/method:\s*'DELETE'/);
  });

  it('clears local state on success (setContent + setExistingNote)', () => {
    expect(source).toMatch(/setContent\(''\)[\s\S]*?setExistingNote\(null\)/);
  });

  it('guards against double-delete via savingRef', () => {
    expect(source).toMatch(/if\s*\(\s*!existingNote\s*\|\|\s*savingRef\.current\s*\)\s*return/);
  });

  it('fires onSaved + onClose after successful delete', () => {
    expect(source).toMatch(/setExistingNote\(null\)[\s\S]*?onSaved\?\.\(\)[\s\S]*?onClose\(\)/);
  });
});

// ── Keyboard shortcuts ──────────────────────────────────────

describe('NodeAnnotationModal keyboard shortcuts', () => {
  it('Ctrl+Enter / Cmd+Enter triggers save', () => {
    expect(source).toMatch(/\(e\.ctrlKey\s*\|\|\s*e\.metaKey\)\s*&&\s*e\.key\s*===\s*'Enter'/);
    expect(source).toContain('handleSaveRef.current?.()');
  });

  it('uses handleSaveRef so the keydown listener doesn\'t need it as a dep', () => {
    expect(source).toContain('handleSaveRef');
    expect(source).toMatch(/handleSaveRef\.current\s*=\s*handleSave/);
  });

  it('Escape uses safeCloseRef so it always sees the latest closure', () => {
    expect(source).toContain('safeCloseRef');
    expect(source).toMatch(/safeCloseRef\.current\s*=\s*safeClose/);
    expect(source).toContain('safeCloseRef.current()');
  });

  it('Escape and Ctrl+Enter both call preventDefault to avoid bubbling', () => {
    // Both branches call e.preventDefault()
    const matches = source.match(/e\.preventDefault\(\)/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

// ── Body scroll lock — preserves the user's prior overflow ──

describe('NodeAnnotationModal body scroll lock', () => {
  it('captures the previous overflow values before locking', () => {
    expect(source).toMatch(/const prevHtml\s*=\s*document\.documentElement\.style\.overflow/);
    expect(source).toMatch(/const prevBody\s*=\s*document\.body\.style\.overflow/);
  });

  it('restores BOTH html and body overflow in cleanup (not hardcoded "auto")', () => {
    expect(source).toContain('document.documentElement.style.overflow = prevHtml');
    expect(source).toContain('document.body.style.overflow = prevBody');
  });
});

// ── Mount-tracking discipline ──────────────────────────────

describe('NodeAnnotationModal mountedRef discipline', () => {
  it('tracks mount state for async setState skip (post-unmount)', () => {
    expect(source).toContain('mountedRef.current = true');
    expect(source).toMatch(/return\s*\(\)\s*=>\s*\{\s*mountedRef\.current\s*=\s*false/);
  });

  it('uses mountedRef.current before setSaving(false) in the async finally blocks', () => {
    expect(source).toMatch(/if\s*\(mountedRef\.current\)\s*setSaving\(false\)/);
  });

  it('the fetch effect also uses a local cancelled flag (alternative pattern)', () => {
    expect(source).toContain('let cancelled = false');
    expect(source).toMatch(/if\s*\(cancelled\)\s*return/);
  });
});

// ── Backdrop / discard confirm ─────────────────────────────

describe('NodeAnnotationModal backdrop + discard confirm', () => {
  it('clicking the backdrop calls safeClose (not direct onClose)', () => {
    expect(source).toMatch(/onClick=\{safeClose\}/);
  });

  it('discard-confirm uses ConfirmDialog with z-[60] (above the modal)', () => {
    expect(source).toContain('zClass="z-[60]"');
  });

  it('confirming discard closes immediately (skips the unsaved-check)', () => {
    expect(source).toMatch(/onConfirm=\{\(\)\s*=>\s*\{\s*setShowDiscardConfirm\(false\);\s*onCloseRef\.current\(\)/);
  });
});
