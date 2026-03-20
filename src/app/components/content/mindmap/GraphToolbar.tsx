// ============================================================
// Axon — Graph Toolbar
//
// Controls for the knowledge graph: layout switch, zoom, fit,
// legend, export, and filter toggles.
// XMind-inspired: floating toolbar with clean icons.
// ============================================================

import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, LayoutGrid, Circle as CircleIcon, GitBranch, Search, X, Minimize2, Expand, Info, Download, Map as MapIcon, Grid3x3, Shuffle } from 'lucide-react';
import { MASTERY_HEX, CONNECTION_TYPES } from '@/app/types/mindmap';
import type { MasteryColor } from '@/app/lib/mastery-helpers';
import { getMasteryLabel } from '@/app/lib/mastery-helpers';
import { colors } from '@/app/design-system';
import { toast } from 'sonner';

// ── Types ───────────────────────────────────────────────────

type LayoutType = 'force' | 'radial' | 'dagre';
type Locale = 'pt' | 'es';

const I18N: Record<Locale, {
  force: string; radial: string; tree: string;
  zoomIn: string; zoomOut: string; fitView: string;
  collapse: string; expand: string; expandN: (n: number) => string;
  search: string; clear: string; nodes: string; connections: string;
  toolbar: string; layoutGroup: string; zoomGroup: string; collapseGroup: string;
  edgeLegendTitle: string; edgeLegendToggle: string; masteryGroup: string;
  matchOf: (match: number, total: number) => string;
  exportLabel: string; exportPNG: string; exportJPEG: string; exporting: string;
  minimap: string; minimapToggle: string;
  grid: string; gridToggle: string;
  autoLayout: string; autoLayoutLabel: string;
}> = {
  pt: {
    force: 'Força', radial: 'Radial', tree: 'Árvore',
    zoomIn: 'Aumentar zoom', zoomOut: 'Diminuir zoom', fitView: 'Ajustar à vista',
    collapse: 'Recolher', expand: 'Expandir', expandN: (n) => `Expandir (${n})`,
    search: 'Buscar conceito...', clear: 'Limpar busca', nodes: 'nós', connections: 'conexões',
    toolbar: 'Controles do grafo', layoutGroup: 'Tipo de layout', zoomGroup: 'Controles de zoom',
    collapseGroup: 'Controles de expansão', edgeLegendTitle: 'Tipos de conexão',
    edgeLegendToggle: 'Mostrar legenda de tipos de conexão', masteryGroup: 'Legenda de domínio',
    matchOf: (match, total) => `${match} de ${total}`,
    exportLabel: 'Exportar', exportPNG: 'Exportar como PNG', exportJPEG: 'Exportar como JPEG', exporting: 'Exportando...',
    minimap: 'Mapa', minimapToggle: 'Mostrar/ocultar minimapa',
    grid: 'Quadrícula', gridToggle: 'Mostrar/ocultar quadrícula',
    autoLayout: 'Organizar', autoLayoutLabel: 'Reorganizar grafo automaticamente',
  },
  es: {
    force: 'Fuerza', radial: 'Radial', tree: 'Árbol',
    zoomIn: 'Acercar', zoomOut: 'Alejar', fitView: 'Ajustar a la vista',
    collapse: 'Colapsar', expand: 'Expandir', expandN: (n) => `Expandir (${n})`,
    search: 'Buscar concepto...', clear: 'Limpiar búsqueda', nodes: 'nodos', connections: 'conexiones',
    toolbar: 'Controles del grafo', layoutGroup: 'Tipo de layout', zoomGroup: 'Controles de zoom',
    collapseGroup: 'Controles de expansión', edgeLegendTitle: 'Tipos de conexión',
    edgeLegendToggle: 'Mostrar leyenda de tipos de conexión', masteryGroup: 'Leyenda de dominio',
    matchOf: (match, total) => `${match} de ${total}`,
    exportLabel: 'Exportar', exportPNG: 'Exportar como PNG', exportJPEG: 'Exportar como JPEG', exporting: 'Exportando...',
    minimap: 'Mapa', minimapToggle: 'Mostrar/ocultar minimapa',
    grid: 'Cuadrícula', gridToggle: 'Mostrar/ocultar cuadrícula',
    autoLayout: 'Organizar', autoLayoutLabel: 'Reorganizar grafo automáticamente',
  },
};

