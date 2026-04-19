// ============================================================
// Tests -- MicroGraphPanel contract tests
//
// Source-contract tests for the MicroGraphPanel component:
//   - Module exports (named, no default)
//   - Props interface contract
//   - Lazy loading of MiniKnowledgeGraph (G6 not in initial bundle)
//   - Small-screen detection via useSyncExternalStore + matchMedia
//   - Deferred data fetch until first expansion
//   - Local subgraph fallback logic
//   - Error state with refetch
//   - ErrorBoundary wrapper
//   - Early return conditions
//   - Variant styling (card vs section)
//   - Accessibility (ARIA attributes, touch targets, sr-only)
//   - i18n strings (Spanish)
//   - Animation (AnimatePresence, chevron rotation)
//   - Dependencies
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const COMPONENT_PATH = resolve(__dirname, '..', 'MicroGraphPanel.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// ── Module exports ──────────────────────────────────────────

describe('MicroGraphPanel: module exports', () => {
  it('exports MicroGraphPanel as a named function', () => {
    expect(source).toMatch(/export\s+function\s+MicroGraphPanel/);
  });

  it('has no default export', () => {
    expect(source).not.toMatch(/export\s+default/);
  });
});

// ── Props interface ─────────────────────────────────────────

describe('MicroGraphPanel: props interface', () => {
  it('accepts optional topicId string', () => {
    expect(source).toContain('topicId?: string');
  });

  it('accepts optional summaryId string', () => {
    expect(source).toContain('summaryId?: string');
  });

  it('requires focalNodeId (string | undefined)', () => {
    expect(source).toContain('focalNodeId: string | undefined');
  });

  it('accepts optional onNodeClick callback with MapNode param', () => {
    expect(source).toContain('onNodeClick?: (node: MapNode) => void');
  });

  it('accepts optional height with default 160', () => {
    expect(source).toContain('height?: number');
    expect(source).toContain('height: heightProp = 160');
  });

  it('accepts optional panelId with default micro-graph-panel', () => {
    expect(source).toContain('panelId?: string');
    expect(source).toContain("panelId = 'micro-graph-panel'");
  });

  it('accepts optional variant with default section', () => {
    expect(source).toMatch(/variant\?\s*:\s*'card'\s*\|\s*'section'/);
    expect(source).toContain("variant = 'section'");
  });
});

// ── Lazy loading ────────────────────────────────────────────

describe('MicroGraphPanel: lazy loading MiniKnowledgeGraph', () => {
  it('lazy-loads MiniKnowledgeGraph via React.lazy', () => {
    expect(source).toMatch(/const\s+MiniKnowledgeGraph\s*=\s*lazy\s*\(/);
  });

  it('imports from ./MiniKnowledgeGraph', () => {
    expect(source).toContain("import('./MiniKnowledgeGraph')");
  });

  it('wraps MiniKnowledgeGraph in Suspense with fallback', () => {
    expect(source).toContain('<Suspense fallback={<GraphLoadingPlaceholder');
  });

  it('imports Suspense from react', () => {
    expect(source).toMatch(/import\s*\{[^}]*Suspense[^}]*\}\s*from\s*'react'/);
  });
});

// ── Small-screen detection ──────────────────────────────────

