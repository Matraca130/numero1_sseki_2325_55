// ============================================================
// Tests -- MapViewEmptyStates contract tests
//
// Source-contract tests for the 7 empty/error state components:
//   MapViewLoadingSkeleton, MapViewError, NoTopicSelected,
//   CourseScopeEmpty, TopicEmpty, GraphErrorFallback,
//   AllCollapsedHint, SearchNoResults
//
// Validates: exports, props contracts, conditional logic,
// accessibility, i18n integration.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const COMPONENT_PATH = resolve(__dirname, '..', 'MapViewEmptyStates.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// ── Module exports ──────────────────────────────────────────

describe('MapViewEmptyStates: module exports', () => {
  const expectedExports = [
    'MapViewLoadingSkeleton',
    'MapViewError',
    'NoTopicSelected',
    'CourseScopeEmpty',
    'TopicEmpty',
    'GraphErrorFallback',
    'AllCollapsedHint',
    'SearchNoResults',
  ];

  for (const name of expectedExports) {
    it(`exports ${name} as a named function`, () => {
      expect(source).toMatch(new RegExp(`export\\s+function\\s+${name}\\s*\\(`));
    });
  }

  it('has no default export', () => {
    expect(source).not.toMatch(/export\s+default/);
  });

  it('exports exactly 8 components (no extra exports)', () => {
    const exportMatches = source.match(/export\s+function\s+\w+/g) || [];
    expect(exportMatches.length).toBe(8);
  });
});

// ── MapViewLoadingSkeleton ──────────────────────────────────

describe('MapViewLoadingSkeleton: contract', () => {
  it('takes no props', () => {
    expect(source).toMatch(/export\s+function\s+MapViewLoadingSkeleton\s*\(\s*\)/);
  });

  it('renders skeleton pulses with animate-pulse class', () => {
    expect(source).toContain('animate-pulse');
  });

  it('includes motion-reduce:animate-none for accessibility', () => {
    expect(source).toContain('motion-reduce:animate-none');
  });

  it('renders GraphSkeleton for the canvas area', () => {
    expect(source).toContain('<GraphSkeleton');
  });

  it('wraps in FadeIn', () => {
    expect(source).toContain('<FadeIn>');
  });
});

// ── MapViewError ────────────────────────────────────────────

describe('MapViewError: contract', () => {
  it('requires message (string) and onRetry (function) props', () => {
    expect(source).toContain('message: string');
    expect(source).toContain('onRetry: () => void');
  });

  it('delegates to ErrorState component', () => {
    expect(source).toContain('<ErrorState');
  });

  it('passes message and onRetry to ErrorState', () => {
    expect(source).toMatch(/message=\{message\}/);
    expect(source).toMatch(/onRetry=\{onRetry\}/);
  });
});

// ── NoTopicSelected ─────────────────────────────────────────

describe('NoTopicSelected: contract', () => {
  it('requires allTopics array, onTopicSelect callback, and t i18n', () => {
    expect(source).toContain('allTopics: { id: string; name: string; courseName: string }[]');
    expect(source).toContain('onTopicSelect: (tid: string) => void');
    // t prop
    expect(source).toMatch(/t:\s*MapViewI18nStrings/);
  });

  it('conditionally renders select when allTopics.length > 0', () => {
    expect(source).toContain('allTopics.length > 0');
    expect(source).toContain('<select');
  });

  it('renders noTopicsAvailable message when allTopics is empty', () => {
    expect(source).toContain('{t.noTopicsAvailable}');
  });

  it('uses t.pageTitle for the heading', () => {
    expect(source).toContain('{t.pageTitle}');
  });

  it('uses t.selectTopicPrompt for description', () => {
    expect(source).toContain('{t.selectTopicPrompt}');
  });

  it('uses t.selectTopicPlaceholder for the default option', () => {
    expect(source).toContain('{t.selectTopicPlaceholder}');
  });

  it('maps each topic as an option with courseName and name', () => {
    expect(source).toContain('allTopics.map(topic');
    expect(source).toContain('topic.courseName');
    expect(source).toContain('topic.name');
  });

  it('calls onTopicSelect when a topic is selected', () => {
    expect(source).toContain('onTopicSelect(e.target.value)');
  });

  it('guards against empty-string selection', () => {
    expect(source).toContain('e.target.value && onTopicSelect');
  });
});

// ── CourseScopeEmpty ────────────────────────────────────────