/** Shared font sizes — avoid Tailwind text-* classes per design rules */
const fontSize = {
  /** ~12px, responsive */
  xs: 'clamp(0.6875rem, 0.65rem + 0.15vw, 0.75rem)',
  /** ~10px for overlines */
  overline: 'clamp(0.5625rem, 0.55rem + 0.1vw, 0.625rem)',
  /** ~14px for search on mobile, ~12px on desktop */
  searchInput: 'clamp(0.75rem, 0.7rem + 0.2vw, 0.875rem)',
} as const;

interface GraphToolbarProps {
  layout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  nodeCount: number;
  edgeCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  matchCount?: number;
  onCollapseAll?: () => void;
  onExpandAll?: () => void;
  collapsedCount?: number;
  /** UI language: 'es' (default) for student, 'pt' for Portuguese */
  locale?: Locale;
  /** Ref forwarded to the search input for programmatic focus */
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  /** Export graph as PNG image */
  onExportPNG?: () => Promise<void>;
  /** Export graph as JPEG image */
  onExportJPEG?: () => Promise<void>;
  /** Whether the minimap is currently visible */
  showMinimap?: boolean;
  /** Toggle minimap visibility */
  onMinimapToggle?: () => void;
  /** Whether grid lines are currently visible */
  showGrid?: boolean;
  /** Toggle grid visibility */
  onGridToggle?: () => void;
  /** Trigger auto-layout reorganization */
  onAutoLayout?: () => void;
  /** Current zoom level (0-1 scale, e.g. 0.75 = 75%) */
  zoomLevel?: number;
  /** Active mastery filter (null = show all) */
  masteryFilter?: MasteryColor | null;
  /** Callback when mastery filter changes */
  onMasteryFilterChange?: (filter: MasteryColor | null) => void;
}

// ── Mastery Legend ───────────────────────────────────────────

const MASTERY_COLORS: MasteryColor[] = ['green', 'yellow', 'red', 'gray'];

// ── Layout options ──────────────────────────────────────────

const LAYOUT_ICONS: Record<LayoutType, React.ElementType> = {
  force: GitBranch,
  radial: CircleIcon,
  dagre: LayoutGrid,
};

// ── Separator component ─────────────────────────────────────

function ToolSeparator() {
  return (
    <div
      className="hidden sm:block w-px self-stretch my-1.5 flex-shrink-0"
      style={{ backgroundColor: colors.border.card }}
      aria-hidden="true"
    />
  );
}

// ── Component ───────────────────────────────────────────────

