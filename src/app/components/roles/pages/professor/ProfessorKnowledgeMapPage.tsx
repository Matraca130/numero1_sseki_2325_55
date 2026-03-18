// ============================================================
// Axon — Professor Knowledge Map Page
//
// Allows professors to visualize and manage the knowledge graph
// for their courses. They can:
//   - View the full keyword graph per topic
//   - See student mastery distribution across nodes
//   - Create/delete connections between keywords
//   - Let AI auto-suggest connections
//
// ROUTE: /professor/knowledge-map
// ============================================================

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import {
  Brain, RefreshCw, ChevronDown, Link2, Sparkles, Loader2, Trash2, X, Maximize2, Minimize2, Thermometer, LayoutTemplate,
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeIn } from '@/app/components/shared/FadeIn';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import { LoadingPage, EmptyState, ErrorState } from '@/app/components/shared/PageStates';
import { KnowledgeGraph } from '@/app/components/content/mindmap/KnowledgeGraph';
import { GraphToolbar } from '@/app/components/content/mindmap/GraphToolbar';
import { useGraphData, invalidateGraphCache } from '@/app/components/content/mindmap/useGraphData';
import { useGraphSearch } from '@/app/components/content/mindmap/useGraphSearch';
import { useSwipeDismiss } from '@/app/components/content/mindmap/useSwipeDismiss';
import { useSearchFocus } from '@/app/components/content/mindmap/useSearchFocus';
import { useGraphControls } from '@/app/components/content/mindmap/useGraphControls';
import { ConfirmDialog } from '@/app/components/content/mindmap/ConfirmDialog';
import { useFullscreen } from '@/app/components/content/mindmap/useFullscreen';
import { GraphSkeleton } from '@/app/components/content/mindmap/GraphSkeleton';
import { ProfessorAddConnectionModal } from './ProfessorAddConnectionModal';
import type { MapNode, MapEdge, GraphControls, ClassMasteryData, GraphData } from '@/app/types/mindmap';
import { MASTERY_HEX, CONNECTION_TYPE_MAP } from '@/app/types/mindmap';
import { apiCall } from '@/app/lib/api';
import { deleteConnection } from '@/app/services/keywordConnectionsApi';
import { fetchClassMastery } from '@/app/services/mindmapApi';
import { getSafeMasteryColor, getMasteryLabel } from '@/app/lib/mastery-helpers';
import { usePlatformData } from '@/app/context/PlatformDataContext';
import { useFlatTopics } from '@/app/hooks/useFlatTopics';
import { GraphTemplatePanel } from '@/app/components/content/mindmap/GraphTemplatePanel';
import { headingStyle } from '@/app/design-system';

// ── Component ───────────────────────────────────────────────

export function ProfessorKnowledgeMapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const topics = useFlatTopics();
  const { institutionId } = usePlatformData();

  // Mounted guard for async operations
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Template panel state
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [templateOverride, setTemplateOverride] = useState<GraphData | null>(null);

  // Topic selection
  const topicId = searchParams.get('topicId') || undefined;

  // Graph data
  const { graphData: fetchedGraphData, loading, error, refetch, isEmpty: fetchedIsEmpty } = useGraphData({ topicId, skipCustomNodes: true });
  const graphData = templateOverride ?? fetchedGraphData;
  const isEmpty = templateOverride ? false : fetchedIsEmpty;

  // Search (shared hook: debounce + filter + highlight)
  const {
    searchQuery, setSearchQuery,
    matchingNodeIds, filteredGraphData,
    matchCount, nodeCount, edgeCount,
  } = useGraphSearch(graphData);

  // UI state
  const [layout, setLayout] = useState<'force' | 'radial' | 'dagre'>('force');
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [collapsedCount, setCollapsedCount] = useState(0);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  // Minimap: visible on desktop by default, hidden on mobile
  const [showMinimap, setShowMinimap] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const toggleMinimap = useCallback(() => setShowMinimap(v => !v), []);
  const graphControlsRef = useRef<GraphControls | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { isFullscreen, toggleFullscreen, fullscreenRef } = useFullscreen();
  const handleGraphReady = useCallback((controls: GraphControls) => { graphControlsRef.current = controls; }, []);
  const handleCollapseChange = useCallback((count: number) => setCollapsedCount(count), []);

  // Heatmap overlay state
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [heatmapData, setHeatmapData] = useState<ClassMasteryData[] | null>(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  // ── Heatmap: fetch class mastery when toggled on ──────

  // Stable key for graphData nodes to avoid re-fetching on every reference change
  const graphNodeKey = useMemo(
    () => graphData?.nodes.map(n => n.id).sort().join(',') ?? '',
    [graphData?.nodes],
  );

  useEffect(() => {
    if (!heatmapEnabled || !topicId || !graphData) {
      setHeatmapData(null);
      setHeatmapLoading(false);
      return;
    }
    let cancelled = false;
    setHeatmapLoading(true);
    fetchClassMastery(topicId, graphData.nodes)
      .then(data => { if (!cancelled) setHeatmapData(data); })
      .catch(() => { if (!cancelled) { setHeatmapData(null); toast.error('Error al cargar mapa de calor'); } })
      .finally(() => { if (!cancelled) setHeatmapLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatmapEnabled, topicId, graphNodeKey]);

  /** Graph data with class-wide mastery overlaid when heatmap is active */
  const heatmapGraphData = useMemo((): GraphData | null => {
    if (!heatmapEnabled || !heatmapData || heatmapData.length === 0 || !filteredGraphData) return null;
    const masteryLookup = new Map(heatmapData.map(d => [d.keyword_id, d]));
    return {
      ...filteredGraphData,
      nodes: filteredGraphData.nodes.map(node => {
        const cm = masteryLookup.get(node.id);
        if (!cm) return node;
        return {
          ...node,
          mastery: cm.avg_mastery,
          masteryColor: getSafeMasteryColor(cm.avg_mastery),
        };
      }),
    };
  }, [heatmapEnabled, heatmapData, filteredGraphData]);

  // Memoized O(1) lookup for heatmap data by keyword_id (avoids inline .find() in render)
  const heatmapLookup = useMemo(() => {
    if (!heatmapData) return null;
    return new Map(heatmapData.map(d => [d.keyword_id, d]));
  }, [heatmapData]);

  // ── Handlers ────────────────────────────────────────────

  const handleTopicSelect = useCallback((tid: string) => {
    setSearchParams({ topicId: tid });
    setSelectedNode(null);
    setCollapsedCount(0);
    setSearchQuery('');
    setShowAddConnection(false);
    setShowTemplatePanel(false);
    setTemplateOverride(null);
    setHeatmapEnabled(false);
    setHeatmapData(null);
  }, [setSearchParams, setSearchQuery]);

  const handleLoadTemplate = useCallback((nodes: MapNode[], edges: MapEdge[]) => {
    setTemplateOverride({ nodes, edges });
    setSelectedNode(null);
    setSearchQuery('');
    setHeatmapEnabled(false);
    setHeatmapData(null);
  }, [setSearchQuery]);

  const handleNodeClick = useCallback((node: MapNode | null) => {
    setSelectedNode(node);
  }, []);

  const { handleZoomIn, handleZoomOut, handleFitView, handleCollapseAll, handleExpandAll, handleExportPNG, handleExportJPEG } = useGraphControls(graphControlsRef);

  const [deleteEdgeId, setDeleteEdgeId] = useState<string | null>(null);
  const deletingRef = useRef(false);
  const aiSuggestingRef = useRef(false);

  const handleDeleteConnection = useCallback((edgeId: string) => {
    setDeleteEdgeId(edgeId);
  }, []);

  const executeDeleteConnection = useCallback(async () => {
    if (!deleteEdgeId || deletingRef.current) return;
    deletingRef.current = true;
    try {
      await deleteConnection(deleteEdgeId);
      if (!mountedRef.current) return;
      toast.success('Conexión eliminada');
      setDeleteEdgeId(null);
      if (topicId) invalidateGraphCache(topicId);
      else refetch();
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      toast.error(err instanceof Error ? err.message : 'Error al eliminar conexión');
      setDeleteEdgeId(null);
    } finally {
      deletingRef.current = false;
    }
  }, [deleteEdgeId, refetch, topicId]);

  const handleAiSuggest = useCallback(async () => {
    if (!topicId || aiSuggestingRef.current) return;
    aiSuggestingRef.current = true;
    setAiSuggesting(true);
    try {
      const result = await apiCall('/ai-suggest-connections', {
        method: 'POST',
        body: JSON.stringify({ topic_id: topicId }),
      });
      if (!mountedRef.current) return;
      const count = result?.connections_created ?? result?.created ?? null;
      if (count === 0) {
        toast.info('El grafo ya está bien conectado — no se agregaron nuevas conexiones.');
      } else if (typeof count === 'number') {
        toast.success(`Se crearon ${count} conexiones. Actualizando grafo...`);
      } else {
        toast.success('Sugerencias de IA aplicadas. Actualizando grafo...');
      }
      if (topicId) invalidateGraphCache(topicId);
      else refetch();
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      toast.error(err instanceof Error ? err.message : 'Error al generar sugerencias de IA');
    } finally {
      aiSuggestingRef.current = false;
      if (mountedRef.current) setAiSuggesting(false);
    }
  }, [topicId, refetch]);

  // Swipe-to-dismiss for mobile bottom sheet
  const dismissSelected = useCallback(() => setSelectedNode(null), []);
  const { onTouchStart: handleSheetTouchStart, onTouchMove: handleSheetTouchMove, onTouchEnd: handleSheetTouchEnd } = useSwipeDismiss(dismissSelected);

  // Ctrl+F / '/' → focus search input
  useSearchFocus(searchInputRef);

  // ── Mastery distribution ────────────────────────────────

  const distribution = useMemo(() => {
    if (!graphData) return null;
    const nodes = graphData.nodes;
    let green = 0, yellow = 0, red = 0, gray = 0;
    for (const n of nodes) {
      if (n.masteryColor === 'green') green++;
      else if (n.masteryColor === 'yellow') yellow++;
      else if (n.masteryColor === 'red') red++;
      else gray++;
    }
    return { total: nodes.length, green, yellow, red, gray, edges: graphData.edges.length };
  }, [graphData]);

  // Memoize selected node's connections + node lookup map (avoids O(N*M) in render)
  const selectedNodeConnections = useMemo(() => {
    if (!selectedNode || !graphData) return [];
    return graphData.edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id);
  }, [selectedNode, graphData]);

  const nodeById = useMemo(() => {
    if (!graphData) return new Map<string, MapNode>();
    return new Map(graphData.nodes.map(n => [n.id, n]));
  }, [graphData]);

  // ── Render ──────────────────────────────────────────────

  return (
    <FadeIn>
      <div
        ref={fullscreenRef}
        className={`flex flex-col ${
          isFullscreen
            ? 'fixed inset-0 z-50 bg-[#F0F2F5] p-4 sm:p-6'
            : 'h-[calc(100dvh-4rem)] p-4 sm:p-6 lg:p-8'
        }`}
      >
        {/* Header */}
        <div className="flex-shrink-0 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1
                className="text-gray-900"
                style={{ ...headingStyle, fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}
              >
                Mapa de Conocimiento
              </h1>
              <p className="font-sans mt-0.5" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)', color: '#6b7280' }}>
                Visualiza y gestiona el grafo de conceptos del curso
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Topic selector */}
              <div className="relative">
                <select
                  value={topicId || ''}
                  onChange={(e) => e.target.value && handleTopicSelect(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 rounded-full px-4 py-2 pr-8 text-sm text-gray-700 shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 min-w-0 max-w-[50vw] sm:max-w-xs"
                  aria-label="Seleccionar tópico"
                >
                  <option value="">Seleccionar tópico...</option>
                  {topics.map(t => (
                    <option key={t.id} value={t.id} title={t.path}>{t.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {topicId && graphData && (
                <>
                  <button
                    onClick={() => setShowAddConnection(true)}
                    className="flex items-center gap-1.5 px-3 py-2.5 sm:py-2 text-xs font-medium text-white bg-amber-500 rounded-full shadow-sm hover:bg-amber-600 transition-colors"
                    aria-label="Agregar conexión"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Agregar conexión</span>
                  </button>
                  <button
                    onClick={handleAiSuggest}
                    disabled={aiSuggesting}
                    className="flex items-center gap-1.5 px-3 py-2.5 sm:py-2 text-xs font-medium text-amber-700 bg-amber-50 rounded-full border border-amber-200 shadow-sm hover:bg-amber-100 transition-colors disabled:opacity-50"
                    aria-label={aiSuggesting ? 'Sugiriendo conexiones con IA' : 'Sugerir conexiones con IA'}
                  >
                    {aiSuggesting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">{aiSuggesting ? 'Sugiriendo...' : 'IA sugerir'}</span>
                  </button>
                  <button
                    onClick={() => { setShowTemplatePanel(v => !v); }}
                    className={`flex items-center gap-1.5 px-3 py-2.5 sm:py-2 text-xs font-medium rounded-full border shadow-sm transition-colors ${
                      showTemplatePanel
                        ? 'text-white bg-[#2a8c7a] border-[#2a8c7a] hover:bg-[#244e47]'
                        : 'text-gray-600 bg-white border-gray-200 hover:border-[#2a8c7a] hover:text-[#2a8c7a]'
                    }`}
                    aria-label={showTemplatePanel ? 'Cerrar plantillas' : 'Abrir plantillas'}
                    aria-pressed={showTemplatePanel}
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Plantillas</span>
                  </button>
                  <button
                    onClick={() => setHeatmapEnabled(v => !v)}
                    disabled={heatmapLoading}
                    className={`flex items-center gap-1.5 px-3 py-2.5 sm:py-2 text-xs font-medium rounded-full border shadow-sm transition-colors disabled:opacity-50 ${
                      heatmapEnabled
                        ? 'text-white bg-rose-500 border-rose-500 hover:bg-rose-600'
                        : 'text-gray-600 bg-white border-gray-200 hover:border-rose-300 hover:text-rose-600'
                    }`}
                    aria-label={heatmapEnabled ? 'Desactivar mapa de calor' : 'Activar mapa de calor'}
                    aria-pressed={heatmapEnabled}
                    title={heatmapEnabled ? 'Desactivar mapa de calor' : 'Activar mapa de calor'}
                  >
                    {heatmapLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Thermometer className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Mapa de calor</span>
                  </button>
                </>
              )}
              <button
                onClick={refetch}
                className="p-2.5 text-gray-400 hover:text-amber-600 bg-white rounded-full border border-gray-200 shadow-sm hover:border-amber-200 transition-colors"
                aria-label="Actualizar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2.5 text-gray-400 hover:text-amber-600 bg-white rounded-full border border-gray-200 shadow-sm hover:border-amber-200 transition-colors"
                aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {!topicId ? (
          <EmptyState
            icon={<Brain className="w-12 h-12 text-amber-400 animate-pulse" />}
            title="Selecciona un tópico"
            description="Elige un tópico del dropdown para visualizar su grafo de conocimiento."
            accent="amber"
          />
        ) : loading ? (
          <div className="flex-1 min-h-0">
            <GraphSkeleton label="Cargando grafo de conocimiento..." />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : isEmpty ? (
          <EmptyState
            icon={<Brain className="w-12 h-12 text-amber-400 animate-pulse" />}
            title="Sin datos"
            description="Este tópico no tiene palabras clave todavía. Las palabras clave se generan automáticamente a partir del contenido."
            accent="amber"
          />
        ) : graphData && graphData.edges.length === 0 ? (
          <EmptyState
            icon={aiSuggesting ? <Loader2 className="w-12 h-12 text-amber-400 animate-spin" /> : <Sparkles className="w-12 h-12 text-amber-400" />}
            title="Sin conexiones"
            description="Este tópico tiene palabras clave pero aún no hay conexiones entre ellas. Usa IA para sugerir conexiones automáticamente."
            accent="amber"
            actionLabel={aiSuggesting ? 'Sugiriendo...' : 'IA sugerir conexiones'}
            onAction={!aiSuggesting ? handleAiSuggest : undefined}
          />
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex-shrink-0 mb-3 overflow-x-hidden">
              <GraphToolbar
                layout={layout}
                onLayoutChange={setLayout}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onFitView={handleFitView}
                nodeCount={nodeCount}
                edgeCount={edgeCount}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                matchCount={searchQuery.trim() ? matchCount : undefined}
                onCollapseAll={handleCollapseAll}
                onExpandAll={handleExpandAll}
                collapsedCount={collapsedCount}
                locale="es"
                searchInputRef={searchInputRef}
                onExportPNG={handleExportPNG}
                onExportJPEG={handleExportJPEG}
                showMinimap={showMinimap}
                onMinimapToggle={toggleMinimap}
              />
            </div>

            {/* Mobile mastery summary (visible below lg) */}
            {distribution && (
              <div className="flex lg:hidden items-center gap-2 sm:gap-3 mb-3 px-3 py-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {(['green', 'yellow', 'red', 'gray'] as const).map(color => {
                  const label = getMasteryLabel(color, 'es');
                  return (
                    <div key={color} className="flex items-center gap-1 shrink-0" title={label}>
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: MASTERY_HEX[color] }}
                        aria-hidden="true"
                      />
                      <span className="text-xs text-gray-600" aria-label={`${distribution[color]} ${label}`}>
                        {distribution[color]}
                      </span>
                    </div>
                  );
                })}
                {selectedNode && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-xs text-gray-700 font-medium truncate max-w-[80px] sm:max-w-[120px]">
                      {selectedNode.label}
                    </span>
                    {Number.isFinite(selectedNode.mastery) && selectedNode.mastery >= 0 && (
                      <span className="text-xs text-gray-500">
                        {Math.round(selectedNode.mastery * 100)}%
                      </span>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex flex-1 min-h-0 gap-4 relative">
              {/* Graph */}
              <div className="flex-1 min-h-0 relative overflow-hidden">
                <ErrorBoundary fallback={(_err, reset) => (
                  <div className="w-full h-full min-h-[180px] sm:min-h-[300px] bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center gap-3 px-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-red-400" />
                    </div>
                    <p
                      className="text-gray-500 text-center"
                      style={{ fontSize: 'clamp(0.8125rem, 1.3vw, 0.875rem)' }}
                    >
                      Error al renderizar el grafo.
                    </p>
                    <button
                      onClick={reset}
                      className="text-sm font-medium text-[#2a8c7a] hover:underline"
                    >
                      Reintentar
                    </button>
                  </div>
                )}>
                  {filteredGraphData && filteredGraphData.nodes.length > 0 ? (
                    <>
                      <KnowledgeGraph
                        data={heatmapGraphData ?? filteredGraphData}
                        onNodeClick={handleNodeClick}
                        selectedNodeId={selectedNode?.id}
                        layout={layout}
                        onReady={handleGraphReady}
                        highlightNodeIds={matchingNodeIds.size > 0 ? matchingNodeIds : undefined}
                        onCollapseChange={handleCollapseChange}
                        locale="es"
                        topicId={topicId}
                        showMinimap={showMinimap}
                      />
                      {/* Heatmap overlay badge */}
                      {heatmapEnabled && heatmapData && heatmapData.length > 0 && (
                        <div className="absolute top-3 left-3 z-[6] flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur rounded-full border border-rose-200 shadow-sm">
                          <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                          <span className="text-xs font-medium text-rose-600">Mapa de calor</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">Vista previa</span>
                        </div>
                      )}
                      {heatmapLoading && (
                        <div className="absolute inset-0 z-[5] bg-white/40 rounded-2xl flex items-center justify-center pointer-events-none">
                          <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                        </div>
                      )}
                    </>
                  ) : searchQuery.trim() ? (
                    <div className="w-full h-full min-h-[180px] sm:min-h-[300px] bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center">
                      <div className="flex flex-col items-center text-center px-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
                          <Brain className="w-6 h-6 text-amber-400" />
                        </div>
                        <p
                          className="font-semibold text-gray-700 mb-1"
                          style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
                        >
                          Ningún concepto encontrado
                        </p>
                        <p
                          className="text-gray-400"
                          style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                        >
                          Intenta buscar otro término
                        </p>
                      </div>
                    </div>
                  ) : null}
                </ErrorBoundary>
                {/* AI processing overlay */}
                {aiSuggesting && (
                  <div className="absolute inset-0 z-[5] bg-white/60 rounded-2xl flex flex-col items-center justify-center gap-3 pointer-events-none">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                    <p className="text-sm text-gray-500 font-medium">La IA está analizando los conceptos...</p>
                  </div>
                )}
              </div>

              {/* Mobile selected node detail (visible below lg) */}
              {selectedNode && (
                <div
                  className="lg:hidden absolute bottom-3 left-3 right-3 bg-white rounded-2xl shadow-lg border border-gray-200 p-3 z-10 max-h-[40vh] overflow-y-auto"
                  style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                  onTouchStart={handleSheetTouchStart}
                  onTouchMove={handleSheetTouchMove}
                  onTouchEnd={handleSheetTouchEnd}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 text-sm" style={headingStyle}>
                      {selectedNode.label}
                    </h3>
                    <button
                      onClick={() => setSelectedNode(null)}
                      className="p-3 -mr-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
                      aria-label="Cerrar detalle"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: MASTERY_HEX[selectedNode.masteryColor] }}
                      aria-hidden="true"
                    />
                    <span>
                      {getMasteryLabel(selectedNode.masteryColor, 'es')}
                      {Number.isFinite(selectedNode.mastery) && selectedNode.mastery >= 0 && ` — ${Math.round(selectedNode.mastery * 100)}%`}
                    </span>
                    {selectedNodeConnections.length > 0 && (
                      <span>
                        · {selectedNodeConnections.length} conexiones
                      </span>
                    )}
                  </div>
                  {selectedNode.definition && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {selectedNode.definition}
                    </p>
                  )}
                  {/* Heatmap mobile detail */}
                  {heatmapEnabled && heatmapLookup && (() => {
                    const cm = heatmapLookup.get(selectedNode.id);
                    if (!cm) return null;
                    return (
                      <div className="flex items-center gap-2 mt-2 text-[11px]">
                        <Thermometer className="w-3 h-3 text-rose-500 flex-shrink-0" />
                        <span className="text-gray-500">Clase: {Math.round(cm.avg_mastery * 100)}%</span>
                        <span className="text-gray-400">|</span>
                        <span className="text-red-500">{cm.weak_student_count} con dificultades</span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Sidebar panel */}
              <div className="hidden lg:flex flex-col w-72 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Distribution */}
                {distribution && (
                  <div className="p-4 border-b border-gray-100">
                    <h3
                      className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3"
                      style={headingStyle}
                    >
                      Distribución de dominio
                    </h3>
                    <div className="space-y-2">
                      {(['green', 'yellow', 'red', 'gray'] as const).map(color => {
                        const count = distribution[color];
                        const pct = distribution.total > 0 ? (count / distribution.total) * 100 : 0;
                        return (
                          <div key={color} className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: MASTERY_HEX[color] }}
                            />
                            <span className="text-xs text-gray-600 flex-1">
                              {getMasteryLabel(color, 'es')}
                            </span>
                            <span className="text-xs font-medium text-gray-700">
                              {count}
                            </span>
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-label={`${getMasteryLabel(color, 'es')}: ${count} de ${distribution.total}`} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: MASTERY_HEX[color],
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Heatmap summary */}
                {heatmapEnabled && heatmapData && heatmapData.length > 0 && (
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                      <h3
                        className="text-xs font-semibold text-rose-600 uppercase tracking-wider"
                        style={headingStyle}
                      >
                        Mapa de calor
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium ml-auto">Vista previa</span>
                    </div>
                    {(() => {
                      const avgAll = heatmapData.reduce((s, d) => s + d.avg_mastery, 0) / heatmapData.length;
                      const totalWeak = heatmapData.reduce((s, d) => s + d.weak_student_count, 0);
                      const weakNodes = heatmapData.filter(d => d.avg_mastery < 0.3).length;
                      return (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Dominio promedio</span>
                            <span className="font-medium" style={{ color: MASTERY_HEX[getSafeMasteryColor(avgAll)] }}>
                              {Math.round(avgAll * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Conceptos cr\u00edticos</span>
                            <span className="font-medium text-red-500">{weakNodes}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Alumnos en riesgo</span>
                            <span className="font-medium text-red-500">{totalWeak}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Selected node detail */}
                {selectedNode ? (
                  <div className="p-4 flex-1 overflow-y-auto">
                    <h3
                      className="font-medium text-gray-900 mb-1"
                      style={headingStyle}
                    >
                      {selectedNode.label}
                    </h3>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: MASTERY_HEX[selectedNode.masteryColor] }}
                      />
                      <span className="text-xs text-gray-500">
                        {getMasteryLabel(getSafeMasteryColor(selectedNode.mastery), 'es')}
                        {Number.isFinite(selectedNode.mastery) && selectedNode.mastery >= 0 && ` — ${Math.round(selectedNode.mastery * 100)}%`}
                      </span>
                    </div>
                    {/* Heatmap node detail */}
                    {heatmapEnabled && heatmapLookup && (() => {
                      const cm = heatmapLookup.get(selectedNode.id);
                      if (!cm) return null;
                      return (
                        <div className="mb-3 p-2 bg-rose-50 rounded-lg border border-rose-100">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Thermometer className="w-3 h-3 text-rose-500" />
                            <span className="text-[11px] font-medium text-rose-600">Datos de clase</span>
                          </div>
                          <div className="space-y-0.5 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Dominio promedio</span>
                              <span className="font-medium" style={{ color: MASTERY_HEX[getSafeMasteryColor(cm.avg_mastery)] }}>
                                {Math.round(cm.avg_mastery * 100)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Alumnos</span>
                              <span className="font-medium text-gray-700">{cm.student_count}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Con dificultades</span>
                              <span className="font-medium text-red-500">{cm.weak_student_count}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {selectedNode.definition && (
                      <p className="text-xs text-gray-500 mb-3">
                        {selectedNode.definition}
                      </p>
                    )}
                    {/* Connections with delete buttons */}
                    {(() => {
                      if (selectedNodeConnections.length === 0) return (
                        <div className="text-xs text-gray-500 mb-2">Sin conexiones</div>
                      );
                      return (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-gray-500 mb-1.5">
                            {selectedNodeConnections.length} conexiones
                          </p>
                          <div className="space-y-1 max-h-40 overflow-y-auto" role="list" aria-label="Conexiones del concepto">
                            {selectedNodeConnections.map(edge => {
                              const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                              const otherNode = nodeById.get(otherId);
                              return (
                                <div key={edge.id} className="flex items-center gap-1.5 group">
                                  <span
                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: edge.connectionType ? CONNECTION_TYPE_MAP.get(edge.connectionType)?.color || '#d1d5db' : '#d1d5db' }}
                                    aria-hidden="true"
                                    title={edge.connectionType ? CONNECTION_TYPE_MAP.get(edge.connectionType)?.label || '' : ''}
                                  />
                                  <span className="text-xs text-gray-600 truncate flex-1">
                                    {otherNode?.label || otherId.slice(0, 8)}
                                  </span>
                                  <button
                                    onClick={() => handleDeleteConnection(edge.id)}
                                    className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus:opacity-100 transition-all flex-shrink-0"
                                    aria-label={`Eliminar conexión con ${otherNode?.label || 'nodo'}`}
                                    title="Eliminar conexión"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-4 flex-1 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                      <Brain className="w-6 h-6 text-amber-400 animate-pulse" />
                    </div>
                    <div>
                      <p
                        className="font-medium text-gray-600 mb-0.5"
                        style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(0.8125rem, 1.3vw, 0.875rem)' }}
                      >
                        Selecciona un nodo
                      </p>
                      <p
                        className="text-gray-400 max-w-[12rem]"
                        style={{ fontSize: 'clamp(0.6875rem, 1.1vw, 0.75rem)' }}
                      >
                        Haz clic en un nodo del grafo para ver sus detalles
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {/* Graph Template Panel */}
        {topicId && institutionId && (
          <ErrorBoundary fallback={(_err, reset) => (
            <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg z-40 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-gray-500">Error al cargar plantillas.</p>
              <button onClick={reset} className="text-sm text-[#2a8c7a] hover:underline">Reintentar</button>
            </div>
          )}>
            <GraphTemplatePanel
              open={showTemplatePanel}
              onClose={() => setShowTemplatePanel(false)}
              institutionId={institutionId}
              topicId={topicId}
              currentNodes={graphData?.nodes ?? []}
              currentEdges={graphData?.edges ?? []}
              onLoadTemplate={handleLoadTemplate}
            />
          </ErrorBoundary>
        )}

        {/* Add Connection Modal */}
        <ErrorBoundary fallback={(_err, reset) => (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-2xl p-6 text-center max-w-xs">
              <p className="text-sm text-gray-500 mb-3">Error al cargar el formulario.</p>
              <button onClick={reset} className="text-sm text-[#2a8c7a] hover:underline">Reintentar</button>
            </div>
          </div>
        )}>
          <ProfessorAddConnectionModal
            open={showAddConnection}
            onClose={() => setShowAddConnection(false)}
            nodes={graphData?.nodes ?? []}
            topicId={topicId}
            onCreated={refetch}
          />
        </ErrorBoundary>

        {/* Delete connection confirmation dialog */}
        {deleteEdgeId && (
          <ConfirmDialog
            title="¿Eliminar conexión?"
            description="Esta acción no se puede deshacer."
            cancelLabel="Cancelar"
            confirmLabel="Eliminar"
            onCancel={() => setDeleteEdgeId(null)}
            onConfirm={executeDeleteConnection}
            zClass="z-[60]"
          />
        )}
      </div>
    </FadeIn>
  );
}

