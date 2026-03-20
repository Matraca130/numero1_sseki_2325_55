// ============================================================
// Axon — GraphSidebar (Collapsible Vertical Control Panel)
//
// Replaces the two horizontal bars (compact header + GraphToolbar)
// with a single vertical sidebar that floats over the graph canvas.
// Maximizes graph visibility by eliminating top chrome.
//
// - Collapsed: ~44px wide, icon-only buttons
// - Expanded: ~200px wide, icons + labels
// - Responsive: adapts to screen size
// - All controls grouped by function
//
// LANG: Spanish
// ============================================================

import { useState, useRef, useEffect, memo } from 'react';
import {
  Search, X, ZoomIn, ZoomOut, Maximize2, Minimize2, Expand,
  GitBranch, Circle as CircleIcon, LayoutGrid,
  Download, Info, Plus, Sparkles, Globe, BookOpen, Map as MapIcon,
  Undo2, Redo2, PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import { MASTERY_HEX, CONNECTION_TYPES } from '@/app/types/mindmap';
import type { MasteryColor } from '@/app/lib/mastery-helpers';
import { getMasteryLabel } from '@/app/lib/mastery-helpers';
import { toast } from 'sonner';

// ── Types ───────────────────────────────────────────────────

type LayoutType = 'force' | 'radial' | 'dagre';

interface GraphSidebarProps {
  /** Sidebar collapsed (icon-only) */
  collapsed: boolean;
  onToggleCollapse: () => void;

  // ── Search ──
  searchQuery: string;
  onSearchChange: (query: string) => void;
  matchCount?: number;
  nodeCount: number;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;

  // ── Layout ──
  layout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;

  // ── Zoom ──
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  zoomLevel?: number;

  // ── Collapse/Expand ──
  onCollapseAll?: () => void;
  onExpandAll?: () => void;
  collapsedCount?: number;

  // ── Undo/Redo ──
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  undoBusy: boolean;

  // ── Scope ──
  scope: 'topic' | 'course';
  onScopeChange: (s: 'topic' | 'course') => void;
  hasCourseTopics: boolean;

  // ── Add concept ──
  onAddConcept?: () => void;
  canAdd: boolean;

  // ── AI Tutor ──
  showAiPanel: boolean;
  onToggleAi: () => void;

  // ── Export ──
  onExportPNG?: () => Promise<void>;
  onExportJPEG?: () => Promise<void>;

  // ── View options ──
  showMinimap?: boolean;
  onMinimapToggle?: () => void;

  // ── Mastery filter ──
  masteryFilter?: MasteryColor | null;
  onMasteryFilterChange?: (filter: MasteryColor | null) => void;

  // ── More actions (rendered as children) ──
  moreActionsSlot?: React.ReactNode;

  // ── Edge stats ──
  edgeCount: number;

  // ── Disabled states for undo/redo ──
  deletingNode: boolean;
  reconnecting: boolean;
}

// ── Constants ───────────────────────────────────────────────

const fontSize = {
  xs: 'clamp(0.6875rem, 0.65rem + 0.15vw, 0.75rem)',
  overline: 'clamp(0.5625rem, 0.55rem + 0.1vw, 0.625rem)',
} as const;

const LAYOUT_OPTIONS: { value: LayoutType; icon: React.ElementType; label: string }[] = [
  { value: 'force', icon: GitBranch, label: 'Fuerza' },
  { value: 'radial', icon: CircleIcon, label: 'Radial' },
  { value: 'dagre', icon: LayoutGrid, label: 'Arbol' },
];

const MASTERY_COLORS: MasteryColor[] = ['green', 'yellow', 'red', 'gray'];

// ── Shared button style ────────────────────────────────────

function SidebarBtn({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
  collapsed,
  badge,
  ariaLabel,
  title,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  collapsed: boolean;
  badge?: string;
  ariaLabel?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 w-full rounded-xl transition-all duration-150 font-sans ${
        collapsed ? 'justify-center p-2' : 'px-3 py-2'
      } ${
        active
          ? 'bg-[#e8f5f1] text-[#2a8c7a]'
          : disabled
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-500 hover:text-[#2a8c7a] hover:bg-gray-50'
      }`}
      style={{ fontSize: fontSize.xs, minHeight: '36px' }}
      aria-label={ariaLabel || label}
      title={title || label}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span className="truncate flex-1 text-left">{label}</span>}
      {!collapsed && badge && (
        <span
          className="px-1.5 py-0.5 rounded-full font-medium bg-[#e8f5f1] text-[#2a8c7a]"
          style={{ fontSize: fontSize.overline }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function SidebarSep() {
  return <div className="mx-2 my-1 border-t border-gray-100" aria-hidden="true" />;
}

// ── Component ───────────────────────────────────────────────

export const GraphSidebar = memo(function GraphSidebar(props: GraphSidebarProps) {
  const {
    collapsed, onToggleCollapse,
    searchQuery, onSearchChange, matchCount, nodeCount, searchInputRef,
    layout, onLayoutChange,
    onZoomIn, onZoomOut, onFitView, zoomLevel,
    onCollapseAll, onExpandAll, collapsedCount = 0,
    canUndo, canRedo, onUndo, onRedo, undoBusy, deletingNode, reconnecting,
    scope, onScopeChange, hasCourseTopics,
    onAddConcept, canAdd,
    showAiPanel, onToggleAi,
    onExportPNG, onExportJPEG,
    masteryFilter, onMasteryFilterChange,
    moreActionsSlot,
    edgeCount,
  } = props;

  const [showSearch, setShowSearch] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [exporting, setExporting] = useState(false);

  const layoutMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const exportingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Close popups on outside click
  useEffect(() => {
    if (!showLayoutMenu && !showExportMenu && !showLegend && !showSearch) return;
    const handleClick = (e: MouseEvent) => {
      if (showLayoutMenu && layoutMenuRef.current && !layoutMenuRef.current.contains(e.target as Node)) setShowLayoutMenu(false);
      if (showExportMenu && exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setShowExportMenu(false);
      if (showLegend && legendRef.current && !legendRef.current.contains(e.target as Node)) setShowLegend(false);
      if (showSearch && searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        if (!searchQuery) setShowSearch(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowLayoutMenu(false);
        setShowExportMenu(false);
        setShowLegend(false);
        if (!searchQuery) setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showLayoutMenu, showExportMenu, showLegend, showSearch, searchQuery]);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef?.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch, searchInputRef]);

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

  const hasExport = !!(onExportPNG || onExportJPEG);
  const undoDisabled = !canUndo || undoBusy || deletingNode || reconnecting;
  const redoDisabled = !canRedo || undoBusy || deletingNode || reconnecting;

  const ActiveLayoutIcon = LAYOUT_OPTIONS.find(l => l.value === layout)?.icon || GitBranch;

  // Popup menu positioned to the left of the sidebar
  const popupClass = 'absolute right-full mr-2 top-0 z-30 bg-white rounded-2xl shadow-lg border border-gray-200 py-1.5 w-48 max-w-[calc(100vw-6rem)]';

  return (
    <div
      className={`flex flex-col bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/80 transition-all duration-200 max-h-[calc(100dvh-6rem)] ${
        collapsed ? 'w-[44px]' : 'w-[180px]'
      }`}
      role="toolbar"
      aria-label="Controles del mapa"
      aria-orientation="vertical"
    >
      {/* ── Search ── */}
      <div className="relative" ref={searchBoxRef}>
        {showSearch ? (
          <div className={`flex items-center gap-1 ${collapsed ? 'p-1' : 'px-2 py-1.5'}`}>
            <Search className="w-3.5 h-3.5 text-[#2a8c7a] flex-shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 min-w-0 bg-transparent text-gray-700 placeholder-gray-400 outline-none font-sans"
              style={{ fontSize: fontSize.xs, caretColor: '#2a8c7a' }}
              aria-label="Buscar concepto"
            />
            {searchQuery && matchCount !== undefined && (
              <span
                className="px-1 py-0.5 rounded-full bg-[#e8f5f1] text-[#2a8c7a] font-medium flex-shrink-0"
                style={{ fontSize: fontSize.overline }}
              >
                {matchCount}
              </span>
            )}
            <button
              onClick={() => { onSearchChange(''); setShowSearch(false); }}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-400 flex-shrink-0"
              aria-label="Cerrar busqueda"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <SidebarBtn
            icon={Search}
            label="Buscar"
            onClick={() => setShowSearch(true)}
            collapsed={collapsed}
            active={!!searchQuery}
            badge={searchQuery && matchCount !== undefined ? String(matchCount) : undefined}
          />
        )}
      </div>

      <SidebarSep />

      {/* ── Layout switcher ── */}
      <div className="relative" ref={layoutMenuRef}>
        <SidebarBtn
          icon={ActiveLayoutIcon}
          label={LAYOUT_OPTIONS.find(l => l.value === layout)?.label || 'Layout'}
          onClick={() => setShowLayoutMenu(v => !v)}
          collapsed={collapsed}
          active={showLayoutMenu}
        />
        {showLayoutMenu && (
          <div className={popupClass} role="menu" aria-label="Tipo de layout">
            {LAYOUT_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  role="menuitem"
                  onClick={() => { onLayoutChange(opt.value); setShowLayoutMenu(false); }}
                  className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 transition-all duration-150 text-left font-sans ${
                    layout === opt.value
                      ? 'bg-[#e8f5f1] text-[#2a8c7a]'
                      : 'text-gray-700 hover:bg-[#e8f5f1] hover:text-[#2a8c7a]'
                  }`}
                  style={{ fontSize: fontSize.xs }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{opt.label}</span>
                  {layout === opt.value && <span className="w-2 h-2 rounded-full bg-[#2a8c7a] ml-auto flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Scope toggle ── */}
      {hasCourseTopics && (
        <SidebarBtn
          icon={scope === 'topic' ? BookOpen : Globe}
          label={scope === 'topic' ? 'Tema' : 'Todos'}
          onClick={() => onScopeChange(scope === 'topic' ? 'course' : 'topic')}
          collapsed={collapsed}
          title={scope === 'topic' ? 'Ver todos los temas' : 'Ver solo el tema actual'}
        />
      )}

      <SidebarSep />

      {/* ── Zoom controls ── */}
      <div className={`flex ${collapsed ? 'flex-col' : 'flex-col'} gap-0.5`}>
        <SidebarBtn icon={ZoomOut} label="Alejar" onClick={onZoomOut} collapsed={collapsed} title="Alejar (-)" />
        {typeof zoomLevel === 'number' && (
          <button
            onClick={onFitView}
            className={`flex items-center justify-center rounded-xl text-gray-500 hover:text-[#2a8c7a] hover:bg-gray-50 transition-all duration-150 font-sans tabular-nums ${
              collapsed ? 'p-2' : 'px-3 py-1.5'
            }`}
            style={{ fontSize: fontSize.overline, minHeight: '28px' }}
            title="Ajustar a la vista (0)"
            aria-label={`Zoom: ${Math.round(zoomLevel * 100)}%`}
          >
            {Math.round(zoomLevel * 100)}%
          </button>
        )}
        <SidebarBtn icon={ZoomIn} label="Acercar" onClick={onZoomIn} collapsed={collapsed} title="Acercar (+)" />
        <SidebarBtn icon={Maximize2} label="Ajustar" onClick={onFitView} collapsed={collapsed} title="Ajustar a la vista (0)" />
      </div>

      {/* ── Collapse/Expand ── */}
      {(onCollapseAll || onExpandAll) && (
        <>
          <SidebarSep />
          <SidebarBtn
            icon={Minimize2}
            label="Colapsar"
            onClick={onCollapseAll ?? undefined}
            collapsed={collapsed}
          />
          <SidebarBtn
            icon={Expand}
            label={collapsedCount > 0 ? `Expandir (${collapsedCount})` : 'Expandir'}
            onClick={onExpandAll}
            collapsed={collapsed}
            active={collapsedCount > 0}
          />
        </>
      )}

      <SidebarSep />

      {/* ── Undo / Redo ── */}
      <div className={`flex ${collapsed ? 'flex-col' : 'flex-row'} gap-0.5 ${collapsed ? '' : 'px-1'}`}>
        <SidebarBtn
          icon={Undo2}
          label="Deshacer"
          onClick={onUndo}
          disabled={undoDisabled}
          collapsed={collapsed}
          title="Deshacer (Ctrl+Z)"
        />
        <SidebarBtn
          icon={Redo2}
          label="Rehacer"
          onClick={onRedo}
          disabled={redoDisabled}
          collapsed={collapsed}
          title="Rehacer (Ctrl+Y)"
        />
      </div>

      {/* ── Add concept ── */}
      {canAdd && (
        <SidebarBtn
          icon={Plus}
          label="Anadir"
          onClick={onAddConcept}
          collapsed={collapsed}
        />
      )}

      {/* ── AI Tutor ── */}
      <SidebarBtn
        icon={Sparkles}
        label="IA Tutor"
        onClick={onToggleAi}
        active={showAiPanel}
        collapsed={collapsed}
      />

      <SidebarSep />

      {/* ── Export ── */}
      {hasExport && (
        <div className="relative" ref={exportMenuRef}>
          <SidebarBtn
            icon={Download}
            label={exporting ? 'Exportando...' : 'Exportar'}
            onClick={() => setShowExportMenu(v => !v)}
            collapsed={collapsed}
            active={showExportMenu}
            disabled={exporting}
          />
          {showExportMenu && (
            <div className={popupClass} role="menu" aria-label="Opciones de exportacion">
              {onExportPNG && (
                <button
                  role="menuitem"
                  onClick={() => handleExport(onExportPNG)}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-gray-700 hover:bg-[#e8f5f1] hover:text-[#2a8c7a] transition-all duration-150 text-left font-sans"
                  style={{ fontSize: fontSize.xs }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar como PNG</span>
                </button>
              )}
              {onExportJPEG && (
                <button
                  role="menuitem"
                  onClick={() => handleExport(onExportJPEG)}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-gray-700 hover:bg-[#e8f5f1] hover:text-[#2a8c7a] transition-all duration-150 text-left font-sans"
                  style={{ fontSize: fontSize.xs }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar como JPEG</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Minimap toggle ── */}
      {props.onMinimapToggle && (
        <SidebarBtn
          icon={MapIcon}
          label="Minimapa"
          onClick={props.onMinimapToggle}
          active={!!props.showMinimap}
          collapsed={collapsed}
        />
      )}

      {/* ── Mastery filter ── */}
      <div className={`flex ${collapsed ? 'flex-col items-center gap-1 py-1' : 'flex-row items-center gap-1.5 px-3 py-1.5'}`}>
        {MASTERY_COLORS.map(color => {
          const isActive = masteryFilter === color;
          return (
            <button
              key={color}
              onClick={() => onMasteryFilterChange?.(isActive ? null : color)}
              className={`flex-shrink-0 rounded-full transition-all duration-150 ${
                isActive
                  ? 'ring-2 ring-offset-1'
                  : masteryFilter && !isActive
                    ? 'opacity-40 hover:opacity-70'
                    : 'hover:scale-125'
              }`}
              style={{
                width: 10, height: 10,
                backgroundColor: MASTERY_HEX[color],
                ...(isActive ? { boxShadow: `0 0 0 2px ${MASTERY_HEX[color]}` } : {}),
              }}
              title={`Filtrar: ${getMasteryLabel(color, 'es')}`}
              aria-pressed={isActive}
              aria-label={`Filtrar por ${getMasteryLabel(color, 'es')}`}
            />
          );
        })}
      </div>

      {/* ── More Actions (rendered via slot) ── */}
      {moreActionsSlot}

      {/* ── Edge legend ── */}
      <div className="relative" ref={legendRef}>
        <SidebarBtn
          icon={Info}
          label="Leyenda"
          onClick={() => setShowLegend(v => !v)}
          active={showLegend}
          collapsed={collapsed}
        />
        {showLegend && (
          <div
            className="absolute right-full mr-2 bottom-0 z-30 bg-white rounded-2xl shadow-lg border border-gray-200 p-4 w-56 max-w-[calc(100vw-6rem)]"
            role="dialog"
            aria-label="Leyenda de tipos de conexion"
          >
            <p
              className="font-semibold text-gray-500 uppercase tracking-wider mb-2.5 font-sans"
              style={{ fontSize: fontSize.overline }}
            >
              Tipos de conexion
            </p>
            <div className="space-y-2">
              {CONNECTION_TYPES.map(ct => (
                <div key={ct.key} className="flex items-center gap-2.5">
                  <span className="w-5 h-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: ct.color }} />
                  <span className="text-gray-600 font-sans" style={{ fontSize: fontSize.xs }}>{ct.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <SidebarSep />

      {/* ── Collapse toggle ── */}
      <SidebarBtn
        icon={collapsed ? PanelRightClose : PanelRightOpen}
        label={collapsed ? 'Expandir panel' : 'Colapsar panel'}
        onClick={onToggleCollapse}
        collapsed={collapsed}
      />

      {/* ── SR-only stats ── */}
      <span className="sr-only">{nodeCount} nodos, {edgeCount} conexiones</span>
    </div>
  );
});
