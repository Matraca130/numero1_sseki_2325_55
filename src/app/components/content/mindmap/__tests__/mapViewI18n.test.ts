// ============================================================
// Tests -- mapViewI18n contract tests
//
// Verifies that all locales have identical keys, function
// signatures match, and no empty strings exist.
// Follows the same pattern as graphI18n.test.ts.
// ============================================================

import { describe, it, expect } from 'vitest';
import { I18N_MAP_VIEW, type MapViewI18nStrings } from '../mapViewI18n';
import type { GraphLocale } from '../graphI18n';

const LOCALES = Object.keys(I18N_MAP_VIEW) as GraphLocale[];

describe('mapViewI18n: locale completeness', () => {
  it('has exactly 2 locales (es, pt)', () => {
    expect(LOCALES.sort()).toEqual(['es', 'pt']);
  });

  it('all locales have identical key sets', () => {
    const ptKeys = Object.keys(I18N_MAP_VIEW.pt).sort();
    const esKeys = Object.keys(I18N_MAP_VIEW.es).sort();
    expect(ptKeys).toEqual(esKeys);
  });

  it('no string value is empty', () => {
    for (const locale of LOCALES) {
      const strings = I18N_MAP_VIEW[locale];
      for (const [key, val] of Object.entries(strings)) {
        if (typeof val === 'string') {
          expect(val.length, `${locale}.${key} is empty`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('all expected keys from MapViewI18nStrings are present', () => {
    const expectedStringKeys: (keyof MapViewI18nStrings)[] = [
      'connectionCancelled',
      'deleteOnlyUserCreated',
      'deleteNodeError',
      'selfLoopError',
      'duplicateEdgeError',
      'reconnectEdgeError',
      'maxStickyNotes',
      'untitled',
      'pageTitle',
      'selectTopicPrompt',
      'selectTopicPlaceholder',
      'noTopicsAvailable',
      'allTopics',
      'mapFallbackLabel',
      'noCourseConceptsTitle',
      'noCourseConceptsNoTopics',
      'noCourseConceptsEmpty',
      'pageSubtitle',
      'noConceptsTitle',
      'noConceptsDescription',
      'srNoResults',
      'searchNoResults',
      'searchTryAnother',
      'graphRenderError',
      'retry',
      'allCollapsed',
      'expandAll',
      'stickyNotesError',
      'selectTarget',
      'cancelConnection',
      'aiPanelError',
      'historyPanelError',
      'comparisonPanelError',
      'annotationError',
      'contextMenuError',
      'formError',
      'shareError',
      'confirmDialogError',
      'presentationError',
      'onboardingAriaLabel',
      'onboardingTitle',
      'onboardingTip1',
      'onboardingTip2',
      'onboardingTip3',
      'onboardingDismiss',
      'deleteDialogTitle',
      'cancel',
      'deleteLabel',
      'close',
      'exit',
      'linkCopied',
      'linkCopyFallback',
      'exportMapError',
    ];

    for (const locale of LOCALES) {
      const strings = I18N_MAP_VIEW[locale];
      for (const key of expectedStringKeys) {
        expect(strings, `${locale} missing key ${key}`).toHaveProperty(key);
      }
    }
  });
});

describe('mapViewI18n: function values return non-empty strings', () => {
  it('connectSourceSelected returns a non-empty string', () => {
    for (const locale of LOCALES) {
      const result = I18N_MAP_VIEW[locale].connectSourceSelected('TestNode');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('edgeReconnected returns a non-empty string', () => {
    for (const locale of LOCALES) {
      const result = I18N_MAP_VIEW[locale].edgeReconnected('NodeA', 'NodeB');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('srResultsFound returns a non-empty string', () => {
    for (const locale of LOCALES) {
      const result = I18N_MAP_VIEW[locale].srResultsFound(5, 'mitosis');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('deleteDialogDescription returns a non-empty string', () => {
    for (const locale of LOCALES) {
      const result = I18N_MAP_VIEW[locale].deleteDialogDescription('TestConcept');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });
});

describe('mapViewI18n: function values include their arguments', () => {
  it('connectSourceSelected includes the label', () => {
    for (const locale of LOCALES) {
      expect(I18N_MAP_VIEW[locale].connectSourceSelected('Mitosis')).toContain('Mitosis');
    }
  });

  it('edgeReconnected includes both source and target', () => {
    for (const locale of LOCALES) {
      const result = I18N_MAP_VIEW[locale].edgeReconnected('CellA', 'CellB');
      expect(result).toContain('CellA');
      expect(result).toContain('CellB');
    }
  });

  it('srResultsFound includes the count and query', () => {
    for (const locale of LOCALES) {
      const result = I18N_MAP_VIEW[locale].srResultsFound(42, 'DNA');
      expect(result).toContain('42');
      expect(result).toContain('DNA');
    }
  });

  it('deleteDialogDescription includes the label', () => {
    for (const locale of LOCALES) {
      expect(I18N_MAP_VIEW[locale].deleteDialogDescription('Chromosome')).toContain('Chromosome');
    }
  });
});

describe('mapViewI18n: onboarding strings', () => {
  it('all onboarding strings are non-empty in both locales', () => {
    for (const locale of LOCALES) {
      const s = I18N_MAP_VIEW[locale];
      expect(s.onboardingAriaLabel.length).toBeGreaterThan(0);
      expect(s.onboardingTitle.length).toBeGreaterThan(0);
      expect(s.onboardingTip1.length).toBeGreaterThan(0);
      expect(s.onboardingTip2.length).toBeGreaterThan(0);
      expect(s.onboardingTip3.length).toBeGreaterThan(0);
      expect(s.onboardingDismiss.length).toBeGreaterThan(0);
    }
  });
});

describe('mapViewI18n: error boundary strings', () => {
  it('all panel error strings are non-empty in both locales', () => {
    const errorKeys: (keyof MapViewI18nStrings)[] = [
      'aiPanelError',
      'historyPanelError',
      'comparisonPanelError',
      'annotationError',
      'contextMenuError',
      'formError',
      'shareError',
      'confirmDialogError',
      'presentationError',
    ];
    for (const locale of LOCALES) {
      const s = I18N_MAP_VIEW[locale] as Record<string, unknown>;
      for (const key of errorKeys) {
        const val = s[key];
        expect(typeof val).toBe('string');
        expect((val as string).length, `${locale}.${key} is empty`).toBeGreaterThan(0);
      }
    }
  });

  it('graphRenderError and retry are non-empty', () => {
    for (const locale of LOCALES) {
      expect(I18N_MAP_VIEW[locale].graphRenderError.length).toBeGreaterThan(0);
      expect(I18N_MAP_VIEW[locale].retry.length).toBeGreaterThan(0);
    }
  });
});

describe('mapViewI18n: confirm delete dialog', () => {
  it('deleteDialogTitle is non-empty', () => {
    for (const locale of LOCALES) {
      expect(I18N_MAP_VIEW[locale].deleteDialogTitle.length).toBeGreaterThan(0);
    }
  });

  it('cancel and deleteLabel are non-empty', () => {
    for (const locale of LOCALES) {
      expect(I18N_MAP_VIEW[locale].cancel.length).toBeGreaterThan(0);
      expect(I18N_MAP_VIEW[locale].deleteLabel.length).toBeGreaterThan(0);
    }
  });

  it('deleteDialogDescription is a function that accepts label', () => {
    for (const locale of LOCALES) {
      expect(typeof I18N_MAP_VIEW[locale].deleteDialogDescription).toBe('function');
    }
  });
});
