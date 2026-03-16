// ============================================================
// Axon — KnowledgeMapView (Student Mind Map Page)
//
// Full-page knowledge graph visualization.
// Shows keyword nodes colored by mastery (BKT p_know).
// Inspired by XMind + Obsidian graph view.
//
// FEATURES:
//   - Full graph of all keywords in selected topic/course
//   - Mastery-colored nodes (green/yellow/red/gray)
//   - Connection-type colored edges
//   - Click node → context menu → Flashcard / Quiz / Summary
//   - Layout switching (force / radial / tree)
//   - Zoom/pan controls + keyboard shortcuts
//   - Topic selector dropdown
//   - Responsive design
//
// ROUTE: /student/knowledge-map
// AGENT: Mind Map Agent
// ============================================================

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Brain, Map, RefreshCw, Globe, BookOpen, X, Plus, Trash2, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { LoadingPage, EmptyState, ErrorState } from '@/app/components/shared/PageStates';
import { FadeIn } from '@/app/components/shared/FadeIn';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import { useApp } from '@/app/context/AppContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { ChevronDown } from 'lucide-react';
import { KnowledgeGraph, type GraphControls } from './mindmap/KnowledgeGraph';
import { NodeContextMenu } from './mindmap/NodeContextMenu';
import { NodeAnnotationModal } from './mindmap/NodeAnnotationModal';
import { GraphToolbar } from './mindmap/GraphToolbar';
import { useGraphData } from './mindmap/useGraphData';
import { AddNodeEdgeModal } from './mindmap/AddNodeEdgeModal';
import { deleteCustomNode } from '@/app/services/mindmapApi';
import type { MapNode, NodeAction } from '@/app/types/mindmap';
import { MASTERY_HEX } from '@/app/types/mindmap';
import { headingStyle } from '@/app/design-system';

// ── Component ───────────────────────────────────────────────

type GraphScope = 'topic' | 'course';

