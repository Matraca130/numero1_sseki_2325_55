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
