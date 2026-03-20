// ============================================================
// Contract Tests — GraphTemplatePanel
//
// Source-based contract tests using readFileSync + string/regex
// matching to verify structural contracts without importing
// heavy dependencies (motion/react, etc.).
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(
  resolve(__dirname, '..', 'GraphTemplatePanel.tsx'),
  'utf-8',
);

describe('GraphTemplatePanel contract', () => {
  // ── Export ─────────────────────────────────────────────────

  it('exports GraphTemplatePanel as a named function', () => {
    expect(source).toMatch(/export\s+function\s+GraphTemplatePanel/);
  });

  // ── Focus management ──────────────────────────────────────

  it('uses useFocusTrap for focus management', () => {
    expect(source).toContain('useFocusTrap');
    expect(source).toMatch(/import\s*\{[^}]*useFocusTrap[^}]*\}\s*from/);
  });

  // ── ConfirmDialog for delete confirmation ─────────────────

  it('uses ConfirmDialog for delete confirmation', () => {
    expect(source).toContain('ConfirmDialog');
    expect(source).toMatch(/import\s*\{[^}]*ConfirmDialog[^}]*\}\s*from/);
  });

  it('has delete confirmation dialog with Spanish title', () => {
    expect(source).toContain('Eliminar plantilla');
  });

  // ── API calls ─────────────────────────────────────────────

  it('imports fetchGraphTemplates from mindmapApi', () => {
    expect(source).toContain('fetchGraphTemplates');
    expect(source).toMatch(/import\s*\{[^}]*fetchGraphTemplates[^}]*\}\s*from/);
  });

  it('imports createGraphTemplate from mindmapApi', () => {
    expect(source).toContain('createGraphTemplate');
    expect(source).toMatch(/import\s*\{[^}]*createGraphTemplate[^}]*\}\s*from/);
  });

  it('imports deleteGraphTemplate from mindmapApi', () => {
    expect(source).toContain('deleteGraphTemplate');
    expect(source).toMatch(/import\s*\{[^}]*deleteGraphTemplate[^}]*\}\s*from/);
  });

  // ── Spanish labels and toasts ─────────────────────────────

  it('has "Guardar como plantilla" button label', () => {
    expect(source).toContain('Guardar como plantilla');
  });

  it('shows "Plantilla guardada" success toast', () => {
    expect(source).toContain('Plantilla guardada');
  });

  it('shows "Plantilla eliminada" success toast', () => {
    expect(source).toContain('Plantilla eliminada');
  });

  it('has "Plantillas de Grafo" heading', () => {
    expect(source).toContain('Plantillas de Grafo');
  });

  it('has "Sin plantillas" empty state text', () => {
    expect(source).toContain('Sin plantillas');
  });

  // ── AnimatePresence for panel animation ───────────────────

  it('uses AnimatePresence from motion/react', () => {
    expect(source).toContain('AnimatePresence');
    expect(source).toMatch(/import\s*\{[^}]*AnimatePresence[^}]*\}\s*from\s*['"]motion\/react['"]/);
  });

  // ── Close button with X icon ──────────────────────────────

  it('imports X icon from lucide-react', () => {
    expect(source).toMatch(/import\s*\{[^}]*\bX\b[^}]*\}\s*from\s*['"]lucide-react['"]/);
  });

  it('renders X icon in close button', () => {
    expect(source).toContain('<X ');
  });

  it('close button has aria-label', () => {
    expect(source).toContain('aria-label="Cerrar panel de plantillas"');
  });

  // ── Dialog semantics ──────────────────────────────────────

  it('has role="dialog" for panel', () => {
    expect(source).toContain('role="dialog"');
  });

  it('has aria-modal="true"', () => {
    expect(source).toContain('aria-modal="true"');
  });

  // ── Escape key handler ────────────────────────────────────

  it('closes on Escape key', () => {
    expect(source).toContain("e.key !== 'Escape'");
  });

  // ── Double-action guards ──────────────────────────────────

  it('uses savingRef to prevent double-save', () => {
    expect(source).toContain('savingRef.current');
  });

  it('uses deletingRef to prevent double-delete', () => {
    expect(source).toContain('deletingRef.current');
  });
});