describe('CourseScopeEmpty: contract', () => {
  it('requires courseName, courseTopicIds, onBack, t props', () => {
    expect(source).toContain('courseName: string | undefined');
    expect(source).toContain('courseTopicIds: string[]');
    expect(source).toContain('onBack: () => void');
  });

  it('falls back to t.allTopics when courseName is undefined', () => {
    expect(source).toContain('courseName || t.allTopics');
  });

  it('shows different message based on courseTopicIds.length', () => {
    expect(source).toContain('courseTopicIds.length === 0');
    expect(source).toContain('t.noCourseConceptsNoTopics');
    expect(source).toContain('t.noCourseConceptsEmpty');
  });

  it('renders AxonPageHeader with title and subtitle', () => {
    expect(source).toContain('<AxonPageHeader');
  });

  it('renders EmptyState with Globe icon', () => {
    expect(source).toContain('<EmptyState');
    expect(source).toContain('Globe');
  });
});

// ── TopicEmpty ──────────────────────────────────────────────

describe('TopicEmpty: contract', () => {
  it('requires onBack and t props', () => {
    // Interface check
    expect(source).toMatch(/interface\s+TopicEmptyProps/);
    expect(source).toContain('onBack: () => void');
  });

  it('uses t.noConceptsTitle and t.noConceptsDescription', () => {
    expect(source).toContain('t.noConceptsTitle');
    expect(source).toContain('t.noConceptsDescription');
  });

  it('renders Brain icon', () => {
    // Brain is used as the EmptyState icon
    expect(source).toMatch(/<Brain\s/);
  });
});

// ── GraphErrorFallback ──────────────────────────────────────

describe('GraphErrorFallback: contract', () => {
  it('requires reset and t props', () => {
    expect(source).toMatch(/interface\s+GraphErrorFallbackProps/);
    expect(source).toContain('reset: () => void');
  });

  it('shows t.graphRenderError message', () => {
    expect(source).toContain('{t.graphRenderError}');
  });

  it('shows retry button with t.retry text', () => {
    expect(source).toContain('{t.retry}');
  });

  it('calls reset on retry click', () => {
    expect(source).toContain('onClick={reset}');
  });

  it('renders RefreshCw icon', () => {
    expect(source).toContain('RefreshCw');
  });
});

// ── AllCollapsedHint ────────────────────────────────────────

describe('AllCollapsedHint: contract', () => {
  it('requires onExpandAll and t props', () => {
    expect(source).toMatch(/interface\s+AllCollapsedHintProps/);
    expect(source).toContain('onExpandAll: () => void');
  });

  it('shows t.allCollapsed message', () => {
    expect(source).toContain('{t.allCollapsed}');
  });

  it('shows expand-all button with t.expandAll text', () => {
    expect(source).toContain('{t.expandAll}');
  });

  it('calls onExpandAll on click', () => {
    expect(source).toContain('onClick={onExpandAll}');
  });

  it('uses pointer-events-none on the overlay container', () => {
    expect(source).toContain('pointer-events-none');
  });

  it('uses pointer-events-auto on the inner content', () => {
    expect(source).toContain('pointer-events-auto');
  });
});

// ── SearchNoResults ─────────────────────────────────────────

describe('SearchNoResults: contract', () => {
  it('requires t prop only', () => {
    expect(source).toMatch(/interface\s+SearchNoResultsProps/);
    // Only has t
    expect(source).toMatch(/SearchNoResultsProps\s*\{[\s\n]*t:\s*MapViewI18nStrings/);
  });

  it('shows t.searchNoResults heading', () => {
    expect(source).toContain('{t.searchNoResults}');
  });

  it('shows t.searchTryAnother description', () => {
    expect(source).toContain('{t.searchTryAnother}');
  });

  it('renders Brain icon', () => {
    // Uses Brain icon in the no-results display
    expect(source).toContain('<Brain');
  });
});

// ── Dependencies ────────────────────────────────────────────

describe('MapViewEmptyStates: dependencies', () => {
  it('imports from design-system', () => {
    expect(source).toContain("from '@/app/design-system'");
  });

  it('imports MapViewI18nStrings type', () => {
    expect(source).toMatch(/import\s+type\s+\{[^}]*MapViewI18nStrings[^}]*\}/);
  });

  it('imports shared PageStates components', () => {
    expect(source).toContain("from '@/app/components/shared/PageStates'");
  });

  it('imports AxonPageHeader', () => {
    expect(source).toContain("from '@/app/components/shared/AxonPageHeader'");
  });

  it('imports FadeIn', () => {
    expect(source).toContain("from '@/app/components/shared/FadeIn'");
  });

  it('imports GraphSkeleton', () => {
    expect(source).toContain("from './GraphSkeleton'");
  });
});
