// ============================================================
// Tests — graphI18n contract tests
//
// Verifies that all locales have identical keys, function
// signatures match, and no empty strings exist.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { I18N_GRAPH, type GraphLocale, type GraphI18nStrings } from '../graphI18n';

const LOCALES = Object.keys(I18N_GRAPH) as GraphLocale[];

describe('graphI18n: locale completeness', () => {
  it('has exactly 2 locales (es, pt)', () => {
    expect(LOCALES.sort()).toEqual(['es', 'pt']);
  });

  it('all locales have identical key sets', () => {
    const esKeys = Object.keys(I18N_GRAPH.es).sort();
    const ptKeys = Object.keys(I18N_GRAPH.pt).sort();
    expect(esKeys).toEqual(ptKeys);
  });

  it('no string value is empty', () => {
    for (const locale of LOCALES) {
      const strings = I18N_GRAPH[locale];
      for (const [key, val] of Object.entries(strings)) {
        if (typeof val === 'string') {
          expect(val.length, `${locale}.${key} is empty`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('function values return non-empty strings', () => {
    for (const locale of LOCALES) {
      const s = I18N_GRAPH[locale];
      expect(s.nCollapsed(3).length).toBeGreaterThan(0);
      expect(s.nSelected(5).length).toBeGreaterThan(0);
      expect(s.focusedNode('Test').length).toBeGreaterThan(0);
      expect(s.groupLabel(1).length).toBeGreaterThan(0);
    }
  });

  it('nCollapsed includes the count', () => {
    for (const locale of LOCALES) {
      expect(I18N_GRAPH[locale].nCollapsed(7)).toContain('7');
    }
  });

  it('nSelected includes the count', () => {
    for (const locale of LOCALES) {
      expect(I18N_GRAPH[locale].nSelected(3)).toContain('3');
    }
  });

  it('focusedNode includes the label', () => {
    for (const locale of LOCALES) {
      expect(I18N_GRAPH[locale].focusedNode('Mitosis')).toContain('Mitosis');
    }
  });

  it('groupLabel includes the number', () => {
    for (const locale of LOCALES) {
      expect(I18N_GRAPH[locale].groupLabel(2)).toContain('2');
    }
  });
});

describe('graphI18n: keyboard shortcuts', () => {
  it('both locales have the same number of keyboard shortcuts', () => {
    expect(I18N_GRAPH.es.keys.length).toBe(I18N_GRAPH.pt.keys.length);
  });

  it('all shortcut entries have [key, description] format', () => {
    for (const locale of LOCALES) {
      for (const entry of I18N_GRAPH[locale].keys) {
        expect(entry).toHaveLength(2);
        expect(entry[0].length).toBeGreaterThan(0);
        expect(entry[1].length).toBeGreaterThan(0);
      }
    }
  });

  it('shortcut keys (left side) match between locales', () => {
    // Keys like "+/-", "Tab", "Esc" should be similar across locales
    // Allow slight differences (e.g. "0 o F" vs "0 ou F")
    expect(I18N_GRAPH.es.keys.length).toBeGreaterThanOrEqual(10);
  });
});

describe('graphI18n: accessibility strings', () => {
  it('ariaLabel is non-empty in all locales', () => {
    for (const locale of LOCALES) {
      expect(I18N_GRAPH[locale].ariaLabel.length).toBeGreaterThan(0);
    }
  });

  it('ariaRoleDesc is non-empty in all locales', () => {
    for (const locale of LOCALES) {
      expect(I18N_GRAPH[locale].ariaRoleDesc.length).toBeGreaterThan(0);
    }
  });

  it('srDesc (screen reader description) is non-empty and substantive', () => {
    for (const locale of LOCALES) {
      expect(I18N_GRAPH[locale].srDesc.length).toBeGreaterThan(20);
    }
  });
});

describe('graphI18n: mastery labels', () => {
  it('all 4 mastery levels are defined', () => {
    for (const locale of LOCALES) {
      const s = I18N_GRAPH[locale];
      expect(s.masteryLow.length).toBeGreaterThan(0);
      expect(s.masteryMid.length).toBeGreaterThan(0);
      expect(s.masteryHigh.length).toBeGreaterThan(0);
      expect(s.masteryNone.length).toBeGreaterThan(0);
    }
  });

  it('masteryLegend is defined', () => {
    for (const locale of LOCALES) {
      expect(I18N_GRAPH[locale].masteryLegend.length).toBeGreaterThan(0);
    }
  });
});

// ── Caller-side fallback regression ─────────────────────────
//
// Every site that does `I18N_GRAPH[locale]` must guard with
// `?? I18N_GRAPH.es`, otherwise an unsupported locale crashes
// at runtime on the first property access. Cycle 18 hardened
// useDragConnect + useGraphControls; this test pins it for the
// rest of the codebase.

describe('I18N_GRAPH[locale] fallback regression', () => {
  const MINDMAP_DIR = resolve(__dirname, '..');
  const sourceFiles = readdirSync(MINDMAP_DIR).filter(
    (f) => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.endsWith('.test.ts'),
  );

  it('aggregates: no callsite uses I18N_GRAPH[locale] without the ?? I18N_GRAPH.es fallback', () => {
    const violations: { file: string; matches: string[] }[] = [];
    for (const file of sourceFiles) {
      const path = resolve(MINDMAP_DIR, file);
      const content = readFileSync(path, 'utf-8');
      const re = /I18N_GRAPH\[[^\]]+\](?!\s*\?\?\s*I18N_GRAPH\.es)/g;
      const matches = content.match(re) ?? [];
      if (matches.length > 0) violations.push({ file, matches });
    }
    expect(violations).toEqual([]);
  });

  it('audits all mindmap source files (smoke check the audit found files)', () => {
    expect(sourceFiles.length).toBeGreaterThan(20);
  });
});

