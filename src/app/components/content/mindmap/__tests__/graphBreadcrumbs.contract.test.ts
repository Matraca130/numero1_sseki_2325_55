// ============================================================
// Tests -- GraphBreadcrumbs contract tests
//
// Source-contract tests for GraphBreadcrumbs component:
//   - Module exports shape
//   - Props interface contract
//   - Rendering logic: null when empty, last crumb is text not button
//   - Accessibility: nav aria-label from i18n
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const COMPONENT_PATH = resolve(__dirname, '..', 'GraphBreadcrumbs.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// ── Module contract ─────────────────────────────────────────

describe('GraphBreadcrumbs: module contract', () => {
  it('exports GraphBreadcrumbs as a named memo-wrapped component', () => {
    expect(source).toMatch(/export\s+const\s+GraphBreadcrumbs\s*=\s*memo\s*\(\s*function\s+GraphBreadcrumbs/);
  });

  it('exports the GraphBreadcrumbsProps interface', () => {
    expect(source).toMatch(/export\s+interface\s+GraphBreadcrumbsProps/);
  });

  it('has no default export', () => {
    expect(source).not.toMatch(/export\s+default/);
  });
});

// ── Props interface ─────────────────────────────────────────

describe('GraphBreadcrumbs: props interface', () => {
  it('requires breadcrumbs array with id and label', () => {
    expect(source).toContain('breadcrumbs: Array<{ id: string; label: string }>');
  });

  it('requires onBreadcrumbClick callback accepting string or null', () => {
    expect(source).toContain('onBreadcrumbClick: (crumbId: string | null) => void');
  });

  it('requires t (i18n strings) of type GraphI18nStrings', () => {
    expect(source).toContain('t: GraphI18nStrings');
  });
});

// ── Rendering logic ─────────────────────────────────────────

describe('GraphBreadcrumbs: rendering logic', () => {
  it('returns null when breadcrumbs array is empty', () => {
    expect(source).toMatch(/if\s*\(\s*breadcrumbs\.length\s*===\s*0\s*\)\s*return\s+null/);
  });

  it('renders a root button that calls onBreadcrumbClick(null)', () => {
    expect(source).toContain('onBreadcrumbClick(null)');
  });

  it('uses t.breadcrumbRoot as root button text', () => {
    expect(source).toContain('{t.breadcrumbRoot}');
  });

  it('renders last breadcrumb as a span (not clickable)', () => {
    // Last crumb is rendered as <span> not <button>
    expect(source).toMatch(/i\s*<\s*breadcrumbs\.length\s*-\s*1/);
  });

  it('renders intermediate breadcrumbs as clickable buttons', () => {
    // Intermediate crumbs are buttons calling onBreadcrumbClick(crumb.id)
    expect(source).toContain('onBreadcrumbClick(crumb.id)');
  });

  it('renders ChevronRight separator between crumbs', () => {
    expect(source).toContain('ChevronRight');
  });
});

// ── Accessibility ───────────────────────────────────────────

describe('GraphBreadcrumbs: accessibility', () => {
  it('wraps in a nav element', () => {
    expect(source).toMatch(/<nav[\s\n]/);
  });

  it('uses t.breadcrumbNav as the nav aria-label', () => {
    expect(source).toContain('aria-label={t.breadcrumbNav}');
  });

  it('uses crumb.id as React key', () => {
    expect(source).toContain('key={crumb.id}');
  });
});

// ── Import contract ─────────────────────────────────────────

describe('GraphBreadcrumbs: dependencies', () => {
  it('imports memo from react', () => {
    expect(source).toMatch(/import\s+\{[^}]*memo[^}]*\}\s+from\s+['"]react['"]/);
  });

  it('imports ChevronRight from lucide-react', () => {
    expect(source).toMatch(/import\s+\{[^}]*ChevronRight[^}]*\}\s+from\s+['"]lucide-react['"]/);
  });

  it('imports GraphI18nStrings type from graphI18n', () => {
    expect(source).toMatch(/import\s+type\s+\{[^}]*GraphI18nStrings[^}]*\}\s+from\s+['"]\.\/graphI18n['"]/);
  });
});