export function KnowledgeMapView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentTopic, currentCourse } = useApp();
  const { tree } = useContentTree();

  // ── Flatten all topics from content tree for the selector ──
  const allTopics = useMemo(() => {
    if (!tree?.courses) return [];
    const result: { id: string; name: string; courseName: string }[] = [];
    for (const course of tree.courses) {
      for (const semester of course.semesters || []) {
        for (const section of semester.sections || []) {
          for (const topic of section.topics || []) {
            result.push({
              id: topic.id,
              name: topic.name || 'Sem título',
              courseName: course.name,
            });
          }
        }
      }
    }
    return result;
  }, [tree]);

  // Topic from URL > context > user selection
  const [manualTopicId, setManualTopicId] = useState<string | undefined>();
  const topicId = searchParams.get('topicId') || currentTopic?.id || manualTopicId || undefined;
  const summaryId = searchParams.get('summaryId') || undefined;

  const handleTopicSelect = useCallback((tid: string) => {
    setManualTopicId(tid);
    setSearchParams(tid ? { topicId: tid } : {});
    setSelectedNode(null);
    setContextMenu(null);
    setSearchQuery('');
  }, [setSearchParams]);

  // Scope: single topic vs all topics in course
  const [scope, setScopeRaw] = useState<GraphScope>('topic');
  const setScope = useCallback((s: GraphScope) => {
    setScopeRaw(s);
    setSearchQuery('');
    setSelectedNode(null);
    setContextMenu(null);
  }, []);

  // Extract all topic IDs from the current course
  const courseTopicIds = useMemo(() => {
    if (!currentCourse?.semesters) return [];
    const ids: string[] = [];
    for (const sem of currentCourse.semesters) {
      for (const sec of sem.sections || []) {
        for (const t of sec.topics || []) {
          ids.push(t.id);
        }
      }
    }
    return ids;
  }, [currentCourse]);

  const hasCourseTopics = courseTopicIds.length > 1;

  // Graph data
  const { graphData, loading, error, refetch, isEmpty } = useGraphData({
    topicId: scope === 'topic' ? topicId : undefined,
    summaryId: scope === 'topic' ? summaryId : undefined,
    courseTopicIds: scope === 'course' ? courseTopicIds : undefined,
  });

  // UI state
  const [layout, setLayout] = useState<'force' | 'radial' | 'dagre'>('force');
  const [searchQuery, setSearchQuery] = useState('');
  // Debounced search query for graph data filtering (prevents G6 recreation on every keystroke)
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedSearch('');
      return;
    }
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    node: MapNode;
    position: { x: number; y: number };
  } | null>(null);
  const [annotationNode, setAnnotationNode] = useState<MapNode | null>(null);
  const [collapsedCount, setCollapsedCount] = useState(0);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const graphControlsRef = useRef<GraphControls | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // ── Handlers ────────────────────────────────────────────

  const handleNodeClick = useCallback((node: MapNode | null) => {
    if (!node) {
      setSelectedNode(null);
      setContextMenu(null);
      return;
    }
    setSelectedNode(node);
  }, []);

  const handleNodeRightClick = useCallback((node: MapNode, position: { x: number; y: number }) => {
    setContextMenu({ node, position });
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleAction = useCallback((action: NodeAction, node: MapNode) => {
    setContextMenu(null);

    switch (action) {
      case 'flashcard':
        navigate(`/student/flashcards?keywordId=${node.id}`);
        break;
      case 'quiz':
        navigate(`/student/quizzes?keywordId=${node.id}`);
        break;
      case 'summary':
        if (node.summaryId) {
          navigate(`/student/summary/${node.summaryId}?highlight=${encodeURIComponent(node.label)}`);
        }
        break;
      case 'annotate':
        setAnnotationNode(node);
        break;
      case 'details':
        setSelectedNode(node);
        break;
    }
  }, [navigate]);

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

  const handleDeleteCustomNode = useCallback(async (node: MapNode) => {
    if (!node.isUserCreated) return;
    try {
      await deleteCustomNode(node.id);
      setSelectedNode(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao apagar conceito');
    }
  }, [refetch]);

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

  // Effective topicId for custom node creation
  const effectiveTopicId = topicId || courseTopicIds[0] || '';

  // ── Derived data ────────────────────────────────────────

  // IDs of nodes whose label directly matches the search query (responsive, no debounce)
  const matchingNodeIds = useMemo<Set<string>>(() => {
    if (!graphData || !searchQuery.trim()) return new Set();
    const q = searchQuery.trim().toLowerCase();
    return new Set(
      graphData.nodes
        .filter((n) => n.label.toLowerCase().includes(q))
        .map((n) => n.id)
    );
  }, [graphData, searchQuery]);

  // Filtered graph: uses debounced query to avoid G6 destroy/recreate on every keystroke
  const filteredGraphData = useMemo(() => {
    if (!graphData) return null;
    if (!debouncedSearch.trim()) return graphData;

    const q = debouncedSearch.trim().toLowerCase();
    const debouncedMatchIds = new Set(
      graphData.nodes
        .filter((n) => n.label.toLowerCase().includes(q))
        .map((n) => n.id)
    );

    // Build neighbor set: nodes directly connected to any matched node
    const neighborIds = new Set<string>();
    for (const edge of graphData.edges) {
      if (debouncedMatchIds.has(edge.source)) neighborIds.add(edge.target);
      if (debouncedMatchIds.has(edge.target)) neighborIds.add(edge.source);
    }

    // Union of matched + neighbors
    const visibleIds = new Set([...debouncedMatchIds, ...neighborIds]);

    const filteredNodes = graphData.nodes.filter((n) => visibleIds.has(n.id));
    const filteredEdges = graphData.edges.filter(
      (e) => visibleIds.has(e.source) && visibleIds.has(e.target)
    );

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [graphData, debouncedSearch]);

  const nodeCount = filteredGraphData?.nodes.length ?? 0;
  const edgeCount = filteredGraphData?.edges.length ?? 0;
  const matchCount = matchingNodeIds.size;

  const masteryStats = useMemo(() => {
    if (!graphData) return null;
    const nodes = graphData.nodes;
    const total = nodes.length;
    if (total === 0) return null;

    const mastered = nodes.filter(n => n.masteryColor === 'green').length;
    const learning = nodes.filter(n => n.masteryColor === 'yellow').length;
    const weak = nodes.filter(n => n.masteryColor === 'red').length;
    const noData = nodes.filter(n => n.masteryColor === 'gray').length;

    const avgMastery = nodes.reduce((sum, n) => sum + (n.mastery >= 0 ? n.mastery : 0), 0) / total;

    return { total, mastered, learning, weak, noData, avgMastery };
  }, [graphData]);

  // ── Render states ───────────────────────────────────────

  if (loading) return <LoadingPage />;

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  if (!topicId && !summaryId && scope !== 'course') {
    return (
      <FadeIn>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <Map className="w-14 h-14 mb-4" style={{ color: '#2a8c7a' }} />
          <h2
            className="text-gray-900 mb-2 text-center"
            style={{ ...headingStyle, fontSize: 'clamp(1.1rem, 2vw, 1.35rem)' }}
          >
            Mapa de Conhecimento
          </h2>
          <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">
            Selecione um tópico para visualizar seu mapa de conhecimento.
          </p>
          {allTopics.length > 0 ? (
            <div className="relative w-full max-w-xs">
              <select
                value=""
                onChange={(e) => e.target.value && handleTopicSelect(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-full px-4 py-2.5 pr-9 text-sm text-gray-700 shadow-sm hover:border-gray-300 transition-colors"
                style={{ outlineColor: '#2a8c7a' }}
              >
                <option value="">Selecionar tópico...</option>
                {allTopics.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.courseName} — {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              Nenhum tópico disponível. Entre em um curso primeiro.
            </p>
          )}
        </div>
      </FadeIn>
    );
  }

  if (isEmpty) {
    return (
      <FadeIn>
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          <AxonPageHeader
            title="Mapa de Conhecimento"
            subtitle="Visualize seu domínio de cada conceito"
            onBack={() => navigate(-1)}
          />
          <EmptyState
            icon={<Brain className="w-12 h-12 text-[#2a8c7a]" />}
            title="Nenhum conceito encontrado"
            description="Este tópico ainda não possui palavras-chave com conexões. Estude mais para construir seu mapa!"
          />
        </div>
      </FadeIn>
    );
  }

  // ── Main render ─────────────────────────────────────────

  return (
    <FadeIn>
      <div className="flex flex-col h-[calc(100dvh-4rem)] p-3 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex-shrink-0 mb-4">
          <AxonPageHeader
            title="Mapa de Conhecimento"
            subtitle={scope === 'course' ? (currentCourse?.name || 'Todos os tópicos') : (currentTopic?.title || 'Visualize seu domínio')}
            onBack={() => navigate(-1)}
            actionButton={
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
                {/* Scope selector: Topic vs Course */}
                {hasCourseTopics && (
                  <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-200 p-0.5" role="radiogroup" aria-label="Escopo do mapa">
                    <button
                      onClick={() => setScope('topic')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        scope === 'topic'
                          ? 'bg-[#e8f5f1] text-[#2a8c7a]'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      role="radio"
                      aria-checked={scope === 'topic'}
                      aria-label="Visualizar tópico atual"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Tópico</span>
                    </button>
                    <button
                      onClick={() => setScope('course')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        scope === 'course'
                          ? 'bg-[#e8f5f1] text-[#2a8c7a]'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      role="radio"
                      aria-checked={scope === 'course'}
                      aria-label="Visualizar todos os tópicos do curso"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Todos</span>
                    </button>
                  </div>
                )}
                {effectiveTopicId && (
                  <button
                    onClick={() => setAddModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-full shadow-sm transition-colors"
                    style={{ backgroundColor: '#2a8c7a' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Adicionar</span>
                  </button>
                )}
                <button
                  onClick={refetch}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-[#2a8c7a] bg-white rounded-full border border-gray-200 shadow-sm hover:border-[#2a8c7a]/30 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Atualizar</span>
                </button>
              </div>
            }
            statsLeft={
              masteryStats && (
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">
                    {Math.round(masteryStats.avgMastery * 100)}% domínio
                  </span>
                  <span className="hidden sm:inline">{masteryStats.mastered} dominados</span>
                  <span className="hidden sm:inline">{masteryStats.learning} aprendendo</span>
                  <span className="hidden md:inline">{masteryStats.weak} débeis</span>
                </div>
              )
            }
          />
        </div>

        {/* Screen reader search results announcement */}
        {searchQuery.trim() && (
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {matchCount === 0
              ? 'Nenhum conceito encontrado'
              : `${matchCount} conceitos encontrados para "${searchQuery}"`}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex-shrink-0 mb-3">
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
            searchInputRef={searchInputRef}
          />
        </div>

        {/* Mobile mastery legend (hidden on md+, where GraphToolbar legend shows) */}
        {masteryStats && (
          <div className="flex md:hidden items-center gap-3 mb-2 px-2 py-1.5 bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
            {(['green', 'yellow', 'red', 'gray'] as const).map(color => (
              <div key={color} className="flex items-center gap-1 shrink-0">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: MASTERY_HEX[color] }}
                />
                <span className="text-[10px] text-gray-500">
                  {masteryStats[color === 'green' ? 'mastered' : color === 'yellow' ? 'learning' : color === 'red' ? 'weak' : 'noData']}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Graph canvas */}
        <div className="flex-1 min-h-0 relative">
          <ErrorBoundary fallback={
            <div className="w-full h-full min-h-[400px] bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center">
              <p className="text-sm text-gray-400">Erro ao renderizar o grafo. Tente atualizar.</p>
            </div>
          }>
            {filteredGraphData && filteredGraphData.nodes.length > 0 ? (
              <KnowledgeGraph
                data={filteredGraphData}
                onNodeClick={handleNodeClick}
                onNodeRightClick={handleNodeRightClick}
                selectedNodeId={selectedNode?.id}
                layout={layout}
                onReady={(controls) => { graphControlsRef.current = controls; }}
                highlightNodeIds={matchingNodeIds.size > 0 ? matchingNodeIds : undefined}
                onCollapseChange={setCollapsedCount}
              />
            ) : searchQuery.trim() ? (
              <div className="w-full h-full min-h-[280px] bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-1">Nenhum conceito encontrado</p>
                  <p className="text-xs text-gray-300">Tente buscar por outro termo</p>
                </div>
              </div>
            ) : null}
          </ErrorBoundary>

          {/* Annotation modal */}
          <NodeAnnotationModal
            node={annotationNode}
            onClose={() => setAnnotationNode(null)}
            onSaved={refetch}
          />

          {/* Context menu overlay */}
          <NodeContextMenu
            node={contextMenu?.node ?? null}
            position={contextMenu?.position ?? null}
            onAction={handleAction}
            onClose={handleContextMenuClose}
          />

          {/* Selected node detail panel (bottom, responsive) */}
          {selectedNode && !contextMenu && (
            <div
              className="absolute bottom-0 left-0 right-0 sm:left-auto sm:right-4 sm:bottom-4 sm:w-64 bg-white rounded-t-2xl sm:rounded-xl shadow-lg border border-gray-200 p-4 z-10"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
              role="region"
              aria-label={`Detalhes do conceito: ${selectedNode.label}`}
            >
              {/* Mobile drag handle */}
              <div className="flex sm:hidden justify-center -mt-2 mb-2">
                <div className="w-8 h-1 rounded-full bg-gray-300" />
              </div>
              <div className="flex items-start justify-between gap-2">
                <h3
                  className="font-medium text-gray-900 mb-1"
                  style={headingStyle}
                >
                  {selectedNode.label}
                </h3>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 -m-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
                  aria-label="Fechar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {selectedNode.definition && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-3">
                  {selectedNode.definition}
                </p>
              )}
              {selectedNode.annotation && (
                <p className="text-xs text-[#2a8c7a] mb-2 italic line-clamp-2">
                  &ldquo;{selectedNode.annotation}&rdquo;
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400">
                <span>
                  Domínio: {selectedNode.mastery >= 0 ? `${Math.round(selectedNode.mastery * 100)}%` : 'Sem dados'}
                </span>
                {graphData && (
                  <span>
                    {graphData.edges.filter(
                      e => e.source === selectedNode.id || e.target === selectedNode.id
                    ).length} conexões
                  </span>
                )}
                {selectedNode.isUserCreated && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: '#e8f5f1', color: '#2a8c7a' }}>
                    Seu conceito
                  </span>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleAction('flashcard', selectedNode)}
                  className="flex-1 px-2 py-1.5 text-xs font-medium text-[#2a8c7a] bg-[#e8f5f1] rounded-full hover:bg-[#d0ebe6] transition-colors"
                >
                  Flashcards
                </button>
                <button
                  onClick={() => handleAction('quiz', selectedNode)}
                  className="flex-1 px-2 py-1.5 text-xs font-medium text-[#2a8c7a] bg-[#e8f5f1] rounded-full hover:bg-[#d0ebe6] transition-colors"
                >
                  Quiz
                </button>
                <button
                  onClick={() => handleAction('annotate', selectedNode)}
                  className="px-2 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Anotar conceito"
                  title="Anotar"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                {selectedNode.isUserCreated && (
                  <button
                    onClick={() => handleDeleteCustomNode(selectedNode)}
                    className="px-2 py-1.5 text-xs font-medium text-red-500 bg-red-50 rounded-full hover:bg-red-100 transition-colors"
                    aria-label="Apagar conceito personalizado"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add custom node/edge modal */}
        <AddNodeEdgeModal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          topicId={effectiveTopicId}
          existingNodes={graphData?.nodes ?? []}
          onCreated={refetch}
        />
      </div>
    </FadeIn>
  );
}
