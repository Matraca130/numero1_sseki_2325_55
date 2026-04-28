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

// ── Internal sub-components ─────────────────────────────────

describe('GraphSidebar internal sub-components', () => {
  it('declares BarBtn (the unified pill-button)', () => {
    expect(source).toContain('function BarBtn');
  });

  it('BarBtn supports active state via teal token #2a8c7a', () => {
    expect(source).toContain("'bg-[#e8f5f1] text-[#2a8c7a]'");
  });

  it('BarBtn supports disabled state with no-op cursor', () => {
    expect(source).toContain('cursor-not-allowed');
  });

  it('BarBtn renders an Icon prop with w-4 h-4', () => {
    expect(source).toMatch(/<Icon className="w-4 h-4" \/>/);
  });

  it('declares Sep (vertical separator) with aria-hidden', () => {
    expect(source).toContain('function Sep');
    expect(source).toContain('aria-hidden="true"');
  });
});

// ── LAYOUT_OPTIONS contract ─────────────────────────────────

describe('LAYOUT_OPTIONS contract', () => {
  it('declares exactly 3 layout options matching LayoutType', () => {
    expect(source).toMatch(/LAYOUT_OPTIONS:[\s\S]*?\[[\s\S]*?value:\s*'force'/);
    expect(source).toMatch(/value:\s*'force'/);
    expect(source).toMatch(/value:\s*'radial'/);
    expect(source).toMatch(/value:\s*'dagre'/);
  });

  it('binds each layout to a lucide icon (GitBranch / Circle / LayoutGrid)', () => {
    // Grouping: force=GitBranch, radial=CircleIcon, dagre=LayoutGrid
    expect(source).toMatch(/icon:\s*GitBranch/);
    expect(source).toMatch(/icon:\s*CircleIcon/);
    expect(source).toMatch(/icon:\s*LayoutGrid/);
  });

  it('uses Spanish labels (Fuerza / Radial / Árbol)', () => {
    expect(source).toContain("label: 'Fuerza'");
    expect(source).toContain("label: 'Radial'");
    expect(source).toContain("label: 'Árbol'");
  });
});

// ── MASTERY_COLORS contract ─────────────────────────────────

describe('MASTERY_COLORS contract', () => {
  it('declares the 4-tier order: green / yellow / red / gray', () => {
    expect(source).toMatch(/MASTERY_COLORS:\s*MasteryColor\[\]\s*=\s*\['green',\s*'yellow',\s*'red',\s*'gray'\]/);
  });
});

// ── fontSize tokens ─────────────────────────────────────────

describe('fontSize tokens', () => {
  it('uses clamp() for fluid typography (xs token)', () => {
    expect(source).toMatch(/xs:\s*'clamp\(/);
  });

  it('uses clamp() for the overline token', () => {
    expect(source).toMatch(/overline:\s*'clamp\(/);
  });

  it('declares the fontSize map as a frozen literal', () => {
    expect(source).toMatch(/const\s+fontSize\s*=\s*\{[\s\S]*?\}\s*as\s+const/);
  });
});

// ── i18n locale fallback ────────────────────────────────────

describe('i18n locale lookup', () => {
  it('uses the safe ?? I18N_MAP_VIEW.es fallback (cycle 20 hardening)', () => {
    expect(source).toContain('I18N_MAP_VIEW[locale] ?? I18N_MAP_VIEW.es');
  });

  it('locale prop defaults to "pt"', () => {
    expect(source).toMatch(/locale\s*=\s*'pt'/);
  });
});

// ── Outside-click + Escape close behavior ───────────────────

describe('popup close behavior', () => {
  it('binds mousedown listener to document for outside-click detection', () => {
    expect(source).toContain("addEventListener('mousedown'");
  });

  it('binds keydown listener for Escape support', () => {
    expect(source).toContain("addEventListener('keydown'");
  });

  it('Escape closes layout / export / legend menus immediately', () => {
    expect(source).toMatch(/if\s*\(e\.key\s*===\s*'Escape'\)\s*\{[\s\S]*?setShowLayoutMenu\(false\)[\s\S]*?setShowExportMenu\(false\)[\s\S]*?setShowLegend\(false\)/);
  });

  it('Escape does NOT close search if there is a pending query', () => {
    expect(source).toMatch(/if\s*\(\s*!searchQuery\s*\)\s*setShowSearch\(false\)/);
  });

  it('removes BOTH listeners on cleanup (no leaks)', () => {
    expect(source).toContain("removeEventListener('mousedown'");
    expect(source).toContain("removeEventListener('keydown'");
  });
});

// ── Export double-action guard ──────────────────────────────

describe('export action', () => {
  it('uses exportingRef to short-circuit double-click during export', () => {
    expect(source).toContain('exportingRef');
    expect(source).toMatch(/if\s*\(\s*!exportFn\s*\|\|\s*exportingRef\.current\s*\)\s*return/);
  });

  it('toasts a localized error via tSidebar.exportMapError on failure', () => {
    expect(source).toContain('tSidebar.exportMapError');
  });

  it('clears the menu before starting the async export (UX feedback)', () => {
    expect(source).toMatch(/setShowExportMenu\(false\)\s*;\s*\n\s*try\s*\{\s*await\s+exportFn/);
  });
});

// ── Mount-tracking discipline ───────────────────────────────

describe('mountedRef discipline', () => {
  it('tracks mount state for async setState skip', () => {
    expect(source).toContain('mountedRef.current = true');
    expect(source).toMatch(/return\s*\(\)\s*=>\s*\{\s*mountedRef\.current\s*=\s*false/);
  });
});
