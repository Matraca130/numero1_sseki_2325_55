// ============================================================
// Contract Tests — PresentationMode
//
// Source-based contract tests using readFileSync + string/regex
// matching to verify structural contracts without importing
// heavy dependencies (G6, motion/react, etc.).
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(
  resolve(__dirname, '..', 'PresentationMode.tsx'),
  'utf-8',
);

describe('PresentationMode contract', () => {
  // ── Export ─────────────────────────────────────────────────

  it('exports PresentationMode as a named function', () => {
    expect(source).toMatch(/export\s+function\s+PresentationMode/);
  });

  // ── Focus management ──────────────────────────────────────

  it('uses useFocusTrap for focus management', () => {
    expect(source).toContain('useFocusTrap');
    expect(source).toMatch(/import\s*\{[^}]*useFocusTrap[^}]*\}\s*from/);
  });

  // ── Keyboard navigation ──────────────────────────────────

  it('handles ArrowRight key', () => {
    expect(source).toContain("'ArrowRight'");
  });

  it('handles ArrowLeft key', () => {
    expect(source).toContain("'ArrowLeft'");
  });

  it('handles ArrowUp key', () => {
    expect(source).toContain("'ArrowUp'");
  });

  it('handles ArrowDown key', () => {
    expect(source).toContain("'ArrowDown'");
  });

  it('handles Escape key', () => {
    expect(source).toContain("'Escape'");
  });

  // ── Mobile swipe gestures ────────────────────────────────

  it('has onTouchStart handler for swipe gestures', () => {
    expect(source).toContain('onTouchStart');
    expect(source).toContain('handleTouchStart');
  });

  it('has onTouchEnd handler for swipe gestures', () => {
    expect(source).toContain('onTouchEnd');
    expect(source).toContain('handleTouchEnd');
  });

  // ── Accessibility: dialog ────────────────────────────────

  it('has role="dialog" for modal semantics', () => {
    expect(source).toContain('role="dialog"');
  });

  it('has aria-modal="true"', () => {
    expect(source).toContain('aria-modal="true"');
  });

  it('has aria-label in Spanish mentioning "Modo presentacion"', () => {
    // The source uses \u00f3 for the accent in "presentacion"
    expect(source).toMatch(/aria-label=\{?[`"'].*Modo presentaci/);
  });

  // ── Screen reader live region ─────────────────────────────

  it('has sr-only aria-live="polite" region for announcements', () => {
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('sr-only');
  });

  // ── Body scroll lock ──────────────────────────────────────

  it('locks body scroll with overflow hidden', () => {
    expect(source).toContain("document.body.style.overflow = 'hidden'");
  });

  it('restores body scroll on cleanup', () => {
    // Cleanup stores previous value and restores it
    expect(source).toContain('document.body.style.overflow = prevBody');
  });

  // ── AnimatePresence for slide transitions ─────────────────

  it('uses AnimatePresence from motion/react', () => {
    expect(source).toContain('AnimatePresence');
    expect(source).toMatch(/import\s*\{[^}]*AnimatePresence[^}]*\}\s*from\s*['"]motion\/react['"]/);
  });

  // ── topologicalSort ──────────────────────────────────────

  it('uses topologicalSort from presentationHelpers', () => {
    expect(source).toContain('topologicalSort');
    expect(source).toMatch(/import\s*\{[^}]*topologicalSort[^}]*\}\s*from\s*['"]\.\/presentationHelpers['"]/);
  });

  // ── Navigation buttons with aria-labels ───────────────────

  it('has prev button with aria-label "Concepto anterior"', () => {
    expect(source).toContain('aria-label="Concepto anterior"');
  });

  it('has next button with aria-label "Siguiente concepto"', () => {
    expect(source).toContain('aria-label="Siguiente concepto"');
  });

  // ── Close button ──────────────────────────────────────────

  it('close button aria-label mentions "Escape"', () => {
    expect(source).toMatch(/aria-label="[^"]*Escape[^"]*"/);
  });

  // ── Progress bar ──────────────────────────────────────────

  it('has role="progressbar" with aria-valuenow/min/max', () => {
    expect(source).toContain('role="progressbar"');
    expect(source).toContain('aria-valuenow');
    expect(source).toContain('aria-valuemin');
    expect(source).toContain('aria-valuemax');
  });

  // ── onExitRef pattern to avoid stale closures ─────────────

  it('uses onExitRef pattern to avoid stale closures', () => {
    expect(source).toContain('onExitRef');
    expect(source).toMatch(/onExitRef\.current\s*=\s*onExit/);
    expect(source).toContain('onExitRef.current()');
  });
});