describe('MicroGraphPanel: small-screen detection', () => {
  it('uses matchMedia with max-width: 639px query', () => {
    expect(source).toContain("'(max-width: 639px)'");
  });

  it('uses useSyncExternalStore for reactive detection', () => {
    expect(source).toContain('useSyncExternalStore');
    expect(source).toContain('subscribeSmallScreen');
    expect(source).toContain('getSmallScreenSnapshot');
    expect(source).toContain('getSmallScreenServerSnapshot');
  });

  it('provides SSR-safe server snapshot returning false', () => {
    expect(source).toMatch(/function\s+getSmallScreenServerSnapshot\s*\(\s*\)\s*\{\s*\n?\s*return\s+false/);
  });

  it('cleans up matchMedia listener on unsubscribe', () => {
    expect(source).toContain('removeEventListener');
  });

  it('boosts height to at least 200 on mobile', () => {
    expect(source).toContain('Math.max(heightProp, 200)');
  });
});

// ── Deferred data fetch ─────────────────────────────────────

describe('MicroGraphPanel: deferred data fetch', () => {
  it('tracks hasBeenExpanded state to defer fetch', () => {
    expect(source).toContain('const [hasBeenExpanded, setHasBeenExpanded] = useState(false)');
  });

  it('sets hasBeenExpanded to true on first expansion', () => {
    expect(source).toContain('if (expanded && !hasBeenExpanded) setHasBeenExpanded(true)');
  });

  it('passes undefined topicId until first expansion', () => {
    expect(source).toMatch(/effectiveTopicId\s*=\s*hasBeenExpanded\s*\?\s*\(topicId/);
  });

  it('passes undefined summaryId until first expansion', () => {
    expect(source).toMatch(/effectiveSummaryId\s*=\s*hasBeenExpanded\s*\?\s*\(summaryId/);
  });

  it('trims whitespace from topicId and summaryId', () => {
    expect(source).toContain('topicId?.trim()');
    expect(source).toContain('summaryId?.trim()');
  });
});

// ── Local subgraph logic ────────────────────────────────────

describe('MicroGraphPanel: local subgraph', () => {
  it('uses useLocalGraph with depth 1', () => {
    expect(source).toContain('useLocalGraph(graphData, focalNodeId, 1)');
  });

  it('prefers local subgraph when focal node has results', () => {
    expect(source).toContain('focalNodeId && localGraph && localGraph.nodes.length > 0 ? localGraph : graphData');
  });

  it('memoizes displayGraph selection', () => {
    expect(source).toMatch(/useMemo\s*\(\s*\n?\s*\(\)\s*=>\s*focalNodeId\s*&&\s*localGraph/);
  });

  it('shows node count with local indicator when subgraph is smaller', () => {
    expect(source).toContain("' · local'");
  });
});

// ── Early returns ───────────────────────────────────────────

describe('MicroGraphPanel: early return conditions', () => {
  it('returns null when neither topicId nor summaryId is provided', () => {
    expect(source).toContain("if (!topicId?.trim() && !summaryId?.trim()) return null");
  });

  it('returns null when fetched empty and collapsed', () => {
    expect(source).toContain('if (hasBeenExpanded && !expanded && !loading && !error && !hasData) return null');
  });
});

// ── Error state ─────────────────────────────────────────────

describe('MicroGraphPanel: error state', () => {
  it('renders a retry button on error', () => {
    expect(source).toContain('if (error)');
    expect(source).toContain('refetch()');
  });

  it('shows "Mapa no disponible" error message', () => {
    expect(source).toContain('Mapa no disponible');
  });

  it('has accessible aria-label on retry button', () => {
    expect(source).toContain('aria-label="Mapa no disponible. Toca para reintentar."');
  });

  it('renders RefreshCw icon in error state', () => {
    expect(source).toContain('RefreshCw');
  });
});

// ── ErrorBoundary wrapper ───────────────────────────────────

describe('MicroGraphPanel: ErrorBoundary', () => {
  it('wraps content in ErrorBoundary', () => {
    expect(source).toContain('<ErrorBoundary');
  });

  it('provides fallback with reset callback', () => {
    expect(source).toMatch(/fallback=\{\s*\(\s*_err\s*,\s*reset\s*\)\s*=>/);
  });

  it('shows "Grafo no disponible" in ErrorBoundary fallback', () => {
    expect(source).toContain('Grafo no disponible');
  });
});

// ── Variant styling ─────────────────────────────────────────

describe('MicroGraphPanel: variant styling', () => {
  it('card variant uses rounded-2xl and shadow-sm', () => {
    expect(source).toMatch(/variant\s*===\s*'card'[\s\S]*?rounded-2xl[\s\S]*?shadow-sm/);
  });

  it('section variant uses border-t', () => {
    expect(source).toContain('border-t border-gray-200/60');
  });

  it('card variant shows full label "Mapa de conocimiento"', () => {
    expect(source).toContain("variant === 'card' ? 'Mapa de conocimiento' : 'Mapa'");
  });
});

// ── Accessibility ───────────────────────────────────────────

describe('MicroGraphPanel: accessibility', () => {
  it('uses aria-expanded on toggle button', () => {
    expect(source).toContain('aria-expanded={expanded}');
  });

  it('uses aria-controls linked to panelId', () => {
    expect(source).toContain('aria-controls={panelId}');
  });

  it('has aria-label for toggle describing open/close state', () => {
    expect(source).toContain("'Cerrar mapa de conocimiento' : 'Abrir mapa de conocimiento'");
  });

  it('announces loaded graph via sr-only aria-live region', () => {
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('aria-atomic="true"');
    expect(source).toContain('sr-only');
  });

  it('announces node count in sr-only text', () => {
    expect(source).toContain('Mapa cargado con {displayGraph.nodes.length} conceptos');
  });

  it('marks spinner as aria-hidden', () => {
    expect(source).toMatch(/animate-spin[\s\S]*?aria-hidden="true"/);
  });

  it('uses min-h-[44px] for touch target compliance', () => {
    expect(source).toContain('min-h-[44px]');
  });
});

// ── i18n strings (Spanish) ──────────────────────────────────

describe('MicroGraphPanel: i18n strings', () => {
  const strings = [
    'Mapa de conocimiento',
    'Mapa',
    'Mapa no disponible',
    'Grafo no disponible',
    'No hay datos de mapa para este tema',
    'Cerrar mapa de conocimiento',
    'Abrir mapa de conocimiento',
    'Mapa no disponible. Toca para reintentar.',
  ];

  for (const str of strings) {
    it(`contains Spanish string: "${str}"`, () => {
      expect(source).toContain(str);
    });
  }
});

// ── Empty state when expanded ───────────────────────────────

describe('MicroGraphPanel: empty state when expanded', () => {
  it('shows empty message when no data available', () => {
    expect(source).toContain('No hay datos de mapa para este tema');
  });

  it('sets minHeight on empty state container', () => {
    expect(source).toContain('minHeight: height');
  });
});

// ── Animation ───────────────────────────────────────────────

describe('MicroGraphPanel: animation', () => {
  it('uses AnimatePresence with initial={false}', () => {
    expect(source).toContain('<AnimatePresence initial={false}>');
  });

  it('rotates chevron 180 degrees when expanded', () => {
    expect(source).toContain('rotate: expanded ? 180 : 0');
  });

  it('animates panel height from 0 to auto', () => {
    expect(source).toContain("initial={{ height: 0, opacity: 0 }}");
    expect(source).toContain("animate={{ height: 'auto', opacity: 1 }}");
  });

  it('uses easeInOut transition at 0.25s', () => {
    expect(source).toContain("duration: 0.25, ease: 'easeInOut'");
  });
});

// ── Icons ───────────────────────────────────────────────────

describe('MicroGraphPanel: icons', () => {
  it('imports Brain icon', () => {
    expect(source).toContain('Brain');
  });

  it('imports ChevronDown icon', () => {
    expect(source).toContain('ChevronDown');
  });

  it('imports RefreshCw icon', () => {
    expect(source).toContain('RefreshCw');
  });
});

// ── Dependencies ────────────────────────────────────────────

describe('MicroGraphPanel: dependencies', () => {
  it('imports from motion/react', () => {
    expect(source).toContain("from 'motion/react'");
  });

  it('imports from lucide-react', () => {
    expect(source).toContain("from 'lucide-react'");
  });

  it('imports ErrorBoundary from shared', () => {
    expect(source).toContain("from '@/app/components/shared/ErrorBoundary'");
  });

  it('imports GraphSkeleton', () => {
    expect(source).toContain("from './GraphSkeleton'");
  });

  it('imports useGraphData hook', () => {
    expect(source).toContain("from './useGraphData'");
  });

  it('imports useLocalGraph hook', () => {
    expect(source).toContain("from './useLocalGraph'");
  });

  it('imports MapNode type from mindmap types', () => {
    expect(source).toContain("from '@/app/types/mindmap'");
  });
});

// ── GraphLoadingPlaceholder sub-component ───────────────────

describe('MicroGraphPanel: GraphLoadingPlaceholder', () => {
  it('renders GraphSkeleton with variant="mini"', () => {
    expect(source).toContain('<GraphSkeleton variant="mini"');
  });

  it('passes height via inline style', () => {
    expect(source).toContain('style={{ height }}');
  });
});
