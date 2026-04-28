// ============================================================
// Axon — GraphSidebar (Unified Horizontal Toolbar)
//
// Single floating bar that combines navigation (back, topic,
// mastery %) with all graph controls. Replaces both the
// breadcrumb pill and the vertical sidebar.
//
// Responsive:
//   Mobile  (<640px):  nav + search + add + undo/redo + AI + more
//   Tablet  (640–1024): + layout, scope, export, mastery dots
//   Desktop (1024+):    + zoom, collapse/expand, minimap, legend
//
// LANG: Spanish
// ============================================================

import { useState, useRef, useEffect, memo } from 'react';
import {
  Search, X, ZoomIn, ZoomOut, Maximize2, Minimize2, Expand,
  GitBranch, Circle as CircleIcon, LayoutGrid,
  Download, Info, Plus, Sparkles, Globe, BookOpen, Map as MapIcon,
  Undo2, Redo2, ChevronLeft,
} from 'lucide-react';
import { MASTERY_HEX, CONNECTION_TYPES } from '@/app/types/mindmap';
import type { MasteryColor } from '@/app/lib/mastery-helpers';
import { getMasteryLabel } from '@/app/lib/mastery-helpers';
import { toast } from 'sonner';
import { headingStyle } from '@/app/design-system';
import { I18N_MAP_VIEW } from './mapViewI18n';
import type { GraphLocale } from './graphI18n';

// ── Types ───────────────────────────────────────────────────

type LayoutType = 'force' | 'radial' | 'dagre';

interface GraphSidebarProps {
  // ── Navigation ──
  onBack: () => void;
  topicName: string;
  topicOptions?: { id: string; name: string }[];
  selectedTopicId?: string;
  onTopicChange?: (id: string) => void;
  masteryPct?: number;

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
  deletingNode: boolean;
  reconnecting: boolean;

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

  // ── More actions (rendered as slot) ──
  moreActionsSlot?: React.ReactNode;

  // ── Stats ──
  edgeCount: number;

  // ── Fullscreen ──
  isFullscreen?: boolean;
  onExitFullscreen?: () => void;

  // ── I18N ──
  locale?: GraphLocale;
}

// ── Constants ───────────────────────────────────────────────

const fontSize = {
  xs: 'clamp(0.6875rem, 0.65rem + 0.15vw, 0.75rem)',
  overline: 'clamp(0.5625rem, 0.55rem + 0.1vw, 0.625rem)',
} as const;

const LAYOUT_OPTIONS: { value: LayoutType; icon: React.ElementType; label: string }[] = [
  { value: 'force', icon: GitBranch, label: 'Fuerza' },
  { value: 'radial', icon: CircleIcon, label: 'Radial' },
  { value: 'dagre', icon: LayoutGrid, label: 'Árbol' },
];

const MASTERY_COLORS: MasteryColor[] = ['green', 'yellow', 'red', 'gray'];

// ── Shared button ───────────────────────────────────────────

