// ============================================================
// Axon — Graph Toolbar
//
// Controls for the knowledge graph: layout switch, zoom, fit,
// legend, and filter toggles.
// XMind-inspired: floating toolbar with clean icons.
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, LayoutGrid, Circle as CircleIcon, GitBranch, Search, X, Minimize2, Expand, Info } from 'lucide-react';
import { MASTERY_HEX, CONNECTION_TYPES } from '@/app/types/mindmap';
import type { MasteryColor } from '@/app/lib/mastery-helpers';
import { getMasteryLabel } from '@/app/lib/mastery-helpers';

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
}> = {
  pt: {
    force: 'Força', radial: 'Radial', tree: 'Árvore',
    zoomIn: 'Aumentar zoom', zoomOut: 'Diminuir zoom', fitView: 'Ajustar à vista',
    collapse: 'Recolher', expand: 'Expandir', expandN: (n) => `Expandir (${n})`,
    search: 'Buscar conceito...', clear: 'Limpar busca', nodes: 'nós', connections: 'conexões',
    toolbar: 'Controles do grafo', layoutGroup: 'Tipo de layout', zoomGroup: 'Controles de zoom',
    collapseGroup: 'Controles de expansão', edgeLegendTitle: 'Tipos de conexão',
    edgeLegendToggle: 'Mostrar legenda de tipos de conexão', masteryGroup: 'Legenda de domínio',
  },
  es: {
    force: 'Fuerza', radial: 'Radial', tree: 'Árbol',
    zoomIn: 'Acercar', zoomOut: 'Alejar', fitView: 'Ajustar a la vista',
    collapse: 'Colapsar', expand: 'Expandir', expandN: (n) => `Expandir (${n})`,
    search: 'Buscar concepto...', clear: 'Limpiar búsqueda', nodes: 'nodos', connections: 'conexiones',
    toolbar: 'Controles del grafo', layoutGroup: 'Tipo de layout', zoomGroup: 'Controles de zoom',
    collapseGroup: 'Controles de expansión', edgeLegendTitle: 'Tipos de conexión',
    edgeLegendToggle: 'Mostrar leyenda de tipos de conexión', masteryGroup: 'Leyenda de dominio',
  },
};

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
  /** UI language: 'pt' for student (default), 'es' for professor */
  locale?: Locale;
  /** Ref forwarded to the search input for programmatic focus */
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

// ── Mastery Legend ───────────────────────────────────────────

const LEGEND_ITEMS: { color: MasteryColor; label: string }[] = [
  { color: 'green', label: getMasteryLabel('green') },
  { color: 'yellow', label: getMasteryLabel('yellow') },
  { color: 'red', label: getMasteryLabel('red') },
  { color: 'gray', label: getMasteryLabel('gray') },
];

// ── Layout options ──────────────────────────────────────────

const LAYOUT_ICONS: Record<LayoutType, React.ElementType> = {
  force: GitBranch,
  radial: CircleIcon,
  dagre: LayoutGrid,
};

// ── Component ───────────────────────────────────────────────

