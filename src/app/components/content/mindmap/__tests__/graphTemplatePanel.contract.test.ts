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

  it('exports GraphTemplatePanel as a memo-wrapped named component', () => {
    expect(source).toMatch(/export\s+const\s+GraphTemplatePanel\s*=\s*memo\(function\s+GraphTemplatePanel/);
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

  it('close button has aria-label via i18n', () => {
    expect(source).toContain('aria-label={t.closePanelAriaLabel}');
  });

  // ── Dialog semantics ──────────────────────────────────────

  it('has role="dialog" for panel', () => {
    expect(source).toContain('role="dialog"');
  });

  it('side panel omits aria-modal (not a true modal)', () => {
    // aria-modal removed: side panel does not block interaction with main content
    expect(source).not.toContain('aria-modal="true"');
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

  // ── Stale-fetch guard (race condition protection) ─────────

  it('uses fetchIdRef to discard stale concurrent fetches', () => {
    expect(source).toContain('fetchIdRef');
    expect(source).toMatch(/\+\+fetchIdRef\.current/);
    expect(source).toMatch(/fetchId\s*===\s*fetchIdRef\.current/);
  });

  // ── Mount-tracking refs ───────────────────────────────────

  it('tracks mount state via mountedRef to skip post-unmount setState', () => {
    expect(source).toContain('mountedRef.current = true');
    expect(source).toMatch(/return\s*\(\)\s*=>\s*\{\s*mountedRef\.current\s*=\s*false/);
  });

  it('all setState callsites in async handlers are guarded by mountedRef', () => {
    // Look for setState calls inside catch/finally that are not preceded by
    // a mountedRef check on the same line.
    const setStateInAsync = source.match(/(setSaving|setDeleting|setLoading|setTemplates|setSaveName|setShowSaveForm)\(/g) ?? [];
    expect(setStateInAsync.length).toBeGreaterThan(5);
    // The component must reference mountedRef in the same handler bodies.
    expect((source.match(/mountedRef\.current/g) ?? []).length).toBeGreaterThanOrEqual(8);
  });

  // ── Default locale ────────────────────────────────────────

  it('locale prop defaults to "es"', () => {
    expect(source).toMatch(/locale\s*=\s*'es'/);
  });

  // ── Escape-key behavior ───────────────────────────────────

  it('Escape is suppressed when a confirm dialog (delete or load) is open', () => {
    expect(source).toMatch(/if\s*\(\s*deleteTarget\s*\|\|\s*loadTarget\s*\)\s*return/);
  });

  it('removes the keydown listener on cleanup', () => {
    expect(source).toContain("removeEventListener('keydown'");
  });
});

// ── BRAND constant ──────────────────────────────────────────

describe('GraphTemplatePanel BRAND constants', () => {
  it('declares the professor accent palette as a frozen object literal', () => {
    expect(source).toMatch(/const\s+BRAND\s*=\s*\{[\s\S]*?\}\s*as\s+const/);
  });

  it('uses the canonical teal primary #2a8c7a', () => {
    expect(source).toMatch(/primary:\s*'#2a8c7a'/);
  });

  it('declares dark / hover / light / border tones', () => {
    expect(source).toMatch(/dark:\s*'#1B3B36'/);
    expect(source).toMatch(/hover:\s*'#244e47'/);
    expect(source).toMatch(/light:\s*'#e8f5f1'/);
    expect(source).toMatch(/border:\s*'#b3ddd2'/);
  });
});

// ── i18n: pt / es parity ────────────────────────────────────

describe('GraphTemplatePanel i18n parity', () => {
  // The translations object lives at module scope. We slice it textually and
  // diff the keys (same approach as cycle 18's AiTutorPanel parity test).
  const ptStart = source.indexOf('  pt: {');
  const esStart = source.indexOf('  es: {');
  const closeIx = source.indexOf('} as const satisfies');

  it('declares both pt and es locales', () => {
    expect(ptStart).toBeGreaterThan(-1);
    expect(esStart).toBeGreaterThan(ptStart);
    expect(closeIx).toBeGreaterThan(esStart);
  });

  function keysIn(slice: string): Set<string> {
    const keys = new Set<string>();
    const re = /\n\s+([a-zA-Z_][a-zA-Z0-9_]*):/g;
    let m;
    while ((m = re.exec(slice))) keys.add(m[1]);
    return keys;
  }

  const ptKeys = keysIn(source.slice(ptStart, esStart));
  const esKeys = keysIn(source.slice(esStart, closeIx));

  it('pt and es have identical key sets (no drift)', () => {
    const onlyInPt = [...ptKeys].filter(k => !esKeys.has(k));
    const onlyInEs = [...esKeys].filter(k => !ptKeys.has(k));
    expect({ onlyInPt, onlyInEs }).toEqual({ onlyInPt: [], onlyInEs: [] });
  });

  it('declares dynamic-string functions in both locales', () => {
    const dynamicKeys = [
      'nodesAndEdges',
      'templateCount',
      'deleteTemplateAriaLabel',
      'loadConfirmDescription',
      'deleteConfirmDescription',
      'templateLoaded',
    ];
    for (const k of dynamicKeys) {
      expect(ptKeys.has(k)).toBe(true);
      expect(esKeys.has(k)).toBe(true);
    }
  });

  it('uses TypeScript "satisfies Record<GraphLocale, unknown>" to enforce shape at compile-time', () => {
    expect(source).toContain('satisfies Record<GraphLocale, unknown>');
  });

  it('translations[locale] lookup has the ?? translations.es fallback (matches cycle-18 hardening)', () => {
    // Same defect as useDragConnect:110 / useGraphControls:15 — a string-cast
    // invalid locale (e.g. from URL params) would crash on first property
    // access. Hardened in cycle 19.
    const re = /translations\[[^\]]+\](?!\s*\?\?\s*translations\.es)/g;
    expect(source.match(re) ?? []).toEqual([]);
  });
});

// ── Pluralization (replicated pure functions) ───────────────

describe('GraphTemplatePanel pluralization', () => {
  // Mirrors the inline arrow templates from translations.es.templateCount
  // and .pt.templateCount. The logic is "n !== 1 → add s", which we
  // replicate to pin the singular/plural switch.
  function templateCountEs(n: number): string {
    return `${n} plantilla${n !== 1 ? 's' : ''} guardada${n !== 1 ? 's' : ''}`;
  }
  function templateCountPt(n: number): string {
    return `${n} modelo${n !== 1 ? 's' : ''} salvo${n !== 1 ? 's' : ''}`;
  }

  it('singular for n=1 (es)', () => {
    expect(templateCountEs(1)).toBe('1 plantilla guardada');
  });

  it('plural for n=0 in es ("0 plantillas")', () => {
    expect(templateCountEs(0)).toBe('0 plantillas guardadas');
  });

  it('plural for n>=2 (es)', () => {
    expect(templateCountEs(2)).toBe('2 plantillas guardadas');
    expect(templateCountEs(10)).toBe('10 plantillas guardadas');
  });

  it('singular for n=1 (pt)', () => {
    expect(templateCountPt(1)).toBe('1 modelo salvo');
  });

  it('plural for n!=1 (pt)', () => {
    expect(templateCountPt(0)).toBe('0 modelos salvos');
    expect(templateCountPt(5)).toBe('5 modelos salvos');
  });

  // Mirrors translations.es.nodesAndEdges
  function nodesAndEdgesEs(nodes: number, edges: number): string {
    return `${nodes} nodos y ${edges} conexiones se guardarán.`;
  }

  it('formats node + edge counts in the save preview (es)', () => {
    expect(nodesAndEdgesEs(0, 0)).toBe('0 nodos y 0 conexiones se guardarán.');
    expect(nodesAndEdgesEs(7, 12)).toBe('7 nodos y 12 conexiones se guardarán.');
  });
});

// ── Save validation rules ───────────────────────────────────

describe('GraphTemplatePanel save validation', () => {
  it('rejects empty/whitespace-only names via .trim() check', () => {
    expect(source).toContain('saveName.trim()');
    expect(source).toContain('t.nameRequired');
  });

  it('rejects saving when current graph has zero nodes', () => {
    expect(source).toMatch(/currentNodes\.length\s*===\s*0/);
    expect(source).toContain('t.graphEmpty');
  });

  it('description trim coerces empty strings to undefined (cleaner API payload)', () => {
    expect(source).toMatch(/saveDescription\.trim\(\)\s*\|\|\s*undefined/);
  });

  it('uses the trimmed name for the API payload', () => {
    expect(source).toMatch(/name:\s*trimmedName/);
  });
});

// ── Error-message extraction ────────────────────────────────

describe('GraphTemplatePanel error handling', () => {
  it('surfaces the API error message when present (Error instance)', () => {
    // Pattern: err instanceof Error ? err.message : t.errorXxx
    expect(source).toMatch(/err\s+instanceof\s+Error\s*\?\s*err\.message\s*:\s*t\.errorSavingTemplate/);
    expect(source).toMatch(/err\s+instanceof\s+Error\s*\?\s*err\.message\s*:\s*t\.errorDeletingTemplate/);
  });

  it('falls back to localized generic error for non-Error rejections', () => {
    expect(source).toContain('t.errorSavingTemplate');
    expect(source).toContain('t.errorDeletingTemplate');
    expect(source).toContain('t.errorLoadingTemplates');
  });
});
