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

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import {
  Brain, RefreshCw, ChevronDown, Plus, Link2, Sparkles, Loader2, X, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';
import { FadeIn } from '@/app/components/shared/FadeIn';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import { LoadingPage, EmptyState, ErrorState } from '@/app/components/shared/PageStates';
import { KnowledgeGraph, type GraphControls } from '@/app/components/content/mindmap/KnowledgeGraph';
import { GraphToolbar } from '@/app/components/content/mindmap/GraphToolbar';
import { useGraphData } from '@/app/components/content/mindmap/useGraphData';
import type { MapNode } from '@/app/types/mindmap';
import { MASTERY_HEX, CONNECTION_TYPES, CONNECTION_TYPE_MAP } from '@/app/types/mindmap';
import { apiCall } from '@/app/lib/api';
import { deleteConnection } from '@/app/services/keywordConnectionsApi';
import { getSafeMasteryColor, getMasteryLabel } from '@/app/lib/mastery-helpers';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { headingStyle } from '@/app/design-system';

// ── Component ───────────────────────────────────────────────

export function ProfessorKnowledgeMapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { tree } = useContentTree();

  // Topic selection
  const topicId = searchParams.get('topicId') || undefined;

  // Graph data
  const { graphData, loading, error, refetch, isEmpty } = useGraphData({ topicId });

  // UI state
  const [layout, setLayout] = useState<'force' | 'radial' | 'dagre'>('force');
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCount, setCollapsedCount] = useState(0);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const graphControlsRef = useRef<GraphControls | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Debounced search query for graph data filtering
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedSearch('');
      return;
    }
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Add connection form
  const [connSource, setConnSource] = useState('');
  const [connTarget, setConnTarget] = useState('');
  const [connType, setConnType] = useState('asociacion');
  const [connLabel, setConnLabel] = useState('');
  const [connSaving, setConnSaving] = useState(false);

  // ── Flatten topics from content tree ────────────────────

  const topics = useMemo(() => {
    if (!tree?.courses) return [];
    const result: { id: string; name: string; path: string }[] = [];
    for (const course of tree.courses) {
      for (const semester of course.semesters || []) {
        for (const section of semester.sections || []) {
          for (const topic of section.topics || []) {
            result.push({
              id: topic.id,
              name: topic.name || 'Sin título',
              path: `${course.name} > ${section.name} > ${topic.name}`,
            });
          }
        }
      }
    }
    return result;
  }, [tree]);

  // ── Handlers ────────────────────────────────────────────

  const handleTopicSelect = useCallback((tid: string) => {
    setSearchParams({ topicId: tid });
    setSelectedNode(null);
    setCollapsedCount(0);
    setSearchQuery('');
    setShowAddConnection(false);
  }, [setSearchParams]);

  const handleNodeClick = useCallback((node: MapNode | null) => {
    setSelectedNode(node || null);
  }, []);

  const handleZoomIn = useCallback(() => {
    graphControlsRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    graphControlsRef.current?.zoomOut();
  }, []);

  const handleFitView = useCallback(() => {
    graphControlsRef.current?.fitView();
  }, []);

  const handleCollapseAll = useCallback(() => {
    graphControlsRef.current?.collapseAll();
  }, []);

  const handleExpandAll = useCallback(() => {
    graphControlsRef.current?.expandAll();
  }, []);

  const handleCreateConnection = useCallback(async () => {
    if (!connSource || !connTarget || connSource === connTarget) return;
    setConnSaving(true);
    try {
      await apiCall('/keyword-connections', {
        method: 'POST',
        body: JSON.stringify({
          keyword_a_id: connSource,
          keyword_b_id: connTarget,
          connection_type: connType,
          relationship: connLabel.trim() || undefined,
        }),
      });
      toast.success('Conexión creada');
      setShowAddConnection(false);
      setConnSource('');
      setConnTarget('');
      setConnType('asociacion');
      setConnLabel('');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear conexión');
    } finally {
      setConnSaving(false);
    }
  }, [connSource, connTarget, connType, connLabel, refetch]);

  const handleDeleteConnection = useCallback(async (edgeId: string) => {
    try {
      await deleteConnection(edgeId);
      toast.success('Conexión eliminada');
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar conexión');
    }
  }, [refetch]);

  const handleAiSuggest = useCallback(async () => {
    if (!topicId) return;
    setAiSuggesting(true);
    try {
      await apiCall('/ai-suggest-connections', {
        method: 'POST',
        body: JSON.stringify({ topic_id: topicId }),
      });
      toast.success('Sugerencias de IA aplicadas. Actualizando grafo...');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Error al generar sugerencias de IA');
    } finally {
      setAiSuggesting(false);
    }
  }, [topicId, refetch]);

  const sortedNodes = useMemo(
    () => [...(graphData?.nodes ?? [])].sort((a, b) => a.label.localeCompare(b.label)),
    [graphData],
  );

  // Ctrl+F / '/' → focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset connection form when modal closes
  useEffect(() => {
    if (!showAddConnection) {
      setConnSource('');
      setConnTarget('');
      setConnType('asociacion');
      setConnLabel('');
    }
  }, [showAddConnection]);

  // Close modal on Escape + prevent body scroll
  useEffect(() => {
    if (!showAddConnection) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAddConnection(false);
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [showAddConnection]);

  // ── Search filtering ───────────────────────────────────

  const matchingNodeIds = useMemo<Set<string>>(() => {
    if (!graphData || !searchQuery.trim()) return new Set();
    const q = searchQuery.trim().toLowerCase();
    return new Set(
      graphData.nodes
        .filter((n) => n.label.toLowerCase().includes(q))
        .map((n) => n.id)
    );
  }, [graphData, searchQuery]);

  const filteredGraphData = useMemo(() => {
    if (!graphData) return null;
    if (!debouncedSearch.trim()) return graphData;

    const q = debouncedSearch.trim().toLowerCase();
    const debouncedMatchIds = new Set(
      graphData.nodes
        .filter((n) => n.label.toLowerCase().includes(q))
        .map((n) => n.id)
    );

    const neighborIds = new Set<string>();
    for (const edge of graphData.edges) {
      if (debouncedMatchIds.has(edge.source)) neighborIds.add(edge.target);
      if (debouncedMatchIds.has(edge.target)) neighborIds.add(edge.source);
    }
    const visibleIds = new Set([...debouncedMatchIds, ...neighborIds]);
    return {
      nodes: graphData.nodes.filter((n) => visibleIds.has(n.id)),
      edges: graphData.edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target)),
    };
  }, [graphData, debouncedSearch]);

  // ── Mastery distribution ────────────────────────────────

  const distribution = useMemo(() => {
    if (!graphData) return null;
    const nodes = graphData.nodes;
    return {
      total: nodes.length,
      green: nodes.filter(n => n.masteryColor === 'green').length,
      yellow: nodes.filter(n => n.masteryColor === 'yellow').length,
      red: nodes.filter(n => n.masteryColor === 'red').length,
      gray: nodes.filter(n => n.masteryColor === 'gray').length,
      edges: graphData.edges.length,
    };
  }, [graphData]);

  // ── Render ──────────────────────────────────────────────

  return (
    <FadeIn>
      <div className="flex flex-col h-[calc(100dvh-4rem)] p-4 sm:p-6 lg:p-8">
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
              <p className="text-sm text-gray-500 mt-0.5">
                Visualiza y gestiona el grafo de conceptos del curso
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Topic selector */}
              <div className="relative">
                <select
                  value={topicId || ''}
                  onChange={(e) => e.target.value && handleTopicSelect(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 rounded-full px-4 py-2 pr-8 text-sm text-gray-700 shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                >
                  <option value="">Seleccionar tópico...</option>
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>{t.path}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {topicId && graphData && graphData.nodes.length > 0 && (
                <>
                  <button
                    onClick={() => setShowAddConnection(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-amber-500 rounded-full shadow-sm hover:bg-amber-600 transition-colors"
                    aria-label="Agregar conexión"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Agregar conexión</span>
                  </button>
                  <button
                    onClick={handleAiSuggest}
                    disabled={aiSuggesting}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 rounded-full border border-amber-200 shadow-sm hover:bg-amber-100 transition-colors disabled:opacity-50"
                    aria-label={aiSuggesting ? 'Sugiriendo conexiones con IA' : 'Sugerir conexiones con IA'}
                  >
                    {aiSuggesting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">{aiSuggesting ? 'Sugiriendo...' : 'IA sugerir'}</span>
                  </button>
                </>
              )}
              <button
                onClick={refetch}
                className="p-2 text-gray-400 hover:text-amber-600 bg-white rounded-full border border-gray-200 shadow-sm hover:border-amber-200 transition-colors"
                aria-label="Actualizar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {!topicId ? (
          <EmptyState
            icon={<Brain className="w-12 h-12 text-amber-400" />}
            title="Selecciona un tópico"
            description="Elige un tópico del dropdown para visualizar su grafo de conocimiento."
          />
        ) : loading ? (
          <LoadingPage />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : isEmpty ? (
          <EmptyState
            icon={<Brain className="w-12 h-12 text-amber-400" />}
            title="Sin conceptos"
            description="Este tópico no tiene palabras clave con conexiones aun."
          />
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex-shrink-0 mb-3">
              <GraphToolbar
                layout={layout}
                onLayoutChange={setLayout}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onFitView={handleFitView}
                nodeCount={filteredGraphData?.nodes.length ?? 0}
                edgeCount={filteredGraphData?.edges.length ?? 0}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                matchCount={searchQuery.trim() ? matchingNodeIds.size : undefined}
                onCollapseAll={handleCollapseAll}
                onExpandAll={handleExpandAll}
                collapsedCount={collapsedCount}
                locale="es"
                searchInputRef={searchInputRef}
              />
            </div>

            {/* Mobile mastery summary (visible below lg) */}
            {distribution && (
              <div className="flex lg:hidden items-center gap-3 mb-3 px-3 py-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                {(['green', 'yellow', 'red', 'gray'] as const).map(color => (
                  <div key={color} className="flex items-center gap-1 shrink-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: MASTERY_HEX[color] }}
                    />
                    <span className="text-xs text-gray-600">{distribution[color]}</span>
                  </div>
                ))}
                {selectedNode && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-xs text-gray-700 font-medium truncate max-w-[120px]">
                      {selectedNode.label}
                    </span>
                    {selectedNode.mastery >= 0 && (
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
              <div className="flex-1 min-h-0 relative">
                <ErrorBoundary fallback={
                  <div className="w-full h-full min-h-[400px] bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center">
                    <p className="text-sm text-gray-400">Error al renderizar el grafo. Intenta actualizar.</p>
                  </div>
                }>
                  {filteredGraphData && filteredGraphData.nodes.length > 0 ? (
                    <KnowledgeGraph
                      data={filteredGraphData}
                      onNodeClick={handleNodeClick}
                      selectedNodeId={selectedNode?.id}
                      layout={layout}
                      onReady={(controls) => { graphControlsRef.current = controls; }}
                      highlightNodeIds={matchingNodeIds.size > 0 ? matchingNodeIds : undefined}
                      onCollapseChange={setCollapsedCount}
                    />
                  ) : searchQuery.trim() ? (
                    <div className="w-full h-full min-h-[400px] bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-sm text-gray-400 mb-1">Ningún concepto encontrado</p>
                        <p className="text-xs text-gray-300">Intenta buscar otro término</p>
                      </div>
                    </div>
                  ) : null}
                </ErrorBoundary>
              </div>

              {/* Mobile selected node detail (visible below lg) */}
              {selectedNode && (
                <div className="lg:hidden absolute bottom-3 left-3 right-3 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-10">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 text-sm" style={headingStyle}>
                      {selectedNode.label}
                    </h3>
                    <button
                      onClick={() => setSelectedNode(null)}
                      className="p-1 -m-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
                      aria-label="Cerrar detalle"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: MASTERY_HEX[selectedNode.masteryColor] }}
                    />
                    <span>
                      {getMasteryLabel(selectedNode.masteryColor, 'es')}
                      {selectedNode.mastery >= 0 && ` — ${Math.round(selectedNode.mastery * 100)}%`}
                    </span>
                    {graphData && (
                      <span>
                        · {graphData.edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length} conexiones
                      </span>
                    )}
                  </div>
                  {selectedNode.definition && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {selectedNode.definition}
                    </p>
                  )}
                </div>
              )}

              {/* Sidebar panel */}
              <div className="hidden lg:flex flex-col w-72 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Distribution */}
                {distribution && (
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
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
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
                        {selectedNode.mastery >= 0 && ` — ${Math.round(selectedNode.mastery * 100)}%`}
                      </span>
                    </div>
                    {selectedNode.definition && (
                      <p className="text-xs text-gray-500 mb-3">
                        {selectedNode.definition}
                      </p>
                    )}
                    {/* Connections with delete buttons */}
                    {graphData && (() => {
                      const nodeEdges = graphData.edges.filter(
                        e => e.source === selectedNode.id || e.target === selectedNode.id
                      );
                      if (nodeEdges.length === 0) return (
                        <div className="text-xs text-gray-400 mb-2">Sin conexiones</div>
                      );
                      return (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-gray-500 mb-1.5">
                            {nodeEdges.length} conexiones
                          </p>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {nodeEdges.map(edge => {
                              const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                              const otherNode = graphData.nodes.find(n => n.id === otherId);
                              return (
                                <div key={edge.id} className="flex items-center gap-1.5 group">
                                  <span
                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: edge.connectionType ? CONNECTION_TYPE_MAP.get(edge.connectionType)?.color || '#d1d5db' : '#d1d5db' }}
                                  />
                                  <span className="text-xs text-gray-600 truncate flex-1">
                                    {otherNode?.label || otherId.slice(0, 8)}
                                  </span>
                                  <button
                                    onClick={() => handleDeleteConnection(edge.id)}
                                    className="p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                    aria-label={`Eliminar conexión con ${otherNode?.label || 'nodo'}`}
                                    title="Eliminar conexión"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="text-xs text-gray-300">
                      ID: {selectedNode.id.slice(0, 8)}...
                    </div>
                  </div>
                ) : (
                  <div className="p-4 flex-1 flex items-center justify-center">
                    <p className="text-xs text-gray-400 text-center">
                      Haz clic en un nodo para ver detalles
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {/* Add Connection Modal */}
        <AnimatePresence>
          {showAddConnection && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/20 z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddConnection(false)}
              />
              <motion.div
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ duration: 0.2 }}
                onClick={() => setShowAddConnection(false)}
              >
                <div
                  className="bg-white shadow-xl w-full max-w-md overflow-hidden rounded-t-2xl sm:rounded-2xl max-h-[90dvh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Agregar conexión"
                >
                  {/* Mobile drag handle */}
                  <div className="flex sm:hidden justify-center pt-2 pb-0">
                    <div className="w-8 h-1 rounded-full bg-gray-300" />
                  </div>
                  <div className="flex items-center justify-between px-5 pt-4 sm:pt-5 pb-3">
                    <h2
                      className="text-lg font-semibold text-gray-900"
                      style={headingStyle}
                    >
                      Agregar conexión
                    </h2>
                    <button
                      onClick={() => setShowAddConnection(false)}
                      className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      aria-label="Cerrar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    <div>
                      <label htmlFor="conn-source" className="block text-xs font-medium text-gray-600 mb-1">
                        Concepto origen *
                      </label>
                      <select
                        id="conn-source"
                        value={connSource}
                        onChange={(e) => setConnSource(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none bg-white font-sans focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                      >
                        <option value="">Seleccionar...</option>
                        {sortedNodes.map((n) => (
                          <option key={n.id} value={n.id}>{n.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="conn-target" className="block text-xs font-medium text-gray-600 mb-1">
                        Concepto destino *
                      </label>
                      <select
                        id="conn-target"
                        value={connTarget}
                        onChange={(e) => setConnTarget(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none bg-white font-sans focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                      >
                        <option value="">Seleccionar...</option>
                        {sortedNodes
                          .filter((n) => n.id !== connSource)
                          .map((n) => (
                            <option key={n.id} value={n.id}>{n.label}</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="conn-type" className="block text-xs font-medium text-gray-600 mb-1">
                        Tipo de relación
                      </label>
                      <select
                        id="conn-type"
                        value={connType}
                        onChange={(e) => setConnType(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none bg-white font-sans focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                      >
                        {CONNECTION_TYPES.map((ct) => (
                          <option key={ct.key} value={ct.key}>{ct.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="conn-label" className="block text-xs font-medium text-gray-600 mb-1">
                        Descripción (opcional)
                      </label>
                      <input
                        id="conn-label"
                        type="text"
                        value={connLabel}
                        onChange={(e) => setConnLabel(e.target.value)}
                        placeholder="Ej: regula, causa, parte de..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none font-sans focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                        maxLength={100}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 px-5 pb-5 pt-2" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
                    <button
                      onClick={() => setShowAddConnection(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreateConnection}
                      disabled={connSaving || !connSource || !connTarget || connSource === connTarget}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-full transition-colors hover:bg-amber-600 disabled:opacity-50"
                    >
                      {connSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      Crear conexión
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </FadeIn>
  );
}
