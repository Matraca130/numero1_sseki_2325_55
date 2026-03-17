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
import { Brain, Map, RefreshCw, Globe, BookOpen, X, Plus, Trash2, Edit3, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { LoadingPage, EmptyState, ErrorState } from '@/app/components/shared/PageStates';
import { FadeIn } from '@/app/components/shared/FadeIn';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import { useApp } from '@/app/context/AppContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { KnowledgeGraph } from './mindmap/KnowledgeGraph';
import { NodeContextMenu } from './mindmap/NodeContextMenu';
import { NodeAnnotationModal } from './mindmap/NodeAnnotationModal';
import { GraphToolbar } from './mindmap/GraphToolbar';
import { useGraphData } from './mindmap/useGraphData';
import { useGraphSearch } from './mindmap/useGraphSearch';
import { AddNodeEdgeModal } from './mindmap/AddNodeEdgeModal';
import { deleteCustomNode } from '@/app/services/mindmapApi';
import { useSwipeDismiss } from './mindmap/useSwipeDismiss';
import { useSearchFocus } from './mindmap/useSearchFocus';
import { useGraphControls } from './mindmap/useGraphControls';
import { ConfirmDialog } from './mindmap/ConfirmDialog';
import type { MapNode, NodeAction, GraphControls } from '@/app/types/mindmap';
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

  // Scope: single topic vs all topics in course
  const [scope, setScopeRaw] = useState<GraphScope>('topic');

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

  // Search (shared hook: debounce + filter + highlight)
  // Must be declared before handlers that call setSearchQuery
  const {
    searchQuery, setSearchQuery,
    matchingNodeIds, filteredGraphData,
    matchCount, nodeCount, edgeCount,
  } = useGraphSearch(graphData);

  const handleTopicSelect = useCallback((tid: string) => {
    setManualTopicId(tid);
    setSearchParams(tid ? { topicId: tid } : {});
    setSelectedNode(null);
    setContextMenu(null);
    setSearchQuery('');
  }, [setSearchParams, setSearchQuery]);

  // Clear selection when topicId changes (e.g. from context navigation)
  const prevTopicIdRef = useRef(topicId);
  useEffect(() => {
    if (prevTopicIdRef.current !== topicId) {
      prevTopicIdRef.current = topicId;
      setSelectedNode(null);
      setContextMenu(null);
      setCollapsedCount(0);
      setCollapsedNodeIds(new Set());
    }
  }, [topicId]);

  const setScope = useCallback((s: GraphScope) => {
    setScopeRaw(s);
    setSearchQuery('');
    setSelectedNode(null);
    setContextMenu(null);
    setCollapsedCount(0);
    setCollapsedNodeIds(new Set());
  }, [setSearchQuery]);

  // UI state
  const [layout, setLayout] = useState<'force' | 'radial' | 'dagre'>('force');

  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    node: MapNode;
    position: { x: number; y: number };
  } | null>(null);
  const [annotationNode, setAnnotationNode] = useState<MapNode | null>(null);
  const [collapsedCount, setCollapsedCount] = useState(0);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const graphControlsRef = useRef<GraphControls | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // First-visit onboarding tip
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem('axon_map_onboarded'); } catch { return false; }
  });
  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    try { localStorage.setItem('axon_map_onboarded', '1'); } catch {}
  }, []);

  // Stable callbacks for KnowledgeGraph (avoids unnecessary child re-renders)
  const handleGraphReady = useCallback((controls: GraphControls) => {
    graphControlsRef.current = controls;
  }, []);
  const handleCollapseChange = useCallback((count: number, ids: Set<string>) => {
    setCollapsedCount(count);
    setCollapsedNodeIds(ids);
  }, []);

  // Navigate with a brief fade-out transition
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => { clearTimeout(fadeTimerRef.current); }, []);
  const navigateWithFade = useCallback((to: string) => {
    clearTimeout(fadeTimerRef.current);
    setExiting(true);
    fadeTimerRef.current = setTimeout(() => navigate(to), 150);
  }, [navigate]);

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
        navigateWithFade(`/student/flashcards?keywordId=${node.id}`);
        break;
      case 'quiz':
        navigateWithFade(`/student/quizzes?keywordId=${node.id}`);
        break;
      case 'summary':
        if (node.topicId) {
          const summaryParam = node.summaryId ? `?summaryId=${node.summaryId}` : '';
          navigateWithFade(`/student/summary/${node.topicId}${summaryParam}`);
        }
        break;
      case 'annotate':
        setAnnotationNode(node);
        break;
      case 'details':
        setSelectedNode(node);
        break;
    }
  }, [navigateWithFade]);

  const { handleZoomIn, handleZoomOut, handleFitView, handleCollapseAll, handleExpandAll } = useGraphControls(graphControlsRef);

  const [confirmDeleteNode, setConfirmDeleteNode] = useState<MapNode | null>(null);

  const handleDeleteCustomNode = useCallback(async (node: MapNode) => {
    if (!node.isUserCreated) return;
    setConfirmDeleteNode(node);
  }, []);

  const executeDeleteNode = useCallback(async () => {
    if (!confirmDeleteNode) return;
    try {
      await deleteCustomNode(confirmDeleteNode.id);
      setSelectedNode(null);
      setConfirmDeleteNode(null);
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao apagar conceito');
      setConfirmDeleteNode(null);
    }
  }, [confirmDeleteNode, refetch]);

  // Swipe-to-dismiss for mobile bottom sheet
  const dismissSelected = useCallback(() => setSelectedNode(null), []);
  const { onTouchStart: handleSheetTouchStart, onTouchEnd: handleSheetTouchEnd } = useSwipeDismiss(dismissSelected);

  // Ctrl+F / '/' → focus search input
  useSearchFocus(searchInputRef);

  // Set of node IDs that have children (for collapse/expand in context menu)
  const nodesWithChildren = useMemo(() => {
    if (!graphData) return new Set<string>();
    return new Set(graphData.edges.map(e => e.source).filter(Boolean));
  }, [graphData]);

  // Effective topicId for custom node creation
  const effectiveTopicId = topicId || courseTopicIds[0] || '';

  // ── Derived data ────────────────────────────────────────

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

  // Course scope with no data (no graphData or empty)
  if (scope === 'course' && !loading && (!graphData || graphData.nodes.length === 0)) {
    return (
      <FadeIn>
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          <AxonPageHeader
            title="Mapa de Conhecimento"
            subtitle={currentCourse?.name || 'Todos os tópicos'}
            onBack={() => navigate(-1)}
          />
          <EmptyState
            icon={<Globe className="w-12 h-12 text-[#2a8c7a] animate-pulse" />}
            title="Nenhum conceito no curso"
            description={courseTopicIds.length === 0
              ? 'Este curso não possui tópicos. Acesse um curso com conteúdo primeiro.'
              : 'Os tópicos deste curso ainda não possuem conceitos mapeados. Estude mais para construir seu mapa!'}
          />
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
            icon={<Brain className="w-12 h-12 text-[#2a8c7a] animate-pulse" />}
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
      <div
        className="flex flex-col h-[calc(100dvh-4rem)] p-3 sm:p-6 lg:p-8 transition-opacity duration-150"
        style={{ opacity: exiting ? 0 : 1 }}
      >
        {/* Header */}
        <div className="flex-shrink-0 mb-4">
          <AxonPageHeader
            title="Mapa de Conhecimento"
            subtitle={scope === 'course' ? (currentCourse?.name || 'Todos os tópicos') : (currentTopic?.title || 'Visualize seu domínio')}
            onBack={() => navigate(-1)}
            actionButton={
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
                {/* Topic switcher */}
                {allTopics.length > 1 && scope === 'topic' && (
                  <div className="relative">
                    <select
                      value={topicId || ''}
                      onChange={(e) => e.target.value && handleTopicSelect(e.target.value)}
                      className="appearance-none bg-white border border-gray-200 rounded-full pl-3 pr-7 py-1.5 text-xs text-gray-600 shadow-sm hover:border-gray-300 transition-colors max-w-[160px] sm:max-w-[220px] truncate"
                      style={{ outlineColor: '#2a8c7a' }}
                      aria-label="Selecionar tópico"
                    >
                      {allTopics.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                  </div>
                )}
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
                {effectiveTopicId && scope === 'topic' && (
                  <button
                    onClick={() => setAddModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-full shadow-sm transition-colors"
                    style={{ backgroundColor: '#2a8c7a' }}
                    aria-label="Adicionar conceito ao mapa"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Adicionar</span>
                  </button>
                )}
                <button
                  onClick={refetch}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-[#2a8c7a] bg-white rounded-full border border-gray-200 shadow-sm hover:border-[#2a8c7a]/30 transition-colors"
                  aria-label="Atualizar mapa"
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
                  <span className="hidden md:inline">{masteryStats.weak} fracos</span>
                </div>
              )
            }
          />
        </div>

        {/* Screen reader search results announcement (persistent DOM node for reliable aria-live) */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {searchQuery.trim()
            ? matchCount === 0
              ? 'Nenhum conceito encontrado'
              : `${matchCount} conceitos encontrados para "${searchQuery}"`
            : ''}
        </div>

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
            searchInputRef={searchInputRef}
          />
        </div>

        {/* Mobile mastery legend (hidden on md+, where GraphToolbar legend shows) */}
        {masteryStats && (
          <div className="flex md:hidden items-center gap-3 mb-2 px-2 py-1.5 bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {(['green', 'yellow', 'red', 'gray'] as const).map(color => {
              const key = color === 'green' ? 'mastered' : color === 'yellow' ? 'learning' : color === 'red' ? 'weak' : 'noData';
              const label = color === 'green' ? 'Dominados' : color === 'yellow' ? 'Aprendendo' : color === 'red' ? 'Fracos' : 'Sem dados';
              return (
                <div key={color} className="flex items-center gap-1 shrink-0" title={label}>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: MASTERY_HEX[color] }}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] text-gray-500" aria-label={`${masteryStats[key]} ${label}`}>
                    {masteryStats[key]}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Graph canvas */}
        <div className="flex-1 min-h-0 relative">
          <ErrorBoundary fallback={
            <div className="w-full h-full min-h-[180px] sm:min-h-[300px] bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center">
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
                onReady={handleGraphReady}
                highlightNodeIds={matchingNodeIds.size > 0 ? matchingNodeIds : undefined}
                onCollapseChange={handleCollapseChange}
              />
            ) : searchQuery.trim() ? (
              <div className="w-full h-full min-h-[180px] sm:min-h-[280px] bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-1">Nenhum conceito encontrado</p>
                  <p className="text-xs text-gray-400">Tente buscar por outro termo</p>
                </div>
              </div>
            ) : null}
          </ErrorBoundary>

          {/* First-visit onboarding tips */}
          {showOnboarding && !loading && !isEmpty && filteredGraphData && filteredGraphData.nodes.length > 0 && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 rounded-2xl">
              <div className="bg-white rounded-2xl shadow-xl p-5 mx-4 max-w-sm w-full">
                <h3 className="font-medium text-gray-900 mb-3" style={headingStyle}>
                  Bem-vindo ao Mapa de Conhecimento!
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 mb-4">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#e8f5f1] text-[#2a8c7a] flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                    <span>Toque em um conceito para ver flashcards, quiz e resumo.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#e8f5f1] text-[#2a8c7a] flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                    <span>As cores indicam seu domínio: verde = dominado, amarelo = aprendendo, vermelho = fraco.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#e8f5f1] text-[#2a8c7a] flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                    <span>Pinça para zoom, arraste para mover. Use a barra de busca para encontrar conceitos.</span>
                  </li>
                </ul>
                <button
                  onClick={dismissOnboarding}
                  className="w-full px-4 py-2.5 text-sm font-medium text-white rounded-full transition-colors"
                  style={{ backgroundColor: '#2a8c7a' }}
                >
                  Entendi!
                </button>
              </div>
            </div>
          )}

          {/* Annotation modal — rendered outside overflow context via fixed positioning */}
          <NodeAnnotationModal
            node={annotationNode}
            onClose={() => setAnnotationNode(null)}
            onSaved={refetch}
          />

          {/* Context menu overlay — uses fixed positioning, safe outside overflow */}
          <NodeContextMenu
            node={contextMenu?.node ?? null}
            position={contextMenu?.position ?? null}
            onAction={handleAction}
            onClose={handleContextMenuClose}
            hasChildren={contextMenu?.node ? nodesWithChildren.has(contextMenu.node.id) : false}
            isCollapsed={contextMenu?.node ? collapsedNodeIds.has(contextMenu.node.id) : false}
            onToggleCollapse={contextMenu?.node ? () => graphControlsRef.current?.toggleCollapse(contextMenu.node.id) : undefined}
          />

          {/* Selected node detail panel (bottom sheet on mobile, floating card on desktop) */}
          {selectedNode && !contextMenu && (
            <div
              className="absolute bottom-0 left-0 right-0 sm:left-auto sm:right-4 sm:bottom-4 sm:w-64 bg-white rounded-t-2xl sm:rounded-xl shadow-lg border border-gray-200 p-4 z-10 max-h-[55dvh] overflow-y-auto"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
              role="region"
              aria-label={`Detalhes do conceito: ${selectedNode.label}`}
              onTouchStart={handleSheetTouchStart}
              onTouchEnd={handleSheetTouchEnd}
            >
              {/* Mobile drag handle — swipe down to dismiss */}
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
                  className="p-3 -mr-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
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
                  Domínio: {Number.isFinite(selectedNode.mastery) && selectedNode.mastery >= 0 ? `${Math.round(selectedNode.mastery * 100)}%` : 'Sem dados'}
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
              <div className="flex gap-1.5 sm:gap-2 mt-3">
                <button
                  onClick={() => handleAction('flashcard', selectedNode)}
                  className="flex-1 min-w-0 px-2 sm:px-3 py-3 sm:py-2 text-xs font-medium text-[#2a8c7a] bg-[#e8f5f1] rounded-full hover:bg-[#d0ebe6] transition-colors truncate"
                >
                  Flashcards
                </button>
                <button
                  onClick={() => handleAction('quiz', selectedNode)}
                  className="flex-1 min-w-0 px-2 sm:px-3 py-3 sm:py-2 text-xs font-medium text-[#2a8c7a] bg-[#e8f5f1] rounded-full hover:bg-[#d0ebe6] transition-colors truncate"
                >
                  Quiz
                </button>
                <button
                  onClick={() => handleAction('annotate', selectedNode)}
                  className="px-3 py-3 sm:py-2 text-xs font-medium text-gray-500 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                  aria-label="Anotar conceito"
                  title="Anotar"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                {selectedNode.isUserCreated && (
                  <button
                    onClick={() => handleDeleteCustomNode(selectedNode)}
                    className="px-3 py-3 sm:py-2 text-xs font-medium text-red-500 bg-red-50 rounded-full hover:bg-red-100 transition-colors flex-shrink-0"
                    aria-label="Apagar conceito personalizado"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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

        {/* Delete confirmation dialog (replaces window.confirm for PWA compatibility) */}
        {confirmDeleteNode && (
          <ConfirmDialog
            title="Apagar conceito?"
            description={`\u201c${confirmDeleteNode.label}\u201d será removido do seu mapa. Esta ação não pode ser desfeita.`}
            cancelLabel="Cancelar"
            confirmLabel="Apagar"
            onCancel={() => setConfirmDeleteNode(null)}
            onConfirm={executeDeleteNode}
          />
        )}
      </div>
    </FadeIn>
  );
}