export function GraphToolbar({
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
  locale = 'pt',
  searchInputRef,
}: GraphToolbarProps) {
  const t = I18N[locale];
  const [showEdgeLegend, setShowEdgeLegend] = useState(false);
  const edgeLegendRef = useRef<HTMLDivElement>(null);

  const LAYOUT_LABELS: Record<LayoutType, string> = {
    force: t.force, radial: t.radial, dagre: t.tree,
  };

  // Close edge legend on outside click
  useEffect(() => {
    if (!showEdgeLegend) return;
    const handler = (e: MouseEvent) => {
      if (edgeLegendRef.current && !edgeLegendRef.current.contains(e.target as Node)) {
        setShowEdgeLegend(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEdgeLegend]);

  return (
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label={t.toolbar}>
      {/* Layout switcher */}
      <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-200 p-0.5" role="radiogroup" aria-label={t.layoutGroup}>
        {(['force', 'radial', 'dagre'] as const).map((value) => {
          const Icon = LAYOUT_ICONS[value];
          const label = LAYOUT_LABELS[value];
          return (
            <button
              key={value}
              onClick={() => onLayoutChange(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                layout === value
                  ? 'bg-[#e8f5f1] text-[#2a8c7a]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
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

      {/* Zoom controls */}
      <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-200 p-0.5" role="group" aria-label={t.zoomGroup}>
        <button
          onClick={onZoomOut}
          className="p-1.5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          title="Zoom out (-)"
          aria-label={t.zoomOut}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={onFitView}
          className="p-1.5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          title={`${t.fitView} (0)`}
          aria-label={t.fitView}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={onZoomIn}
          className="p-1.5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          title="Zoom in (+)"
          aria-label={t.zoomIn}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Collapse/expand controls */}
      {(onCollapseAll || onExpandAll) && (
        <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-200 p-0.5" role="group" aria-label={t.collapseGroup}>
          <button
            onClick={onCollapseAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            title={t.collapse}
            aria-label={t.collapse}
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.collapse}</span>
          </button>
          <button
            onClick={onExpandAll}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              collapsedCount > 0
                ? 'text-[#2a8c7a] bg-[#e8f5f1] hover:bg-[#d0ebe6]'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            title={t.expand}
            aria-label={collapsedCount > 0 ? t.expandN(collapsedCount) : t.expand}
          >
            <Expand className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {collapsedCount > 0 ? t.expandN(collapsedCount) : t.expand}
            </span>
          </button>
        </div>
      )}

      {/* Search input */}
      <div className="relative flex items-center order-first sm:order-none w-full sm:w-auto">
        <div
          className="flex items-center gap-1.5 bg-white rounded-full shadow-sm border px-3 py-1.5 transition-colors w-full sm:w-auto"
          style={{
            borderColor: searchQuery ? '#2a8c7a' : '#e5e7eb',
          }}
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: searchQuery ? '#2a8c7a' : '#9ca3af' }} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.search}
            className="flex-1 sm:w-44 bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none font-sans"
            style={{ caretColor: '#2a8c7a' }}
            aria-label={t.search}
            role="searchbox"
          />
          {searchQuery && (
            <>
              {matchCount !== undefined && (
                <span
                  className="text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: '#e8f5f1', color: '#2a8c7a' }}
                  aria-live="polite"
                >
                  {matchCount} de {nodeCount}
                </span>
              )}
              <button
                onClick={() => onSearchChange('')}
                className="p-0.5 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                title={t.clear}
                aria-label={t.clear}
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 ml-1" aria-label={`${nodeCount} ${t.nodes}, ${edgeCount} ${t.connections}`}>
        <span>{nodeCount} {t.nodes}</span>
        <span className="text-gray-300">|</span>
        <span>{edgeCount} {t.connections}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Mastery legend — hidden on mobile */}
      <div className="hidden md:flex items-center gap-3" role="group" aria-label={t.masteryGroup}>
        {LEGEND_ITEMS.map(({ color, label }) => (
          <div key={color} className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: MASTERY_HEX[color] }}
              aria-hidden="true"
            />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}

        {/* Edge type legend toggle */}
        <div className="relative" ref={edgeLegendRef}>
          <button
            onClick={() => setShowEdgeLegend(v => !v)}
            className={`p-1 rounded-full transition-colors ${
              showEdgeLegend ? 'text-[#2a8c7a] bg-[#e8f5f1]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
            title={t.edgeLegendTitle}
            aria-label={t.edgeLegendToggle}
            aria-expanded={showEdgeLegend}
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          {showEdgeLegend && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-gray-200 p-3 w-56">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {t.edgeLegendTitle}
              </p>
              <div className="space-y-1.5">
                {CONNECTION_TYPES.map(ct => (
                  <div key={ct.key} className="flex items-center gap-2">
                    <span
                      className="w-5 h-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ct.color }}
                    />
                    <span className="text-xs text-gray-600">{locale === 'es' ? ct.label : ct.labelPt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
