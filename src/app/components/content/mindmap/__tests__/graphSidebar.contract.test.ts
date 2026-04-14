// ============================================================
// Contract test — GraphSidebar
//
// Validates:
// - Module exports (memo-wrapped named component)
// - Props interface shape (all required and optional props)
// - Responsive breakpoint comments
// - Design system token usage
// - Icon imports from lucide-react
// - Accessibility patterns (aria attributes)
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE_PATH = resolve(__dirname, '..', 'GraphSidebar.tsx');
const source = readFileSync(SOURCE_PATH, 'utf-8');

// ── Module export ───────────────────────────────────────────

describe('GraphSidebar module contract', () => {
  it('exports a memo-wrapped named component', () => {
    expect(source).toContain('export const GraphSidebar = memo(');
  });

  it('does not use default export', () => {
    expect(source).not.toMatch(/export default/);
  });
});

// ── Props interface ─────────────────────────────────────────

describe('GraphSidebarProps', () => {
  it('defines the interface', () => {
    expect(source).toContain('interface GraphSidebarProps');
  });

  // Navigation props
  it('requires onBack callback', () => {
    expect(source).toContain('onBack: () => void');
  });

  it('requires topicName', () => {
    expect(source).toContain('topicName: string');
  });

  // Search props
  it('requires searchQuery', () => {
    expect(source).toContain('searchQuery: string');
  });

  it('requires onSearchChange', () => {
    expect(source).toContain('onSearchChange:');
  });

  it('requires nodeCount', () => {
    expect(source).toContain('nodeCount: number');
  });

  // Layout props
  it('defines LayoutType as force | radial | dagre', () => {
    expect(source).toContain("type LayoutType = 'force' | 'radial' | 'dagre'");
  });

  it('requires layout prop', () => {
    expect(source).toContain('layout: LayoutType');
  });

  it('requires onLayoutChange', () => {
    expect(source).toContain('onLayoutChange:');
  });

  // Zoom props
  it('requires zoom callbacks', () => {
    expect(source).toContain('onZoomIn: () => void');
    expect(source).toContain('onZoomOut: () => void');
    expect(source).toContain('onFitView: () => void');
  });

  // Optional props
  it('has optional masteryPct', () => {
    expect(source).toContain('masteryPct?:');
  });

  it('has optional zoomLevel', () => {
    expect(source).toContain('zoomLevel?:');
  });

  it('has optional matchCount', () => {
    expect(source).toContain('matchCount?:');
  });

  it('has optional topicOptions', () => {
    expect(source).toContain('topicOptions?:');
  });
});

// ── Responsive design ───────────────────────────────────────

describe('responsive breakpoints', () => {
  it('documents mobile breakpoint (<640px)', () => {
    expect(source).toContain('<640px');
  });

  it('documents tablet breakpoint (640–1024)', () => {
    expect(source).toMatch(/640.*1024/);
  });

  it('documents desktop breakpoint (1024+)', () => {
    expect(source).toContain('1024+');
  });
});

// ── Design system compliance ────────────────────────────────

describe('design system usage', () => {
  it('imports headingStyle from design-system', () => {
    expect(source).toContain("import { headingStyle } from '@/app/design-system'");
  });

  it('imports MASTERY_HEX from types/mindmap', () => {
    expect(source).toContain('MASTERY_HEX');
  });

  it('imports getMasteryLabel from mastery-helpers', () => {
    expect(source).toContain('getMasteryLabel');
  });

  it('uses mapViewI18n for text strings', () => {
    expect(source).toContain('I18N_MAP_VIEW');
  });
});

// ── Icon imports ────────────────────────────────────────────

describe('icon imports', () => {
  it('imports from lucide-react exclusively', () => {
    const iconImports = source.match(/from 'lucide-react'/g);
    expect(iconImports).not.toBeNull();
    expect(iconImports!.length).toBe(1);
  });

  const requiredIcons = [
    'Search', 'ZoomIn', 'ZoomOut', 'Plus', 'Sparkles',
    'Undo2', 'Redo2', 'ChevronLeft', 'Download',
  ];
  for (const icon of requiredIcons) {
    it(`imports ${icon} icon`, () => {
      expect(source).toContain(icon);
    });
  }
});

// ── Accessibility ───────────────────────────────────────────

describe('accessibility', () => {
  it('uses button elements or role=button', () => {
    expect(source).toMatch(/<button|role="button"/);
  });

  it('uses toast for user feedback', () => {
    expect(source).toContain("from 'sonner'");
  });
});
