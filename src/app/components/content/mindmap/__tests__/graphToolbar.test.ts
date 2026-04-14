// ============================================================
// Tests -- GraphToolbar contract + logic tests
//
// Tests the pure logic and contract of GraphToolbar:
//   - Module export shape and props interface
//   - Layout options (force, radial, dagre) and onLayoutChange
//   - Zoom controls (onZoomIn, onZoomOut, onFitView)
//   - Search input and onSearchChange callback
//   - Export dropdown (PNG, JPEG) with double-click prevention
//   - Grid toggle, minimap toggle
//   - Mastery legend rendering with correct colors
//   - Edge legend with connection types
//   - i18n strings (es locale present, all required keys)
//   - Accessibility (role="toolbar", aria-labels, keyboard nav)
//   - exportingRef double-click prevention
//
// Pattern: source-based contract checks + replicated pure logic.
// No React rendering (no RTL).
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Source inspection ───────────────────────────────────────

const COMPONENT_PATH = resolve(__dirname, '..', 'GraphToolbar.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// ── Module contract ─────────────────────────────────────────

describe('GraphToolbar: module contract', () => {
  it('exports a named function GraphToolbar (optionally wrapped in memo)', () => {
    expect(source).toMatch(/export\s+(const\s+GraphToolbar\s*=\s*memo\s*\(\s*function\s+GraphToolbar|function\s+GraphToolbar)/);
  });

  it('has no default export (named export only)', () => {
    expect(source).not.toMatch(/export\s+default/);
  });

  it('defines LayoutType as union of force | radial | dagre', () => {
    expect(source).toContain("type LayoutType = 'force' | 'radial' | 'dagre'");
  });

  it('defines Locale type as pt | es', () => {
    expect(source).toContain("type Locale = 'pt' | 'es'");
  });
});

// ── Props interface ─────────────────────────────────────────

describe('GraphToolbar: props interface', () => {
  it('requires layout prop of type LayoutType', () => {
    expect(source).toContain('layout: LayoutType');
  });

  it('requires onLayoutChange callback', () => {
    expect(source).toContain('onLayoutChange: (layout: LayoutType) => void');
  });

  it('requires zoom callbacks', () => {
    expect(source).toContain('onZoomIn: () => void');
    expect(source).toContain('onZoomOut: () => void');
    expect(source).toContain('onFitView: () => void');
  });

  it('requires nodeCount and edgeCount', () => {
    expect(source).toContain('nodeCount: number');
    expect(source).toContain('edgeCount: number');
  });

  it('requires searchQuery and onSearchChange', () => {
    expect(source).toContain('searchQuery: string');
    expect(source).toContain('onSearchChange: (query: string) => void');
  });

  it('has optional matchCount', () => {
    expect(source).toContain('matchCount?: number');
  });

  it('has optional collapse/expand callbacks', () => {
    expect(source).toContain('onCollapseAll?: () => void');
    expect(source).toContain('onExpandAll?: () => void');
    expect(source).toContain('collapsedCount?: number');
  });

  it('has optional locale defaulting to es', () => {
    expect(source).toContain("locale?: Locale");
    // Default value in destructuring
    expect(source).toContain("locale = 'es'");
  });

  it('has optional searchInputRef', () => {
    expect(source).toContain('searchInputRef?: React.RefObject<HTMLInputElement | null>');
  });

  it('has optional export callbacks returning Promise<void>', () => {
    expect(source).toContain('onExportPNG?: () => Promise<void>');
    expect(source).toContain('onExportJPEG?: () => Promise<void>');
  });

  it('has optional minimap props', () => {
    expect(source).toContain('showMinimap?: boolean');
    expect(source).toContain('onMinimapToggle?: () => void');
  });

  it('has optional grid props', () => {
    expect(source).toContain('showGrid?: boolean');
    expect(source).toContain('onGridToggle?: () => void');
  });

  it('has optional auto-layout callback', () => {
    expect(source).toContain('onAutoLayout?: () => void');
  });
});

// ── Layout options ──────────────────────────────────────────

describe('GraphToolbar: layout options', () => {
  it('renders all 7 layout buttons', () => {
    expect(source).toContain("(['force', 'radial', 'dagre', 'mindmap', 'concentric', 'circular', 'fruchterman'] as const).map");
  });

  it('calls onLayoutChange with the layout value on click', () => {
    expect(source).toContain('onClick={() => onLayoutChange(value)}');
  });

  it('maps layout types to icons', () => {
    expect(source).toContain("force: GitBranch");
    expect(source).toContain("radial: CircleIcon");
    expect(source).toContain("dagre: LayoutGrid");
  });

  it('maps layout types to localized labels', () => {
    expect(source).toContain('force: t.force, radial: t.radial, dagre: t.tree');
  });

  it('uses role="radiogroup" for the layout group', () => {
    expect(source).toContain('role="radiogroup"');
    expect(source).toContain('aria-label={t.layoutGroup}');
  });

  it('uses role="radio" with aria-checked on each layout button', () => {
    expect(source).toContain('role="radio"');
    expect(source).toContain('aria-checked={layout === value}');
  });

  it('shows active state styling for selected layout', () => {
    expect(source).toContain('layout === value');
    expect(source).toContain("'bg-white text-ax-primary-500 shadow-sm'");
  });
});

// ── Zoom controls ───────────────────────────────────────────

describe('GraphToolbar: zoom controls', () => {
  it('renders zoom out button calling onZoomOut', () => {
    expect(source).toContain('onClick={onZoomOut}');
  });

  it('renders fit view button calling onFitView', () => {
    expect(source).toContain('onClick={onFitView}');
  });

  it('renders zoom in button calling onZoomIn', () => {
    expect(source).toContain('onClick={onZoomIn}');
  });

  it('shows keyboard shortcut hints in titles', () => {
    expect(source).toContain('title={`${t.zoomOut} (-)`}');
    expect(source).toContain('title={`${t.fitView} (0)`}');
    expect(source).toContain('title={`${t.zoomIn} (+)`}');
  });

  it('groups zoom controls with role="group"', () => {
    expect(source).toContain('role="group" aria-label={t.zoomGroup}');
  });

  it('uses ZoomIn, ZoomOut, Maximize2 icons', () => {
    expect(source).toContain('<ZoomOut');
    expect(source).toContain('<ZoomIn');
    expect(source).toContain('<Maximize2');
  });
});

// ── Search input ────────────────────────────────────────────

describe('GraphToolbar: search input', () => {
  it('renders a text input for search', () => {
    expect(source).toContain('type="text"');
    expect(source).toContain('value={searchQuery}');
  });

  it('calls onSearchChange on input change', () => {
    expect(source).toContain('onChange={(e) => onSearchChange(e.target.value)}');
  });

  it('uses localized placeholder', () => {
    expect(source).toContain('placeholder={t.search}');
  });

  it('has aria-label for accessibility', () => {
    expect(source).toContain('aria-label={t.search}');
  });

  it('forwards searchInputRef to the input element', () => {
    expect(source).toContain('ref={searchInputRef}');
  });

  it('shows match count badge when searchQuery is active and matchCount is defined', () => {
    expect(source).toContain('{matchCount !== undefined && (');
    expect(source).toContain('{t.matchOf(matchCount, nodeCount)}');
  });

  it('match count badge uses aria-live="polite"', () => {
    expect(source).toContain('aria-live="polite"');
  });

  it('renders a clear button when searchQuery is active', () => {
    expect(source).toContain("{searchQuery && (");
    expect(source).toContain("onClick={() => onSearchChange('')}");
  });

  it('clear button has correct aria-label', () => {
    expect(source).toContain('aria-label={t.clear}');
  });

  it('applies border highlight when searchQuery is active', () => {
    expect(source).toContain("borderColor: searchQuery ? colors.primary[500] : 'transparent'");
  });
});

// ── Export dropdown ─────────────────────────────────────────

describe('GraphToolbar: export dropdown', () => {
  it('conditionally renders export when onExportPNG or onExportJPEG is provided', () => {
    expect(source).toContain('const hasExport = !!(onExportPNG || onExportJPEG)');
    expect(source).toContain('{hasExport && (');
  });

  it('toggles export menu on button click', () => {
    expect(source).toContain('setShowExportMenu(v => !v)');
  });

  it('disables export button while exporting', () => {
    expect(source).toContain('disabled={exporting}');
  });

  it('shows exporting text while export is in progress', () => {
    expect(source).toContain('{exporting ? t.exporting : t.exportLabel}');
  });

  it('adds animate-pulse to icon when exporting', () => {
    expect(source).toContain("exporting ? 'animate-pulse' : ''");
  });

  it('export button has aria-expanded and aria-haspopup', () => {
    expect(source).toContain('aria-expanded={showExportMenu}');
    expect(source).toContain('aria-haspopup="true"');
  });

  it('renders export menu with role="menu"', () => {
    expect(source).toContain('role="menu"');
  });

  it('renders PNG export option with role="menuitem"', () => {
    expect(source).toContain('role="menuitem"');
    expect(source).toContain('{t.exportPNG}');
  });

  it('renders JPEG export option', () => {
    expect(source).toContain('{t.exportJPEG}');
  });

  it('PNG option calls handleExport(onExportPNG)', () => {
    expect(source).toContain('onClick={() => handleExport(onExportPNG)}');
  });

  it('JPEG option calls handleExport(onExportJPEG)', () => {
    expect(source).toContain('onClick={() => handleExport(onExportJPEG)}');
  });

  it('conditionally renders PNG option only when onExportPNG is provided', () => {
    expect(source).toContain('{onExportPNG && (');
  });

  it('conditionally renders JPEG option only when onExportJPEG is provided', () => {
    expect(source).toContain('{onExportJPEG && (');
  });
});

// ── exportingRef double-click prevention ────────────────────

describe('GraphToolbar: exportingRef double-click prevention', () => {
  it('uses a ref (not just state) for synchronous export guard', () => {
    expect(source).toContain('const exportingRef = useRef(false)');
  });

  it('handleExport early-returns when exportingRef.current is true', () => {
    expect(source).toContain('if (!exportFn || exportingRef.current) return');
  });

  it('sets exportingRef.current = true before async work', () => {
    // Extract just the handleExport function (ends with `};` before the return)
    const start = source.indexOf('const handleExport');
    const end = source.indexOf('};', start) + 2;
    const handleExportBlock = source.slice(start, end);
    expect(handleExportBlock).toContain('exportingRef.current = true');
  });

  it('sets exporting state to true for UI feedback', () => {
    const start = source.indexOf('const handleExport');
    const end = source.indexOf('};', start) + 2;
    const handleExportBlock = source.slice(start, end);
    expect(handleExportBlock).toContain('setExporting(true)');
  });

  it('closes the export menu before starting export', () => {
    const start = source.indexOf('const handleExport');
    const end = source.indexOf('};', start) + 2;
    const handleExportBlock = source.slice(start, end);
    expect(handleExportBlock).toContain('setShowExportMenu(false)');
  });

  it('resets exportingRef in finally block', () => {
    const start = source.indexOf('const handleExport');
    const end = source.indexOf('};', start) + 2;
    const handleExportBlock = source.slice(start, end);
    expect(handleExportBlock).toContain('exportingRef.current = false');
    expect(handleExportBlock).toContain('setExporting(false)');
  });

  it('shows error toast on export failure', () => {
    expect(source).toContain("toast.error(t.exportError)");
  });

  it('catches errors without rethrowing', () => {
    const start = source.indexOf('const handleExport');
    const end = source.indexOf('};', start) + 2;
    const handleExportBlock = source.slice(start, end);
    expect(handleExportBlock).toContain('} catch {');
    expect(handleExportBlock).toContain('} finally {');
  });
});

// ── View Options dropdown (groups Grid, Minimap, Auto-layout) ─

describe('GraphToolbar: view options dropdown', () => {
  it('groups grid/minimap/auto-layout behind a view options dropdown', () => {
    expect(source).toContain('{(onGridToggle || onMinimapToggle || onAutoLayout) && (');
  });

  it('has a view options toggle button with aria-expanded', () => {
    expect(source).toContain('aria-expanded={showViewOptions}');
    expect(source).toContain('aria-label={t.viewOptionsLabel}');
  });

  it('uses SlidersHorizontal icon for the dropdown trigger', () => {
    expect(source).toContain('<SlidersHorizontal');
  });

  it('renders grid toggle inside the dropdown when onGridToggle is provided', () => {
    expect(source).toContain('{onGridToggle && (');
  });

  it('grid item uses aria-pressed for state', () => {
    expect(source).toContain('aria-checked={!!showGrid}');
  });

  it('uses Grid3x3 icon for grid toggle', () => {
    expect(source).toContain('<Grid3x3');
  });

  it('renders minimap toggle inside the dropdown when onMinimapToggle is provided', () => {
    expect(source).toContain('{onMinimapToggle && (');
  });

  it('minimap item uses aria-pressed for state', () => {
    expect(source).toContain('aria-checked={!!showMinimap}');
  });

  it('uses MapIcon icon for minimap toggle', () => {
    expect(source).toContain('<MapIcon');
  });

  it('renders auto-layout inside the dropdown when onAutoLayout is provided', () => {
    expect(source).toContain('{onAutoLayout && (');
  });

  it('uses Shuffle icon for auto-layout', () => {
    expect(source).toContain('<Shuffle');
  });

  it('view options dropdown has role="menu"', () => {
    // Already tested via export dropdown, but verify it appears in view options too
    const viewSection = source.slice(source.indexOf('viewOptionsRef'));
    expect(viewSection).toContain('role="menu"');
  });
});

// ── Mastery legend ──────────────────────────────────────────

describe('GraphToolbar: mastery legend', () => {
  it('renders all four mastery colors', () => {
    expect(source).toContain("const MASTERY_COLORS: MasteryColor[] = ['green', 'yellow', 'red', 'gray']");
  });

  it('maps over MASTERY_COLORS to render legend/filter items', () => {
    expect(source).toContain('{MASTERY_COLORS.map((color) => {');
  });

  it('renders a colored dot for each mastery level using MASTERY_HEX', () => {
    expect(source).toContain('style={{ backgroundColor: MASTERY_HEX[color] }}');
  });

  it('renders mastery labels using getMasteryLabel with locale', () => {
    expect(source).toContain('{getMasteryLabel(color, locale)}');
  });

  it('colored dot is aria-hidden (decorative)', () => {
    // The mastery dot span has aria-hidden
    const masterySection = source.slice(
      source.indexOf('{/* Mastery legend'),
      source.indexOf('{/* View Options'),
    );
    expect(masterySection).toContain('aria-hidden="true"');
  });

  it('groups mastery items with role="group" and aria-label', () => {
    expect(source).toContain('role="group" aria-label={t.masteryGroup}');
  });

  it('imports MASTERY_HEX from mindmap types', () => {
    expect(source).toContain("import { MASTERY_HEX, CONNECTION_TYPES } from '@/app/types/mindmap'");
  });

  it('imports getMasteryLabel from mastery-helpers', () => {
    expect(source).toContain("import { getMasteryLabel } from '@/app/lib/mastery-helpers'");
  });
});

// ── Mastery legend: correct color values ────────────────────

describe('GraphToolbar: mastery color correctness (via MASTERY_HEX)', () => {
  // These values come from mindmap.ts -- verify the legend uses the right import
  const EXPECTED_HEX: Record<string, string> = {
    green:  '#10b981',
    yellow: '#f59e0b',
    red:    '#ef4444',
    gray:   '#9ca3af',
  };

  it('MASTERY_HEX is imported and used for dot backgroundColor', () => {
    expect(source).toContain('MASTERY_HEX[color]');
  });

  it.each(Object.entries(EXPECTED_HEX))(
    'MASTERY_HEX[%s] should be %s (verified in types/mindmap.ts)',
    (color, hex) => {
      // We verify that the source imports from the right module
      // and the actual values are correct in mindmap.ts
      const mindmapSource = readFileSync(
        resolve(__dirname, '..', '..', '..', '..', 'types', 'mindmap.ts'),
        'utf-8',
      );
      // Each line has varying whitespace alignment, just check key and value are present
      expect(mindmapSource).toContain(`'${hex}'`);
      expect(mindmapSource).toMatch(new RegExp(`${color}:\\s+'${hex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
    },
  );
});

// ── Edge legend ─────────────────────────────────────────────

describe('GraphToolbar: edge legend', () => {
  it('renders edge legend toggle button', () => {
    expect(source).toContain('setShowEdgeLegend(v => !v)');
  });

  it('toggle button has correct aria-label', () => {
    expect(source).toContain('aria-label={t.edgeLegendToggle}');
  });

  it('toggle button has aria-expanded', () => {
    expect(source).toContain('aria-expanded={showEdgeLegend}');
  });

  it('renders legend popup with role="dialog"', () => {
    expect(source).toContain('role="dialog"');
  });

  it('renders connection types title', () => {
    expect(source).toContain('{t.edgeLegendTitle}');
  });

  it('maps over CONNECTION_TYPES for legend items', () => {
    expect(source).toContain('{CONNECTION_TYPES.map(ct => (');
  });

  it('renders colored line for each connection type', () => {
    expect(source).toContain('style={{ backgroundColor: ct.color }}');
  });

  it('renders localized label per connection type', () => {
    expect(source).toContain("locale === 'es' ? ct.label : ct.labelPt");
  });

  it('uses Info icon for the toggle', () => {
    expect(source).toContain('<Info');
  });

  it('imports CONNECTION_TYPES from mindmap types', () => {
    expect(source).toContain("CONNECTION_TYPES } from '@/app/types/mindmap'");
  });
});

// ── Edge legend: popup close behavior ───────────────────────

describe('GraphToolbar: popup close behavior', () => {
  it('closes popups on outside click', () => {
    expect(source).toContain("document.addEventListener('mousedown', handleClick)");
    expect(source).toContain("document.removeEventListener('mousedown', handleClick)");
  });

  it('closes popups on Escape key', () => {
    expect(source).toContain("if (e.key === 'Escape')");
    expect(source).toContain('setShowEdgeLegend(false)');
    expect(source).toContain('setShowExportMenu(false)');
    expect(source).toContain('setShowViewOptions(false)');
  });

  it('registers and cleans up keydown listener', () => {
    expect(source).toContain("document.addEventListener('keydown', handleKey)");
    expect(source).toContain("document.removeEventListener('keydown', handleKey)");
  });

  it('only adds listeners when a popup is open', () => {
    expect(source).toContain('if (!showEdgeLegend && !showExportMenu && !showViewOptions) return');
  });

  it('checks ref contains for outside click detection', () => {
    expect(source).toContain('edgeLegendRef.current && !edgeLegendRef.current.contains(e.target as Node)');
    expect(source).toContain('exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)');
    expect(source).toContain('viewOptionsRef.current && !viewOptionsRef.current.contains(e.target as Node)');
  });
});

// ── Collapse/expand controls ────────────────────────────────

describe('GraphToolbar: collapse/expand controls', () => {
  it('conditionally renders collapse/expand when callbacks are provided', () => {
    expect(source).toContain('{(onCollapseAll || onExpandAll) && (');
  });

  it('renders collapse button calling onCollapseAll', () => {
    expect(source).toContain('onClick={onCollapseAll ?? undefined}');
  });

  it('renders expand button calling onExpandAll', () => {
    expect(source).toContain('onClick={onExpandAll}');
  });

  it('defaults collapsedCount to 0', () => {
    expect(source).toContain('collapsedCount = 0');
  });

  it('shows expandN label when collapsedCount > 0', () => {
    expect(source).toContain('collapsedCount > 0 ? t.expandN(collapsedCount) : t.expand');
  });

  it('uses different aria-label based on collapsedCount', () => {
    expect(source).toContain('aria-label={collapsedCount > 0 ? t.expandN(collapsedCount) : t.expand}');
  });

  it('highlights expand button when nodes are collapsed', () => {
    // The expand button has conditional styling based on collapsedCount > 0
    expect(source).toMatch(/collapsedCount > 0\s+\? 'text-ax-primary-500/);
  });

  it('groups collapse/expand with role="group"', () => {
    expect(source).toContain('role="group" aria-label={t.collapseGroup}');
  });

  it('uses Minimize2 and Expand icons', () => {
    expect(source).toContain('<Minimize2');
    expect(source).toContain('<Expand');
  });
});

// ── Stats display (screen reader only) ──────────────────────

describe('GraphToolbar: stats display', () => {
  it('includes node and edge counts for screen readers', () => {
    expect(source).toContain('{nodeCount} {t.nodes}');
    expect(source).toContain('{edgeCount} {t.connections}');
  });

  it('stats are visually hidden (sr-only)', () => {
    expect(source).toContain('className="sr-only"');
  });
});

// ── i18n: Spanish locale ────────────────────────────────────

describe('GraphToolbar: i18n es locale', () => {
  // Extract the es block from source
  const esStart = source.indexOf('es: {');
  const esEnd = source.indexOf('},', esStart) + 2;
  const esBlock = source.slice(esStart, esEnd);

  it('has force label', () => {
    expect(esBlock).toContain("force: 'Fuerza'");
  });

  it('has radial label', () => {
    expect(esBlock).toContain("radial: 'Radial'");
  });

  it('has tree label', () => {
    expect(esBlock).toContain("tree: 'Árbol'");
  });

  it('has zoom labels', () => {
    expect(esBlock).toContain("zoomIn: 'Acercar'");
    expect(esBlock).toContain("zoomOut: 'Alejar'");
    expect(esBlock).toContain("fitView: 'Ajustar a la vista'");
  });

  it('has collapse/expand labels', () => {
    expect(esBlock).toContain("collapse: 'Colapsar'");
    expect(esBlock).toContain("expand: 'Expandir'");
  });

  it('has expandN function', () => {
    expect(esBlock).toContain('expandN: (n) => `Expandir (${n})`');
  });

  it('has search labels', () => {
    expect(esBlock).toContain("search: 'Buscar concepto...'");
    expect(esBlock).toContain("clear: 'Limpiar búsqueda'");
  });

  it('has stats labels', () => {
    expect(esBlock).toContain("nodes: 'nodos'");
    expect(esBlock).toContain("connections: 'conexiones'");
  });

  it('has toolbar aria-label', () => {
    expect(esBlock).toContain("toolbar: 'Controles del grafo'");
  });

  it('has layout group aria-label', () => {
    expect(esBlock).toContain("layoutGroup: 'Tipo de layout'");
  });

  it('has zoom group aria-label', () => {
    expect(esBlock).toContain("zoomGroup: 'Controles de zoom'");
  });

  it('has edge legend labels', () => {
    expect(esBlock).toContain("edgeLegendTitle: 'Tipos de conexión'");
    expect(esBlock).toContain("edgeLegendToggle: 'Mostrar leyenda de tipos de conexión'");
  });

  it('has mastery group label', () => {
    expect(esBlock).toContain("masteryGroup: 'Leyenda de dominio'");
  });

  it('has matchOf function', () => {
    expect(esBlock).toContain('matchOf: (match, total) => `${match} de ${total}`');
  });

  it('has export labels', () => {
    expect(esBlock).toContain("exportLabel: 'Exportar'");
    expect(esBlock).toContain("exportPNG: 'Exportar como PNG'");
    expect(esBlock).toContain("exportJPEG: 'Exportar como JPEG'");
    expect(esBlock).toContain("exporting: 'Exportando...'");
  });

  it('has minimap labels', () => {
    expect(esBlock).toContain("minimap: 'Mapa'");
    expect(esBlock).toContain("minimapToggle: 'Mostrar/ocultar minimapa'");
  });

  it('has grid labels', () => {
    expect(esBlock).toContain("grid: 'Cuadrícula'");
    expect(esBlock).toContain("gridToggle: 'Mostrar/ocultar cuadrícula'");
  });

  it('has auto-layout labels', () => {
    expect(esBlock).toContain("autoLayout: 'Organizar'");
    expect(esBlock).toContain("autoLayoutLabel: 'Reorganizar grafo automáticamente'");
  });
});

// ── i18n: Portuguese locale ─────────────────────────────────

describe('GraphToolbar: i18n pt locale', () => {
  const ptStart = source.indexOf('pt: {');
  const ptEnd = source.indexOf('},', ptStart) + 2;
  const ptBlock = source.slice(ptStart, ptEnd);

  it('has all required pt translations', () => {
    expect(ptBlock).toContain("force: 'Força'");
    expect(ptBlock).toContain("tree: 'Árvore'");
    expect(ptBlock).toContain("zoomIn: 'Aumentar zoom'");
    expect(ptBlock).toContain("toolbar: 'Controles do grafo'");
    expect(ptBlock).toContain("exportLabel: 'Exportar'");
  });
});

// ── i18n: I18N record covers both locales with same keys ────

describe('GraphToolbar: i18n completeness', () => {
  it('I18N record is typed with all required keys', () => {
    // The type signature should include all the keys used in the component
    const requiredKeys = [
      'force', 'radial', 'tree', 'zoomIn', 'zoomOut', 'fitView',
      'collapse', 'expand', 'expandN', 'search', 'clear', 'nodes', 'connections',
      'toolbar', 'layoutGroup', 'zoomGroup', 'collapseGroup',
      'edgeLegendTitle', 'edgeLegendToggle', 'masteryGroup',
      'matchOf', 'exportLabel', 'exportPNG', 'exportJPEG', 'exporting',
      'minimap', 'minimapToggle', 'grid', 'gridToggle',
      'autoLayout', 'autoLayoutLabel',
      'viewOptions', 'viewOptionsLabel',
    ];
    for (const key of requiredKeys) {
      expect(source).toContain(`${key}:`);
    }
  });

  it('defaults to es locale when not specified', () => {
    expect(source).toContain("locale = 'es'");
  });

  it('uses const t = I18N[locale] for translations', () => {
    expect(source).toContain('const t = I18N[locale]');
  });
});

// ── Accessibility ───────────────────────────────────────────

describe('GraphToolbar: accessibility', () => {
  it('root element has role="toolbar"', () => {
    expect(source).toContain('role="toolbar"');
  });

  it('root element has aria-label from locale', () => {
    expect(source).toContain('aria-label={t.toolbar}');
  });

  it('layout group uses role="radiogroup"', () => {
    expect(source).toContain('role="radiogroup"');
    expect(source).toContain('aria-label={t.layoutGroup}');
  });

  it('layout buttons use role="radio" with aria-checked', () => {
    expect(source).toContain('role="radio"');
    expect(source).toContain('aria-checked={layout === value}');
  });

  it('layout buttons have aria-label with layout name', () => {
    expect(source).toContain('aria-label={`Layout ${label}`}');
  });

  it('zoom buttons have aria-labels', () => {
    expect(source).toContain('aria-label={t.zoomOut}');
    expect(source).toContain('aria-label={t.fitView}');
    expect(source).toContain('aria-label={t.zoomIn}');
  });

  it('search input has aria-label', () => {
    expect(source).toContain('aria-label={t.search}');
  });

  it('mastery legend group has aria-label', () => {
    expect(source).toContain('aria-label={t.masteryGroup}');
  });

  it('grid toggle uses aria-pressed', () => {
    expect(source).toContain('aria-checked={!!showGrid}');
  });

  it('minimap toggle uses aria-pressed', () => {
    expect(source).toContain('aria-checked={!!showMinimap}');
  });

  it('export button uses aria-expanded and aria-haspopup', () => {
    expect(source).toContain('aria-expanded={showExportMenu}');
    expect(source).toContain('aria-haspopup="true"');
  });

  it('edge legend toggle uses aria-expanded', () => {
    expect(source).toContain('aria-expanded={showEdgeLegend}');
  });

  it('ToolSeparator is aria-hidden', () => {
    expect(source).toContain('aria-hidden="true"');
  });

  it('min touch target size of 44px on mobile for zoom buttons', () => {
    expect(source).toContain('min-h-[44px] min-w-[44px]');
  });
});

// ── ToolSeparator internal component ────────────────────────

describe('GraphToolbar: ToolSeparator', () => {
  it('defines a ToolSeparator function component', () => {
    expect(source).toContain('function ToolSeparator()');
  });

  it('is aria-hidden (purely decorative)', () => {
    const separatorBlock = source.slice(
      source.indexOf('function ToolSeparator()'),
      source.indexOf('// ── Component'),
    );
    expect(separatorBlock).toContain('aria-hidden="true"');
  });

  it('uses colors.border.card for backgroundColor', () => {
    expect(source).toContain('backgroundColor: colors.border.card');
  });
});

// ── Font size constants ─────────────────────────────────────

describe('GraphToolbar: font size constants', () => {
  it('defines responsive font sizes using clamp', () => {
    expect(source).toContain("xs: 'clamp(");
    expect(source).toContain("overline: 'clamp(");
    expect(source).toContain("searchInput: 'clamp(");
  });

  it('uses fontSize.xs for most UI elements', () => {
    expect(source).toContain('style={{ fontSize: fontSize.xs }}');
  });

  it('uses fontSize.searchInput for search input', () => {
    expect(source).toContain('fontSize: fontSize.searchInput');
  });

  it('uses fontSize.overline for edge legend title', () => {
    expect(source).toContain('fontSize: fontSize.overline');
  });
});

// ── Export dropdown keyboard navigation (a11y) ──────────────

describe('GraphToolbar: export dropdown keyboard navigation', () => {
  it('has onKeyDown handler on the export menu', () => {
    expect(source).toContain('onKeyDown=');
  });

  it('handles ArrowDown to focus next menuitem', () => {
    expect(source).toContain("e.key === 'ArrowDown'");
  });

  it('handles ArrowUp to focus previous menuitem', () => {
    expect(source).toContain("e.key === 'ArrowUp'");
  });

  it('handles Home key to focus first menuitem', () => {
    expect(source).toContain("e.key === 'Home'");
  });

  it('handles End key to focus last menuitem', () => {
    expect(source).toContain("e.key === 'End'");
  });

  it('handles Escape to close the export menu', () => {
    expect(source).toContain("e.key === 'Escape'");
    expect(source).toContain('setShowExportMenu(false)');
  });

  it('export menu items use tabIndex={-1} for roving tabindex', () => {
    expect(source).toContain('tabIndex={-1}');
  });

  it('export menu items have focus styles', () => {
    expect(source).toContain('focus:bg-ax-primary-50');
    expect(source).toContain('focus:text-ax-primary-500');
  });

  it('auto-focuses first menuitem via ref callback', () => {
    expect(source).toContain("first?.focus()");
  });
});

// ── memo wrapping ───────────────────────────────────────────

describe('GraphToolbar: memo optimization', () => {
  it('is wrapped in React.memo', () => {
    expect(source).toMatch(/export\s+const\s+GraphToolbar\s*=\s*memo\s*\(/);
  });
});

// ── Layout labels use useMemo ───────────────────────────────

describe('GraphToolbar: performance optimization', () => {
  it('memoizes LAYOUT_LABELS with useMemo', () => {
    expect(source).toContain('const LAYOUT_LABELS = useMemo<Record<LayoutType, string>>');
  });

  it('LAYOUT_LABELS depends on t (locale translations)', () => {
    expect(source).toContain('}), [t]);');
  });
});