export const GraphToolbar = memo(function GraphToolbar({
  layout,
  onLayoutChange,
  onZoomIn,
  onZoomOut,
  onFitView,
  nodeCount,
  edgeCount,
  searchQuery,
  onSearchChange,
  matchCount,
  onCollapseAll,
  onExpandAll,
  collapsedCount = 0,
  locale = 'es',
  searchInputRef,
  onExportPNG,
  onExportJPEG,
  showMinimap,
  onMinimapToggle,
  showGrid,
  onGridToggle,
  onAutoLayout,
  zoomLevel,
  masteryFilter,
  onMasteryFilterChange,
}: GraphToolbarProps) {
  const t = I18N[locale];
  const [showEdgeLegend, setShowEdgeLegend] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const edgeLegendRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const LAYOUT_LABELS = useMemo<Record<LayoutType, string>>(() => ({
    force: t.force, radial: t.radial, dagre: t.tree,
  }), [t]);

  const hasExport = !!(onExportPNG || onExportJPEG);

  // Close popups on outside click or Escape
  useEffect(() => {
    if (!showEdgeLegend && !showExportMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (showEdgeLegend && edgeLegendRef.current && !edgeLegendRef.current.contains(e.target as Node)) {
        setShowEdgeLegend(false);
      }
      if (showExportMenu && exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowEdgeLegend(false);
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showEdgeLegend, showExportMenu]);

  // Handle export action
  const exportingRef = useRef(false);
  const handleExport = async (exportFn: (() => Promise<void>) | undefined) => {
    if (!exportFn || exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    setShowExportMenu(false);
    try {
      await exportFn();
    } catch {
      toast.error('No se pudo exportar el mapa');
    } finally {
      exportingRef.current = false;
      if (mountedRef.current) setExporting(false);
    }
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-white rounded-2xl shadow-sm border border-gray-200/80 px-2 py-1.5 sm:px-3 sm:py-2"
      role="toolbar"
      aria-label={t.toolbar}
    >
      {/* Layout switcher */}
      <div className="flex items-center bg-gray-50/80 rounded-full p-0.5" role="radiogroup" aria-label={t.layoutGroup}>
        {(['force', 'radial', 'dagre'] as const).map((value) => {
          const Icon = LAYOUT_ICONS[value];
          const label = LAYOUT_LABELS[value];
          return (
            <button
              key={value}
              onClick={() => onLayoutChange(value)}
              className={`flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-0 sm:py-1.5 rounded-full font-medium font-sans transition-all duration-150 ${
                layout === value
                  ? 'bg-white text-ax-primary-500 shadow-sm'
                  : 'text-gray-500 hover:text-ax-primary-700 hover:bg-white/60'
              }`}
              style={{ fontSize: fontSize.xs }}
              title={label}
              role="radio"
              aria-checked={layout === value}
              aria-label={`Layout ${label}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      <ToolSeparator />

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5" role="group" aria-label={t.zoomGroup}>
        <button
          onClick={onZoomOut}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] rounded-full text-gray-500 hover:text-ax-primary-700 hover:bg-gray-50 transition-all duration-150"
          title={`${t.zoomOut} (-)`}
          aria-label={t.zoomOut}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        {typeof zoomLevel === 'number' && (
          <button
            onClick={onFitView}
            className="hidden sm:flex items-center justify-center min-w-[36px] px-1 py-0.5 rounded-full text-gray-400 hover:text-ax-primary-700 hover:bg-gray-50 transition-all duration-150 font-sans tabular-nums"
            style={{ fontSize: fontSize.overline }}
            title={`${t.fitView} (0)`}
            aria-label={`Zoom: ${Math.round(zoomLevel * 100)}%`}
          >
            {Math.round(zoomLevel * 100)}%
          </button>
        )}
        <button
          onClick={onFitView}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] rounded-full text-gray-500 hover:text-ax-primary-700 hover:bg-gray-50 transition-all duration-150"
          title={`${t.fitView} (0)`}
          aria-label={t.fitView}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={onZoomIn}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] rounded-full text-gray-500 hover:text-ax-primary-700 hover:bg-gray-50 transition-all duration-150"
          title={`${t.zoomIn} (+)`}
          aria-label={t.zoomIn}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      <ToolSeparator />

      {/* Collapse/expand controls */}
      {(onCollapseAll || onExpandAll) && (
        <>
          <div className="flex items-center gap-0.5" role="group" aria-label={t.collapseGroup}>
            <button
              onClick={onCollapseAll ?? undefined}
              className="flex items-center gap-1 px-3 min-h-[44px] sm:min-h-0 sm:py-1.5 rounded-full font-medium font-sans text-gray-500 hover:text-ax-primary-700 hover:bg-gray-50 transition-all duration-150"
              style={{ fontSize: fontSize.xs }}
              title={t.collapse}
              aria-label={t.collapse}
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.collapse}</span>
            </button>
            <button
              onClick={onExpandAll}
              className={`flex items-center gap-1 px-3 min-h-[44px] sm:min-h-0 sm:py-1.5 rounded-full font-medium font-sans transition-all duration-150 ${
                collapsedCount > 0
                  ? 'text-ax-primary-500 bg-ax-primary-50 hover:bg-ax-primary-100'
                  : 'text-gray-500 hover:text-ax-primary-700 hover:bg-gray-50'
              }`}
              style={{ fontSize: fontSize.xs }}
              title={t.expand}
              aria-label={collapsedCount > 0 ? t.expandN(collapsedCount) : t.expand}
            >
              <Expand className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {collapsedCount > 0 ? t.expandN(collapsedCount) : t.expand}
              </span>
            </button>
          </div>
          <ToolSeparator />
        </>
      )}

      {/* Search input */}
      <div className="relative flex items-center order-first sm:order-none w-full sm:w-auto">
        <div
          className="flex items-center gap-1.5 bg-gray-50/80 rounded-full px-3 py-1.5 transition-all duration-150 w-full sm:w-auto"
          style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: searchQuery ? colors.primary[500] : 'transparent',
            boxShadow: searchQuery ? `0 0 0 2px ${colors.primary[500]}1a` : 'none',
          }}
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: searchQuery ? colors.primary[500] : colors.text.tertiary }} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.search}
            className="flex-1 min-w-0 sm:w-44 bg-transparent text-gray-700 placeholder-gray-400 outline-none font-sans"
            style={{ caretColor: colors.primary[500], fontSize: fontSize.searchInput }}
            aria-label={t.search}
          />
          {searchQuery && (
            <>
              {matchCount !== undefined && (
                <span
                  className="font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colors.primary[50], color: colors.primary[500], fontSize: fontSize.xs }}
                  aria-live="polite"
                >
                  {t.matchOf(matchCount, nodeCount)}
                </span>
              )}
              <button
                onClick={() => onSearchChange('')}
                className="flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] rounded-full hover:bg-gray-200/60 transition-all duration-150 flex-shrink-0"
                title={t.clear}
                aria-label={t.clear}
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div
        className="hidden sm:flex items-center gap-2 text-gray-400 ml-1 font-sans"
        style={{ fontSize: fontSize.xs }}
        aria-label={`${nodeCount} ${t.nodes}, ${edgeCount} ${t.connections}`}
      >
        <span>{nodeCount} {t.nodes}</span>
        <span className="text-gray-300" aria-hidden="true">·</span>
        <span>{edgeCount} {t.connections}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export dropdown */}
      {hasExport && (
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => { setShowExportMenu(v => !v); setShowEdgeLegend(false); }}
            disabled={exporting}
            className={`flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-0 sm:py-1.5 rounded-full font-medium font-sans transition-all duration-150 border ${
              showExportMenu
                ? 'bg-ax-primary-50 text-ax-primary-500 border-ax-primary-500/30'
                : exporting
                  ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-wait'
                  : 'bg-white text-ax-primary-700 border-gray-200 hover:border-ax-primary-500/30 hover:text-ax-primary-500 hover:bg-ax-primary-50/40'
            }`}
            style={{ fontSize: fontSize.xs }}
            title={t.exportLabel}
            aria-label={t.exportLabel}
            aria-expanded={showExportMenu}
            aria-haspopup="true"
          >
            <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">
              {exporting ? t.exporting : t.exportLabel}
            </span>
          </button>
          {showExportMenu && (
            <div
              className="absolute right-0 top-full mt-1.5 z-20 bg-white rounded-2xl shadow-lg border border-gray-200 py-1.5 w-48 max-w-[calc(100vw-2rem)]"
              role="menu"
              aria-label="Opciones de exportación"
              onKeyDown={(e) => {
                const items = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
                if (!items.length) return;
                const focused = Array.from(items).indexOf(document.activeElement as HTMLButtonElement);
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  items[(focused + 1) % items.length].focus();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  items[(focused - 1 + items.length) % items.length].focus();
                } else if (e.key === 'Escape') {
                  e.stopPropagation();
                  setShowExportMenu(false);
                } else if (e.key === 'Home') {
                  e.preventDefault();
                  items[0].focus();
                } else if (e.key === 'End') {
                  e.preventDefault();
                  items[items.length - 1].focus();
                }
              }}
              ref={(el) => {
                // Auto-focus first menu item on open
                if (el) {
                  const first = el.querySelector<HTMLButtonElement>('[role="menuitem"]');
                  first?.focus();
                }
              }}
            >
              {onExportPNG && (
                <button
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => handleExport(onExportPNG)}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-gray-700 hover:bg-ax-primary-50 hover:text-ax-primary-500 focus:bg-ax-primary-50 focus:text-ax-primary-500 focus:outline-none transition-all duration-150 text-left font-sans"
                  style={{ fontSize: fontSize.xs }}
                >
                  <Download className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{t.exportPNG}</span>
                </button>
              )}
              {onExportJPEG && (
                <button
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => handleExport(onExportJPEG)}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-gray-700 hover:bg-ax-primary-50 hover:text-ax-primary-500 focus:bg-ax-primary-50 focus:text-ax-primary-500 focus:outline-none transition-all duration-150 text-left font-sans"
                  style={{ fontSize: fontSize.xs }}
                >
                  <Download className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{t.exportJPEG}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mastery legend / filter — hidden on mobile (parent renders its own strip) */}
      <div className="hidden sm:flex items-center gap-1.5" role="group" aria-label={t.masteryGroup}>
        {MASTERY_COLORS.map((color) => {
          const isActive = masteryFilter === color;
          return (
            <button
              key={color}
              onClick={() => onMasteryFilterChange?.(isActive ? null : color)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full font-sans transition-all duration-150 ${
                isActive
                  ? 'ring-1 ring-offset-1 bg-gray-50'
                  : masteryFilter && !isActive
                    ? 'opacity-40 hover:opacity-70'
                    : 'hover:bg-gray-50'
              }`}
              style={{
                fontSize: fontSize.xs,
                ...(isActive ? { boxShadow: `0 0 0 2px ${MASTERY_HEX[color]}` } : {}),
              }}
              title={`Filtrar: ${getMasteryLabel(color, locale)}`}
              aria-pressed={isActive}
              aria-label={`Filtrar por ${getMasteryLabel(color, locale)}`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: MASTERY_HEX[color] }}
                aria-hidden="true"
              />
              <span
                className="sr-only md:not-sr-only text-gray-500 font-sans"
                style={{ fontSize: fontSize.xs }}
              >
                {getMasteryLabel(color, locale)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid toggle */}
      {onGridToggle && (
        <button
          onClick={onGridToggle}
          className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium font-sans transition-all duration-150 ${
            showGrid
              ? 'text-ax-primary-500 bg-ax-primary-50 hover:bg-ax-primary-100'
              : 'text-gray-400 hover:text-ax-primary-700 hover:bg-gray-50'
          }`}
          style={{ fontSize: fontSize.xs }}
          title={t.grid}
          aria-label={t.gridToggle}
          aria-pressed={!!showGrid}
        >
          <Grid3x3 className="w-3.5 h-3.5" />
          <span>{t.grid}</span>
        </button>
      )}

      {/* Auto-layout */}
      {onAutoLayout && (
        <button
          onClick={onAutoLayout}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium font-sans text-gray-400 hover:text-ax-primary-700 hover:bg-gray-50 transition-all duration-150"
          style={{ fontSize: fontSize.xs }}
          title={t.autoLayout}
          aria-label={t.autoLayoutLabel}
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>{t.autoLayout}</span>
        </button>
      )}

      {/* Minimap toggle — hidden on mobile (minimap not useful on small screens) */}
      {onMinimapToggle && (
        <button
          onClick={onMinimapToggle}
          className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium font-sans transition-all duration-150 ${
            showMinimap
              ? 'text-ax-primary-500 bg-ax-primary-50 hover:bg-ax-primary-100'
              : 'text-gray-400 hover:text-ax-primary-700 hover:bg-gray-50'
          }`}
          style={{ fontSize: fontSize.xs }}
          title={t.minimap}
          aria-label={t.minimapToggle}
          aria-pressed={!!showMinimap}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>{t.minimap}</span>
        </button>
      )}

      {/* Edge type legend toggle — available on all screen sizes */}
      <div className="relative" ref={edgeLegendRef}>
        <button
          onClick={() => { setShowEdgeLegend(v => !v); setShowExportMenu(false); }}
          className={`flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] rounded-full transition-all duration-150 ${
            showEdgeLegend ? 'text-ax-primary-500 bg-ax-primary-50' : 'text-gray-400 hover:text-ax-primary-700 hover:bg-gray-50'
          }`}
          title={t.edgeLegendTitle}
          aria-label={t.edgeLegendToggle}
          aria-expanded={showEdgeLegend}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
        {showEdgeLegend && (
          <div className="absolute right-0 sm:right-0 top-full mt-1.5 z-20 bg-white rounded-2xl shadow-lg border border-gray-200 p-4 w-56 max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-y-auto" role="dialog" aria-label="Leyenda de tipos de conexión">
            <p
              className="font-semibold text-gray-400 uppercase tracking-wider mb-2.5 font-sans"
              style={{ fontSize: fontSize.overline }}
            >
              {t.edgeLegendTitle}
            </p>
            <div className="space-y-2">
              {CONNECTION_TYPES.map(ct => (
                <div key={ct.key} className="flex items-center gap-2.5">
                  <span
                    className="w-5 h-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ct.color }}
                  />
                  <span
                    className="text-gray-600 font-sans"
                    style={{ fontSize: fontSize.xs }}
                  >
                    {locale === 'es' ? ct.label : ct.labelPt}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
