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

import { useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import {
  Brain, RefreshCw, ChevronDown, Link2, Sparkles, Loader2, Trash2, X,
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
import { ProfessorAddConnectionModal } from './ProfessorAddConnectionModal';
import type { MapNode, GraphControls } from '@/app/types/mindmap';
import { MASTERY_HEX, CONNECTION_TYPE_MAP } from '@/app/types/mindmap';
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
  const { graphData, loading, error, refetch, isEmpty } = useGraphData({ topicId, skipCustomNodes: true });

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
  const graphControlsRef = useRef<GraphControls | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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
              path: `${course.name} > ${semester.name} > ${section.name} > ${topic.name}`,
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
  }, [setSearchParams, setSearchQuery]);

  const handleNodeClick = useCallback((node: MapNode | null) => {
    setSelectedNode(node);
  }, []);

  const { handleZoomIn, handleZoomOut, handleFitView, handleCollapseAll, handleExpandAll } = useGraphControls(graphControlsRef);

  const [deleteEdgeId, setDeleteEdgeId] = useState<string | null>(null);

  const handleDeleteConnection = useCallback((edgeId: string) => {
    setDeleteEdgeId(edgeId);
  }, []);

  const executeDeleteConnection = useCallback(async () => {
    if (!deleteEdgeId) return;
    try {
      await deleteConnection(deleteEdgeId);
      toast.success('Conexión eliminada');
      setDeleteEdgeId(null);
      if (topicId) invalidateGraphCache(topicId);
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar conexión');
      setDeleteEdgeId(null);
    }
  }, [deleteEdgeId, refetch, topicId]);

  const handleAiSuggest = useCallback(async () => {
    if (!topicId) return;
    setAiSuggesting(true);
    try {
      const result = await apiCall('/ai-suggest-connections', {
        method: 'POST',
        body: JSON.stringify({ topic_id: topicId }),
      });
      const count = result?.connections_created ?? result?.created ?? null;
      if (count === 0) {
        toast.info('El grafo ya está bien conectado — no se agregaron nuevas conexiones.');
      } else if (typeof count === 'number') {
        toast.success(`Se crearon ${count} conexiones. Actualizando grafo...`);
      } else {
        toast.success('Sugerencias de IA aplicadas. Actualizando grafo...');
      }
      if (topicId) invalidateGraphCache(topicId);
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al generar sugerencias de IA');
    } finally {
      setAiSuggesting(false);
    }
  }, [topicId, refetch]);

  // Swipe-to-dismiss for mobile bottom sheet
  const dismissSelected = useCallback(() => setSelectedNode(null), []);
  const { onTouchStart: handleSheetTouchStart, onTouchEnd: handleSheetTouchEnd } = useSwipeDismiss(dismissSelected);

  // Ctrl+F / '/' → focus search input
  useSearchFocus(searchInputRef);

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
                </>
              )}
              <button
                onClick={refetch}
                className="p-2.5 text-gray-400 hover:text-amber-600 bg-white rounded-full border border-gray-200 shadow-sm hover:border-amber-200 transition-colors"
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
            icon={<Brain className="w-12 h-12 text-amber-400 animate-pulse" />}
            title="Selecciona un tópico"
            description="Elige un tópico del dropdown para visualizar su grafo de conocimiento."
          />
        ) : loading ? (
          <LoadingPage />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : isEmpty ? (
          <EmptyState
            icon={<Brain className="w-12 h-12 text-amber-400 animate-pulse" />}
            title="Sin datos"
            description="Este tópico no tiene palabras clave todavía. Las palabras clave se generan automáticamente a partir del contenido."
          />
        ) : graphData && graphData.edges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Brain className="w-12 h-12 text-amber-400 mb-4" />
            <h3 className="text-gray-900 font-medium mb-1" style={headingStyle}>Sin conexiones</h3>
            <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">
              Este tópico tiene palabras clave pero aún no hay conexiones entre ellas. Usa IA para sugerir conexiones automáticamente.
            </p>
            <button
              onClick={handleAiSuggest}
              disabled={aiSuggesting}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-amber-500 rounded-full shadow-sm hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {aiSuggesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {aiSuggesting ? 'Sugiriendo...' : 'IA sugerir conexiones'}
            </button>
          </div>
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
              />
            </div>

            {/* Mobile mastery summary (visible below lg) */}
            {distribution && (
              <div className="flex lg:hidden items-center gap-2 sm:gap-3 mb-3 px-3 py-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                <ErrorBoundary fallback={
                  <div className="w-full h-full min-h-[180px] sm:min-h-[300px] bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center">
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
                      onCollapseChange={(count) => setCollapsedCount(count)}
                      locale="es"
                    />
                  ) : searchQuery.trim() ? (
                    <div className="w-full h-full min-h-[180px] sm:min-h-[300px] bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-sm text-gray-400 mb-1">Ningún concepto encontrado</p>
                        <p className="text-xs text-gray-400">Intenta buscar otro término</p>
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
                  className="lg:hidden absolute bottom-3 left-3 right-3 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-10 max-h-[40vh] overflow-y-auto"
                  style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                  onTouchStart={handleSheetTouchStart}
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
                        {Number.isFinite(selectedNode.mastery) && selectedNode.mastery >= 0 && ` — ${Math.round(selectedNode.mastery * 100)}%`}
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
                    <div className="text-xs text-gray-400">
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
        <ProfessorAddConnectionModal
          open={showAddConnection}
          onClose={() => setShowAddConnection(false)}
          nodes={graphData?.nodes ?? []}
          topicId={topicId}
          onCreated={refetch}
        />

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