function BarBtn({
  icon: Icon,
  onClick,
  active,
  disabled,
  label,
  title,
  className = '',
}: {
  icon: React.ElementType;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  title?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-150 flex-shrink-0 ${
        active
          ? 'bg-[#e8f5f1] text-[#2a8c7a]'
          : disabled
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-500 hover:text-[#2a8c7a] hover:bg-gray-100'
      } ${className}`}
      aria-label={label}
      title={title || label}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-gray-200 mx-0.5 flex-shrink-0" aria-hidden="true" />;
}

// ── Component ───────────────────────────────────────────────

export const GraphSidebar = memo(function GraphSidebar(props: GraphSidebarProps) {
  const {
    onBack, topicName, topicOptions, selectedTopicId, onTopicChange, masteryPct,
    searchQuery, onSearchChange, matchCount, searchInputRef,
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
    nodeCount, edgeCount,
    isFullscreen, onExitFullscreen,
    locale = 'pt',
  } = props;

  const tSidebar = I18N_MAP_VIEW[locale] ?? I18N_MAP_VIEW.es;

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

  // Close popups on outside click / Escape
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
    if (showSearch && searchInputRef?.current) searchInputRef.current.focus();
  }, [showSearch, searchInputRef]);

  const handleExport = async (exportFn: (() => Promise<void>) | undefined) => {
    if (!exportFn || exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    setShowExportMenu(false);
    try { await exportFn(); }
    catch { toast.error(tSidebar.exportMapError); }
    finally {
      exportingRef.current = false;
      if (mountedRef.current) setExporting(false);
    }
  };

  const hasExport = !!(onExportPNG || onExportJPEG);
  const undoDisabled = !canUndo || undoBusy || deletingNode || reconnecting;
  const redoDisabled = !canRedo || undoBusy || deletingNode || reconnecting;
  const ActiveLayoutIcon = LAYOUT_OPTIONS.find(l => l.value === layout)?.icon || GitBranch;
  const dropdownClass = 'absolute top-full left-0 mt-1 z-30 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 w-44';

  return (
    <div
      className="flex items-center gap-0.5 bg-white/95 backdrop-blur-sm rounded-full px-1.5 py-1 shadow-sm border border-gray-200/60"
      role="toolbar"
      aria-label="Controles del mapa"
    >
      {/* ── Nav group ── */}
      <BarBtn icon={ChevronLeft} onClick={onBack} label="Volver" />

      {topicOptions && topicOptions.length > 1 && scope === 'topic' ? (
        <select
          value={selectedTopicId || ''}
          onChange={(e) => e.target.value && onTopicChange?.(e.target.value)}
          className="appearance-none bg-transparent font-medium text-gray-900 min-w-0 max-w-[100px] sm:max-w-[160px] truncate cursor-pointer hover:text-[#2a8c7a] transition-colors outline-none"
          style={{ fontSize: fontSize.xs, ...headingStyle }}
          aria-label="Seleccionar tema"
        >
          {topicOptions.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      ) : (
        <span
          className="font-medium text-gray-900 truncate max-w-[100px] sm:max-w-[160px] flex-shrink-0"
          style={{ fontSize: fontSize.xs, ...headingStyle }}
        >
          {topicName}
        </span>
      )}

      {masteryPct !== undefined && (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#e8f5f1] text-[#2a8c7a] font-medium whitespace-nowrap flex-shrink-0"
          style={{ fontSize: fontSize.overline }}
        >
          {masteryPct}%
        </span>
      )}

      <Sep />

      {/* ── Layout + Scope (hidden on mobile) ── */}
      <div className="hidden sm:flex items-center gap-0.5">
        <div className="relative" ref={layoutMenuRef}>
          <BarBtn
            icon={ActiveLayoutIcon}
            onClick={() => setShowLayoutMenu(v => !v)}
            active={showLayoutMenu}
            label={LAYOUT_OPTIONS.find(l => l.value === layout)?.label || 'Layout'}
          />
          {showLayoutMenu && (
            <div className={dropdownClass} role="menu" aria-label="Tipo de layout">
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

        {hasCourseTopics && (
          <BarBtn
            icon={scope === 'topic' ? BookOpen : Globe}
            onClick={() => onScopeChange(scope === 'topic' ? 'course' : 'topic')}
            label={scope === 'topic' ? 'Ver todos los temas' : 'Ver solo el tema actual'}
          />
        )}

        <Sep />
      </div>

      {/* ── Zoom + Collapse/Expand (hidden on mobile + tablet) ── */}
      <div className="hidden lg:flex items-center gap-0.5">
        <BarBtn icon={ZoomOut} onClick={onZoomOut} label="Alejar" title="Alejar (-)" />
        {typeof zoomLevel === 'number' && (
          <button
            onClick={onFitView}
            className="flex items-center justify-center h-8 px-1 rounded-full text-gray-500 hover:text-[#2a8c7a] hover:bg-gray-100 transition-all duration-150 font-sans tabular-nums flex-shrink-0"
            style={{ fontSize: fontSize.overline }}
            title="Ajustar a la vista (0)"
            aria-label={`Zoom: ${Math.round(zoomLevel * 100)}%`}
          >
            {Math.round(zoomLevel * 100)}%
          </button>
        )}
        <BarBtn icon={ZoomIn} onClick={onZoomIn} label="Acercar" title="Acercar (+)" />
        <BarBtn icon={Maximize2} onClick={onFitView} label="Ajustar" title="Ajustar a la vista (0)" />

        {(onCollapseAll || onExpandAll) && (
          <>
            <Sep />
            <BarBtn icon={Minimize2} onClick={onCollapseAll ?? undefined} label="Colapsar" />
            <BarBtn
              icon={Expand}
              onClick={onExpandAll}
              active={collapsedCount > 0}
              label={collapsedCount > 0 ? `Expandir (${collapsedCount})` : 'Expandir'}
            />
          </>
        )}

        <Sep />
      </div>

      {/* ── Search ── */}
      <div className="relative" ref={searchBoxRef}>
        {showSearch ? (
          <div className="flex items-center gap-1 bg-gray-50/80 rounded-full px-2 py-0.5 min-w-[120px] sm:min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-[#2a8c7a] flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar..."
              className="min-w-0 flex-1 bg-transparent text-gray-700 placeholder-gray-400 outline-none font-sans"
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
              className="p-0.5 rounded-full hover:bg-gray-200 text-gray-400 flex-shrink-0"
              aria-label="Cerrar búsqueda"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <BarBtn
            icon={Search}
            onClick={() => setShowSearch(true)}
            active={!!searchQuery}
            label="Buscar"
          />
        )}
      </div>

      {/* ── Add concept ── */}
      {canAdd && (
        <BarBtn icon={Plus} onClick={onAddConcept} label="Añadir concepto" />
      )}

      {/* ── Undo/Redo ── */}
      <BarBtn icon={Undo2} onClick={onUndo} disabled={undoDisabled} label="Deshacer" title="Deshacer (Ctrl+Z)" />
      <BarBtn icon={Redo2} onClick={onRedo} disabled={redoDisabled} label="Rehacer" title="Rehacer (Ctrl+Y)" />

      <Sep />

      {/* ── AI Tutor ── */}
      <BarBtn icon={Sparkles} onClick={onToggleAi} active={showAiPanel} label="IA Tutor" />

      {/* ── Export (hidden on mobile) ── */}
      {hasExport && (
        <div className="hidden sm:block relative" ref={exportMenuRef}>
          <BarBtn
            icon={Download}
            onClick={() => setShowExportMenu(v => !v)}
            active={showExportMenu}
            disabled={exporting}
            label={exporting ? 'Exportando...' : 'Exportar'}
          />
          {showExportMenu && (
            <div
              className="absolute top-full right-0 mt-1 z-30 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 w-48"
              role="menu"
              aria-label="Opciones de exportación"
            >
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

      {/* ── Minimap (hidden on mobile + tablet) ── */}
      {props.onMinimapToggle && (
        <div className="hidden lg:block">
          <BarBtn
            icon={MapIcon}
            onClick={props.onMinimapToggle}
            active={!!props.showMinimap}
            label="Minimapa"
          />
        </div>
      )}

      {/* ── Mastery filter dots (hidden on mobile) ── */}
      <div className="hidden sm:flex items-center gap-0.5 px-0.5">
        {MASTERY_COLORS.map(color => {
          const isActive = masteryFilter === color;
          return (
            <button
              key={color}
              onClick={() => onMasteryFilterChange?.(isActive ? null : color)}
              className={`flex items-center justify-center w-6 h-6 rounded-full transition-all duration-150 flex-shrink-0 ${
                isActive
                  ? 'ring-2 ring-offset-1'
                  : masteryFilter && !isActive
                    ? 'opacity-40 hover:opacity-70'
                    : 'hover:scale-110'
              }`}
              style={{
                ...(isActive ? { boxShadow: `0 0 0 2px ${MASTERY_HEX[color]}` } : {}),
              }}
              title={`Filtrar: ${getMasteryLabel(color, 'es')}`}
              aria-pressed={isActive}
              aria-label={`Filtrar por ${getMasteryLabel(color, 'es')}`}
            >
              <span
                className="rounded-full"
                style={{ width: 8, height: 8, backgroundColor: MASTERY_HEX[color] }}
              />
            </button>
          );
        })}
      </div>

      {/* ── Legend (hidden on mobile + tablet) ── */}
      <div className="hidden md:block relative" ref={legendRef}>
        <BarBtn
          icon={Info}
          onClick={() => setShowLegend(v => !v)}
          active={showLegend}
          label="Leyenda"
        />
        {showLegend && (
          <div
            className="absolute top-full right-0 mt-1 z-30 bg-white rounded-xl shadow-lg border border-gray-200 p-4 w-56"
            role="dialog"
            aria-label="Leyenda de tipos de conexión"
          >
            <p
              className="font-semibold text-gray-500 uppercase tracking-wider mb-2.5 font-sans"
              style={{ fontSize: fontSize.overline }}
            >
              Tipos de conexión
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

      {/* ── Fullscreen exit (only visible in fullscreen) ── */}
      {isFullscreen && onExitFullscreen && (
        <>
          <Sep />
          <BarBtn icon={Minimize2} onClick={onExitFullscreen} label="Salir de pantalla completa" />
        </>
      )}

      {/* ── More actions (rendered via slot) ── */}
      {moreActionsSlot}

      {/* ── SR-only stats ── */}
      <span className="sr-only">{nodeCount} nodos, {edgeCount} conexiones</span>
    </div>
  );
});
