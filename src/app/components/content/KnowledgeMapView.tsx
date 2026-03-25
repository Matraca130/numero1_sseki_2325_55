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
//
// Edge/node CRUD callbacks are in useMapEdgeActions / useMapNodeActions.
// Empty/loading states are in MapViewEmptyStates.
// ============================================================

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import { useNavigate, useSearchParams } from 'react-router';
import { Brain, Map as MapIcon, RefreshCw, Globe, X, Trash2, ChevronDown, Link2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { MoreActionsDropdown } from './mindmap/MoreActionsDropdown';
import { GraphSidebar } from './mindmap/GraphSidebar';
import { useCountUp } from '@/app/hooks/useCountUp';
import { FadeIn } from '@/app/components/shared/FadeIn';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import { useApp } from '@/app/context/AppContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { KnowledgeGraph } from './mindmap/KnowledgeGraph';
import { NodeContextMenu } from './mindmap/NodeContextMenu';
import { NodeAnnotationModal } from './mindmap/NodeAnnotationModal';
import { useGraphData } from './mindmap/useGraphData';
import { useGraphSearch } from './mindmap/useGraphSearch';
import { AddNodeEdgeModal } from './mindmap/AddNodeEdgeModal';
import { useSearchFocus } from './mindmap/useSearchFocus';
import { useGraphControls } from './mindmap/useGraphControls';
import { ConfirmDialog } from './mindmap/ConfirmDialog';
import { useFullscreen } from './mindmap/useFullscreen';
import { MapToolsPanel } from './mindmap/MapToolsPanel';
import { AiTutorPanel } from './mindmap/AiTutorPanel';
import { useUndoRedo } from './mindmap/useUndoRedo';
import { PresentationMode } from './mindmap/PresentationMode';
import { ChangeHistoryPanel } from './mindmap/ChangeHistoryPanel';
import { ShareMapModal } from './mindmap/ShareMapModal';
import { MapComparisonPanel } from './mindmap/MapComparisonPanel';
import { StickyNotesLayer } from './mindmap/StickyNote';
import { loadHistory, saveHistory, clearHistoryStorage } from './mindmap/changeHistoryHelpers';
import type { HistoryEntry } from './mindmap/changeHistoryHelpers';
import { useMapUIState } from './mindmap/useMapUIState';
import { useMapToolState } from './mindmap/useMapToolState';
import { useMapStickyNotes } from './mindmap/useMapStickyNotes';
import { useMapNodeColors } from './mindmap/useMapNodeColors';
import { useMapEdgeActions } from './mindmap/useMapEdgeActions';
import { useMapNodeActions } from './mindmap/useMapNodeActions';
import {
  MapViewLoadingSkeleton,
  MapViewError,
  NoTopicSelected,
  CourseScopeEmpty,
  TopicEmpty,
  GraphErrorFallback,
  AllCollapsedHint,
  SearchNoResults,
} from './mindmap/MapViewEmptyStates';
import type { MapNode, NodeAction, GraphControls } from '@/app/types/mindmap';
import { headingStyle } from '@/app/design-system';
import { getSafeMasteryColor } from '@/app/lib/mastery-helpers';
import { I18N_MAP_VIEW } from './mindmap/mapViewI18n';
import type { GraphLocale } from './mindmap/graphI18n';

/** Haptic feedback for mobile — no-op when Vibration API is unavailable. */
const haptic = (ms = 50) => navigator?.vibrate?.(ms);
/** Stable empty array to avoid creating new reference on every render. */
const EMPTY_NODES: MapNode[] = [];

// ── Component ───────────────────────────────────────────────

type GraphScope = 'topic' | 'course';

export function KnowledgeMapView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentTopic, currentCourse } = useApp();
  const { tree } = useContentTree();

  // ── I18N ─────────────────────────────────────────────────
  const locale: GraphLocale = 'pt';
  const t = I18N_MAP_VIEW[locale];

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
              name: topic.name || t.untitled,
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

  // Stable refs for graphData — avoids recreating callbacks on every fetch
  const graphDataNodesRef = useRef(graphData?.nodes);
  graphDataNodesRef.current = graphData?.nodes;
  const graphDataEdgesRef = useRef(graphData?.edges);
  graphDataEdgesRef.current = graphData?.edges;

  // Undo/redo history for custom node/edge actions
  const { pushAction, clearHistory, undo, redo, canUndo, canRedo, busy: undoBusy } = useUndoRedo(refetch);

  // Search (shared hook: debounce + filter + highlight)
  // Must be declared before handlers that call setSearchQuery
  const {
    searchQuery, setSearchQuery,
    matchingNodeIds, filteredGraphData,
    matchCount, nodeCount, edgeCount,
  } = useGraphSearch(graphData);

  // Mastery filter state — declared before the useMemo that depends on it
  const [masteryFilter, setMasteryFilter] = useState<import('@/app/lib/mastery-helpers').MasteryColor | null>(null);

  // Mastery filter: compute set of node IDs matching the selected mastery level
  const masteryFilterNodeIds = useMemo(() => {
    if (!masteryFilter || !graphData) return undefined;
    const ids = new Set<string>();
    for (const node of graphData.nodes) {
      if (getSafeMasteryColor(node.mastery) === masteryFilter) ids.add(node.id);
    }
    return ids.size > 0 ? ids : undefined;
  }, [masteryFilter, graphData]);

  const handleTopicSelect = useCallback((tid: string) => {
    setManualTopicId(tid);
    setSearchParams(tid ? { topicId: tid } : {});
    setSelectedNode(null);
    setContextMenu(null);
    setSearchQuery('');
  }, [setSearchParams, setSearchQuery]);

  // Clear selection + stale state when topicId changes (e.g. from context navigation)
  const prevTopicIdRef = useRef(topicId);
  useEffect(() => {
    if (prevTopicIdRef.current !== topicId) {
      prevTopicIdRef.current = topicId;
      setSelectedNode(null);
      setContextMenu(null);
      setCollapsedCount(0);
      setCollapsedNodeIds(new Set());
      clearHistory();
      // Reset stale AI/panel/connect state from previous topic
      setAiHighlightNodes(undefined);
      setAiReviewNodes(undefined);
      setConnectSource(null);
      setConnectTarget(null);
      setConfirmDeleteNode(null);
      setAnnotationNode(null);
      setShowAiPanel(false);
      setShowHistory(false);
      setShowComparison(false);
      setPresentationMode(false);
      setActiveTool('pointer');
      setMasteryFilter(null);
    }
  }, [topicId, clearHistory]);

  const setScope = useCallback((s: GraphScope) => {
    setScopeRaw(s);
    setSearchQuery('');
    setSelectedNode(null);
    setContextMenu(null);
    setCollapsedCount(0);
    setCollapsedNodeIds(new Set());
    setConnectSource(null);
    setAnnotationNode(null);
    setActiveTool('pointer');
  }, [setSearchQuery]);

  // ── Extracted state hooks ────────────────────────────────
  const ui = useMapUIState();
  const {
    showAiPanel, showHistory, showComparison, presentationMode, showShareModal, showOnboarding,
    zoomLevel, showMinimap, aiHighlightNodes, aiReviewNodes,
    toggleAiPanel, toggleHistory, toggleComparison, toggleMinimap,
    setShowAiPanel, setShowHistory, setShowComparison, setPresentationMode, setShowShareModal,
    setZoomLevel, setAiHighlightNodes, setAiReviewNodes,
    dismissOnboarding, showOnboardingRef,
  } = ui;

  const tools = useMapToolState(showOnboardingRef, t);
  const {
    activeTool, setActiveTool, activeToolRef,
    connectSource, setConnectSource, connectSourceRef,
    connectTarget, setConnectTarget,
    confirmDeleteNode, setConfirmDeleteNode,
    annotationNode, setAnnotationNode,
    handleToolChange,
  } = tools;

  // UI state (remaining top-level)
  const [layout, setLayout] = useState<'force' | 'radial' | 'dagre'>('force');
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    node: MapNode;
    position: { x: number; y: number };
  } | null>(null);
  const [collapsedCount, setCollapsedCount] = useState(0);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  const graphControlsRef = useRef<GraphControls | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const { isFullscreen, toggleFullscreen, fullscreenRef } = useFullscreen();

  // Stable callbacks for KnowledgeGraph (avoids unnecessary child re-renders)
  const handleGraphReady = useCallback((controls: GraphControls) => {
    graphControlsRef.current = controls;
  }, []);
  const handleCollapseChange = useCallback((count: number, ids: Set<string>) => {
    setCollapsedCount(count);
    setCollapsedNodeIds(ids);
  }, []);

  // Navigate with a brief fade-out transition
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => { clearTimeout(fadeTimerRef.current); }, []);
  const navigateWithFade = useCallback((to: string) => {
    clearTimeout(fadeTimerRef.current);
    setExiting(true);
    fadeTimerRef.current = setTimeout(() => navigate(to), 150);
  }, [navigate]);

  // Effective topicId for custom node creation and navigation fallback
  const effectiveTopicId = topicId || courseTopicIds[0] || '';

  // ── Extracted edge/node action hooks ────────────────────
  const {
    handleEdgeReconnect,
    handleQuickAdd,
    handleDragConnect,
    handleEdgeCreated,
    reconnectingRef,
  } = useMapEdgeActions({
    effectiveTopicId,
    graphDataNodesRef,
    graphDataEdgesRef,
    mountedRef,
    pushAction,
    refetch,
    setConnectSource,
    setConnectTarget,
    setAddModalOpen,
    setHistoryEntries,
    t,
  });

  const {
    handleDeleteCustomNode,
    executeDeleteNode,
    handleNodeCreated,
    deletingNodeRef,
  } = useMapNodeActions({
    effectiveTopicId,
    mountedRef,
    confirmDeleteNode,
    setConfirmDeleteNode,
    setSelectedNode,
    setContextMenu,
    setConnectSource,
    setAnnotationNode,
    pushAction,
    refetch,
    setHistoryEntries,
    t,
  });

  // ── Handlers ────────────────────────────────────────────

  const handleNodeClick = useCallback((node: MapNode | null, position?: { x: number; y: number }) => {
    const tool = activeToolRef.current;
    const source = connectSourceRef.current;
    if (!node) {
      setSelectedNode(null);
      setContextMenu(null);
      // Cancel connect mode on canvas click
      if (tool === 'connect' && source) {
        setConnectSource(null);
        setConnectTarget(null);
        toast.info(t.connectionCancelled);
      }
      // In add-node mode, clicking canvas opens the add modal
      if (tool === 'add-node') {
        setAddModalOpen(true);
        setActiveTool('pointer');
      }
      return;
    }
    // Tool-specific node click behavior
    switch (tool) {
      case 'annotate':
        setAnnotationNode(node);
        setActiveTool('pointer');
        return;
      case 'delete':
        if (node.isUserCreated) {
          setConfirmDeleteNode(node);
          setActiveTool('pointer');
        } else {
          toast.error(t.deleteOnlyUserCreated);
        }
        return;
      case 'connect':
        if (!source) {
          // First click: select source
          setConnectSource(node);
          toast.info(t.connectSourceSelected(node.label));
        } else if (source.id === node.id) {
          // Clicked same node: cancel
          setConnectSource(null);
          setConnectTarget(null);
          toast.info(t.connectionCancelled);
        } else {
          // Second click: open modal pre-filled with source→target
          setConnectTarget(node);
          setAddModalOpen(true);
          setActiveTool('pointer');
        }
        return;
      default: {
        setSelectedNode(node);
        const rawPos = position ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const clampedPos = {
          x: Math.min(rawPos.x, window.innerWidth - 250),
          y: Math.min(rawPos.y, window.innerHeight - 300),
        };
        setContextMenu({ node, position: clampedPos });
        haptic(10);
        break;
      }
    }
  }, []);

  const handleNodeRightClick = useCallback((node: MapNode, position: { x: number; y: number }) => {
    haptic(30);
    const clampedPos = {
      x: Math.min(position.x, window.innerWidth - 250),
      y: Math.min(position.y, window.innerHeight - 300),
    };
    setContextMenu({ node, position: clampedPos });
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Stable callback for toggling collapse from context menu — avoids IIFE in JSX
  const contextMenuRef = useRef(contextMenu);
  contextMenuRef.current = contextMenu;
  const handleToggleCollapse = useCallback(() => {
    const id = contextMenuRef.current?.node?.id;
    if (id) graphControlsRef.current?.toggleCollapse(id);
  }, []);

  // Load history from sessionStorage when topic changes
  useEffect(() => {
    if (effectiveTopicId) setHistoryEntries(loadHistory(effectiveTopicId));
  }, [effectiveTopicId]);
  // Persist history entries to sessionStorage
  useEffect(() => {
    if (effectiveTopicId && historyEntries.length > 0) saveHistory(effectiveTopicId, historyEntries);
  }, [effectiveTopicId, historyEntries]);

  // ── Sticky notes (extracted hook) ─────────────────────────
  const { stickyNotes, setStickyNotes, handleAddStickyNote } = useMapStickyNotes(effectiveTopicId, t);

  // ── Custom node colors (extracted hook) ──────────────────
  const { customNodeColors, handleNodeColorChange } = useMapNodeColors(effectiveTopicId);

  const handleAction = useCallback((action: NodeAction, node: MapNode) => {
    setContextMenu(null);

    switch (action) {
      case 'flashcard':
        navigateWithFade(`/student/flashcards?keywordId=${node.id}`);
        break;
      case 'quiz':
        navigateWithFade(`/student/quizzes?keywordId=${node.id}`);
        break;
      case 'summary': {
        const tid = node.topicId || effectiveTopicId;
        if (tid) {
          const summaryParam = node.summaryId ? `?summaryId=${node.summaryId}` : '';
          navigateWithFade(`/student/summary/${tid}${summaryParam}`);
        }
        break;
      }
      case 'connect':
        setConnectSource(node);
        setActiveTool('connect');
        toast.info(t.connectSourceSelected(node.label));
        break;
      case 'annotate':
        setAnnotationNode(node);
        break;
      case 'details':
        setSelectedNode(node);
        break;
    }
  }, [navigateWithFade, effectiveTopicId]);

  const { handleZoomIn, handleZoomOut, handleFitView, handleResetZoom, handleCollapseAll, handleExpandAll, handleExportPNG, handleExportJPEG } = useGraphControls(graphControlsRef);

  const handlePresentationFocus = useCallback((nodeId: string) => {
    graphControlsRef.current?.focusNode?.(nodeId);
  }, []);

  // Ctrl+F / '/' → focus search input
  useSearchFocus(searchInputRef);

  // Set of node IDs that have children (for collapse/expand in context menu)
  const nodesWithChildren = useMemo(() => {
    if (!graphData) return new Set<string>();
    return new Set(graphData.edges.map(e => e.source).filter(Boolean));
  }, [graphData]);

  // Node ID→label map for AI suggestions display
  const nodeLabels = useMemo(() => {
    if (!graphData) return new Map<string, string>();
    return new Map(graphData.nodes.map(n => [n.id, n.label]));
  }, [graphData]);

  // Memoized ID arrays for AiTutorPanel (avoids new refs every render)
  const existingNodeIds = useMemo(
    () => graphData?.nodes.map(n => n.id),
    [graphData?.nodes],
  );
  const existingEdgeIds = useMemo(
    () => graphData?.edges.map(e => e.id),
    [graphData?.edges],
  );

  // Stable callbacks for panel props (avoids inline closures causing re-renders)
  const graphDataRef = useRef(graphData);
  graphDataRef.current = graphData;

  const handleAiPanelClose = useCallback(() => {
    setShowAiPanel(false);
    setAiHighlightNodes(undefined);
    setAiReviewNodes(undefined);
  }, []);

  const handleComparisonClose = useCallback(() => {
    setShowComparison(false);
    setAiHighlightNodes(undefined);
  }, []);

  const handleHistoryClose = useCallback(() => setShowHistory(false), []);
  const handleHistoryClear = useCallback(() => {
    setHistoryEntries([]);
    clearHistoryStorage(effectiveTopicId);
  }, [effectiveTopicId]);

  const handleNavigateToAction = useCallback((kwId: string, action: string) => {
    if (action === 'flashcard' || action === 'review') navigateWithFade(`/student/flashcards?keywordId=${kwId}`);
    else if (action === 'quiz') navigateWithFade(`/student/quizzes?keywordId=${kwId}`);
    else if (action === 'summary') {
      const matchNode = graphDataRef.current?.nodes.find(n => n.id === kwId);
      const sParam = matchNode?.summaryId ? `?summaryId=${matchNode.summaryId}` : '';
      navigateWithFade(`/student/summary/${effectiveTopicId}${sParam}`);
    }
  }, [navigateWithFade, effectiveTopicId]);

  const handleComparisonNavigate = useCallback((kwId: string, action: string) => {
    if (action === 'flashcard') navigateWithFade(`/student/flashcards?keywordId=${kwId}`);
    else if (action === 'quiz') navigateWithFade(`/student/quizzes?keywordId=${kwId}`);
  }, [navigateWithFade]);

  const handleAddModalClose = useCallback(() => {
    setAddModalOpen(false);
    setConnectSource(null);
    setConnectTarget(null);
  }, []);

  // ── Derived data ────────────────────────────────────────

  const masteryStats = useMemo(() => {
    if (!graphData) return null;
    const nodes = graphData.nodes;
    const total = nodes.length;
    if (total === 0) return null;

    let mastered = 0, learning = 0, weak = 0, noData = 0, masterySum = 0, masteryCount = 0;
    for (const n of nodes) {
      if (n.masteryColor === 'green') mastered++;
      else if (n.masteryColor === 'yellow') learning++;
      else if (n.masteryColor === 'red') weak++;
      else noData++;
      if (n.mastery >= 0) { masterySum += n.mastery; masteryCount++; }
    }
    const avgMastery = masteryCount > 0 ? masterySum / masteryCount : 0;

    return { total, mastered, learning, weak, noData, avgMastery };
  }, [graphData]);


  // Animated mastery percentage (count-up effect, respects reduced-motion)
  const targetPct = masteryStats ? Math.round(masteryStats.avgMastery * 100) : 0;
  const displayPct = useCountUp(targetPct, 800);

  // ── Render states ───────────────────────────────────────

  if (loading) return <MapViewLoadingSkeleton />;

  if (error) return <MapViewError message={error} onRetry={refetch} />;

  if (!topicId && !summaryId && scope !== 'course') {
    return <NoTopicSelected allTopics={allTopics} onTopicSelect={handleTopicSelect} t={t} />;
  }

  // Course scope with no data (no graphData or empty)
  if (scope === 'course' && !loading && (!graphData || graphData.nodes.length === 0)) {
    return (
      <CourseScopeEmpty
        courseName={currentCourse?.name}
        courseTopicIds={courseTopicIds}
        onBack={() => navigate(-1)}
        t={t}
      />
    );
  }

  if (isEmpty) {
    return <TopicEmpty onBack={() => navigate(-1)} t={t} />;
  }

  // ── Main render ─────────────────────────────────────────

  return (
    <FadeIn>
      <div
        ref={fullscreenRef}
        className={`flex flex-col transition-opacity duration-150 ${
          isFullscreen
            ? 'fixed inset-0 z-50 bg-[#F0F2F5] p-3 sm:p-6'
            : 'h-[calc(100dvh-4rem)] p-3 sm:p-6 lg:p-8'
        }`}
        style={{ opacity: exiting ? 0 : 1 }}
      >
        {/* Screen reader search results announcement */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {searchQuery.trim()
            ? matchCount === 0
              ? t.srNoResults
              : t.srResultsFound(matchCount, searchQuery)
            : ''}
        </div>

        {/* Graph canvas — fills entire container, controls float on top */}
        <div className="flex-1 min-h-0 relative">

          {/* ── Unified toolbar (top, full width) ── */}
          <div className={`absolute top-3 right-3 z-20 ${isFullscreen ? 'left-3' : 'left-3 sm:left-14'}`}>
            <ErrorBoundary fallback={() => null}>
              <GraphSidebar
                onBack={() => navigate(-1)}
                topicName={scope === 'course' ? (currentCourse?.name || t.allTopics) : (currentTopic?.title || t.mapFallbackLabel)}
                topicOptions={allTopics.length > 1 && scope === 'topic' ? allTopics : undefined}
                selectedTopicId={topicId || ''}
                onTopicChange={handleTopicSelect}
                masteryPct={masteryStats ? displayPct : undefined}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                matchCount={searchQuery.trim() ? matchCount : undefined}
                nodeCount={nodeCount}
                searchInputRef={searchInputRef}
                layout={layout}
                onLayoutChange={setLayout}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onFitView={handleFitView}
                onResetZoom={handleResetZoom}
                zoomLevel={zoomLevel}
                onCollapseAll={handleCollapseAll}
                onExpandAll={handleExpandAll}
                collapsedCount={collapsedCount}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={() => { undo(); haptic(30); }}
                onRedo={() => { redo(); haptic(30); }}
                undoBusy={undoBusy}
                deletingNode={deletingNodeRef.current}
                reconnecting={reconnectingRef.current}
                scope={scope}
                onScopeChange={setScope}
                hasCourseTopics={hasCourseTopics}
                onAddConcept={() => setAddModalOpen(true)}
                canAdd={!!(effectiveTopicId && scope === 'topic')}
                showAiPanel={showAiPanel}
                onToggleAi={toggleAiPanel}
                onExportPNG={handleExportPNG}
                onExportJPEG={handleExportJPEG}
                showMinimap={showMinimap}
                onMinimapToggle={toggleMinimap}
                masteryFilter={masteryFilter}
                onMasteryFilterChange={setMasteryFilter}
                edgeCount={edgeCount}
                isFullscreen={isFullscreen}
                onExitFullscreen={toggleFullscreen}
                moreActionsSlot={
                  <MoreActionsDropdown
                    onToggleHistory={toggleHistory}
                    onTogglePresentation={() => setPresentationMode(true)}
                    onToggleShare={() => setShowShareModal(true)}
                    onToggleComparison={toggleComparison}
                    onToggleFullscreen={toggleFullscreen}
                    onRefresh={refetch}
                    onAddStickyNote={handleAddStickyNote}
                    historyActive={showHistory}
                    comparisonActive={showComparison}
                    canPresent={!!(filteredGraphData && filteredGraphData.nodes.length > 0)}
                    canShare={!!effectiveTopicId}
                    canAddNote={!!effectiveTopicId}
                    isFullscreen={isFullscreen}
                    stickyNoteCount={stickyNotes.length}
                  />
                }
              />
            </ErrorBoundary>
          </div>

          {/* Floating tool palette — horizontal bottom bar on mobile, vertical left on desktop */}
          <ErrorBoundary fallback={() => null}>
            <MapToolsPanel
              activeTool={activeTool}
              onToolChange={handleToolChange}
              visible={!loading && !!filteredGraphData && filteredGraphData.nodes.length > 0}
            />
          </ErrorBoundary>
          <ErrorBoundary fallback={(_err, reset) => <GraphErrorFallback reset={reset} t={t} />}>
            {filteredGraphData && filteredGraphData.nodes.length > 0 ? (
              <KnowledgeGraph
                data={filteredGraphData}
                onNodeClick={handleNodeClick}
                onNodeRightClick={handleNodeRightClick}
                selectedNodeId={selectedNode?.id}
                layout={layout}
                onReady={handleGraphReady}
                highlightNodeIds={matchingNodeIds.size > 0 ? matchingNodeIds : masteryFilterNodeIds ?? aiHighlightNodes}
                onCollapseChange={handleCollapseChange}
                reviewNodeIds={aiReviewNodes}
                topicId={effectiveTopicId}
                showMinimap={showMinimap}
                customNodeColors={customNodeColors}
                onQuickAdd={handleQuickAdd}
                enableDragConnect
                onDragConnect={handleDragConnect}
                enableEdgeReconnect
                onEdgeReconnect={handleEdgeReconnect}
                onZoomChange={setZoomLevel}
              />
            ) : searchQuery.trim() ? (
              <SearchNoResults t={t} />
            ) : null}
          </ErrorBoundary>

          {/* Hint when all nodes are collapsed — canvas appears empty */}
          {collapsedCount > 0 && filteredGraphData && collapsedCount >= filteredGraphData.nodes.length && (
            <AllCollapsedHint onExpandAll={() => graphControlsRef.current?.expandAll()} t={t} />
          )}

          {/* Sticky notes layer — floats above graph, below modals */}
          <ErrorBoundary fallback={(_err, reset) => (
            <div className="absolute bottom-3 right-3 z-10 bg-white rounded-lg shadow border border-gray-200 px-3 py-2 flex items-center gap-2">
              <p className="text-xs text-gray-500">{t.stickyNotesError}</p>
              <button onClick={reset} className="text-xs font-medium text-[#2a8c7a] hover:underline">{t.retry}</button>
            </div>
          )}>
            <StickyNotesLayer
              topicId={effectiveTopicId}
              notes={stickyNotes}
              onNotesChange={setStickyNotes}
            />
          </ErrorBoundary>

          {/* Connect tool indicator — shows source node name */}
          {activeTool === 'connect' && connectSource && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white rounded-full shadow-lg border border-[#2a8c7a]/30 px-3 py-1.5">
              <Link2 className="w-3.5 h-3.5 text-[#2a8c7a]" />
              <span className="text-xs text-gray-700">
                <span className="font-medium text-[#2a8c7a]">{connectSource.label}</span>
                {t.selectTarget}
              </span>
              <button
                onClick={() => { setConnectSource(null); setConnectTarget(null); setActiveTool('pointer'); }}
                className="p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label={t.cancelConnection}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* AI Tutor panel — slides in from right */}
          {effectiveTopicId && (
            <ErrorBoundary fallback={(_err, reset) => (
              <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg z-40 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-sm text-gray-500">{t.aiPanelError}</p>
                <button onClick={reset} className="text-sm text-[#2a8c7a] hover:underline">{t.retry}</button>
              </div>
            )}>
              <AiTutorPanel
                topicId={effectiveTopicId}
                open={showAiPanel}
                onClose={handleAiPanelClose}
                onHighlightNodes={setAiHighlightNodes}
                onReviewNodes={setAiReviewNodes}
                onNavigateToAction={handleNavigateToAction}
                existingNodeIds={existingNodeIds}
                existingEdgeIds={existingEdgeIds}
                onEdgeCreated={refetch}
                nodeLabels={nodeLabels}
              />
            </ErrorBoundary>
          )}

          {/* Change history panel — slides in from right */}
          <ErrorBoundary fallback={(_err, reset) => (
            <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg z-40 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-gray-500">{t.historyPanelError}</p>
              <button onClick={reset} className="text-sm text-[#2a8c7a] hover:underline">{t.retry}</button>
            </div>
          )}>
            <ChangeHistoryPanel
              open={showHistory}
              onClose={handleHistoryClose}
              entries={historyEntries}
              onClear={handleHistoryClear}
            />
          </ErrorBoundary>

          {/* Map comparison panel — slides in from right */}
          <ErrorBoundary fallback={(_err, reset) => (
            <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg z-40 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-gray-500">{t.comparisonPanelError}</p>
              <button onClick={reset} className="text-sm text-[#2a8c7a] hover:underline">{t.retry}</button>
            </div>
          )}>
            <MapComparisonPanel
              open={showComparison}
              onClose={handleComparisonClose}
              graphData={graphData}
              onHighlightNodes={setAiHighlightNodes}
              onNavigateToAction={handleComparisonNavigate}
            />
          </ErrorBoundary>

          {/* First-visit onboarding tips */}
          {showOnboarding && !loading && !isEmpty && filteredGraphData && filteredGraphData.nodes.length > 0 && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 rounded-2xl" role="dialog" aria-modal="true" aria-label={t.onboardingAriaLabel}>
              <div className="bg-white rounded-2xl shadow-xl p-5 mx-4 max-w-sm w-full">
                <h3 className="font-medium text-gray-900 mb-3" style={headingStyle}>
                  {t.onboardingTitle}
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 mb-4">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#e8f5f1] text-[#2a8c7a] flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                    <span>{t.onboardingTip1}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#e8f5f1] text-[#2a8c7a] flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                    <span>{t.onboardingTip2}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#e8f5f1] text-[#2a8c7a] flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                    <span>{t.onboardingTip3}</span>
                  </li>
                </ul>
                <button
                  onClick={dismissOnboarding}
                  autoFocus
                  className="w-full px-4 py-2.5 text-sm font-medium text-white rounded-full transition-colors hover:bg-[#244e47]"
                  style={{ backgroundColor: '#2a8c7a' }}
                >
                  {t.onboardingDismiss}
                </button>
              </div>
            </div>
          )}

          {/* Annotation modal — rendered outside overflow context via fixed positioning */}
          <ErrorBoundary fallback={(_err, reset) => (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <div className="bg-white rounded-2xl p-6 text-center max-w-xs">
                <p className="text-sm text-gray-500 mb-3">{t.annotationError}</p>
                <button onClick={reset} className="text-sm text-[#2a8c7a] hover:underline">{t.retry}</button>
              </div>
            </div>
          )}>
            <NodeAnnotationModal
              node={annotationNode}
              onClose={() => setAnnotationNode(null)}
              onSaved={refetch}
            />
          </ErrorBoundary>

          {/* Context menu overlay — uses fixed positioning, safe outside overflow */}
          <ErrorBoundary fallback={(_err, reset) => (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={reset}>
              <div className="bg-white rounded-lg shadow-lg px-4 py-3 flex flex-col items-center gap-2">
                <p className="text-sm text-gray-600">{t.contextMenuError}</p>
                <button onClick={reset} className="text-sm font-medium text-[#2a8c7a] hover:underline">{t.close}</button>
              </div>
            </div>
          )}>
            <NodeContextMenu
              node={contextMenu?.node ?? null}
              position={contextMenu?.position ?? null}
              onAction={handleAction}
              onClose={handleContextMenuClose}
              hasChildren={contextMenu?.node ? nodesWithChildren.has(contextMenu.node.id) : false}
              isCollapsed={contextMenu?.node ? collapsedNodeIds.has(contextMenu.node.id) : false}
              onToggleCollapse={contextMenu?.node ? handleToggleCollapse : undefined}
              onColorChange={handleNodeColorChange}
              currentCustomColor={contextMenu?.node ? customNodeColors.get(contextMenu.node.id) : undefined}
            />
          </ErrorBoundary>

        </div>

        {/* Add custom node/edge modal */}
        <ErrorBoundary fallback={(_err, reset) => (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-2xl p-6 text-center max-w-xs">
              <p className="text-sm text-gray-500 mb-3">{t.formError}</p>
              <button onClick={reset} className="text-sm text-[#2a8c7a] hover:underline">{t.retry}</button>
            </div>
          </div>
        )}>
          <AddNodeEdgeModal
            open={addModalOpen}
            onClose={handleAddModalClose}
            topicId={effectiveTopicId}
            existingNodes={graphData?.nodes ?? EMPTY_NODES}
            onCreated={refetch}
            onNodeCreated={handleNodeCreated}
            onEdgeCreated={handleEdgeCreated}
            initialEdgeSource={connectSource?.id}
            initialEdgeTarget={connectTarget?.id}
            initialTab={connectSource ? 'edge' : undefined}
          />
        </ErrorBoundary>

        {/* Share map modal */}
        <ErrorBoundary fallback={(_err, reset) => (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl shadow-lg px-6 py-5 flex flex-col items-center gap-3 max-w-xs">
              <p className="text-sm text-gray-600 text-center">{t.shareError}</p>
              <div className="flex gap-2">
                <button onClick={() => { setShowShareModal(false); reset(); }} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">{t.close}</button>
                <button onClick={reset} className="text-sm px-3 py-1.5 rounded-lg bg-[#2a8c7a] text-white hover:bg-[#244e47]">{t.retry}</button>
              </div>
            </div>
          </div>
        )}>
          <ShareMapModal
            open={showShareModal}
            onClose={() => setShowShareModal(false)}
            topicId={effectiveTopicId}
            topicName={currentTopic?.title || allTopics.find(t => t.id === topicId)?.name}
          />
        </ErrorBoundary>

        {/* Delete confirmation dialog (replaces window.confirm for PWA compatibility) */}
        <ErrorBoundary fallback={(_err, reset) => (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl p-6 text-center max-w-xs shadow-lg">
              <p className="text-sm text-gray-500 mb-3">{t.confirmDialogError}</p>
              <button onClick={() => { reset(); setConfirmDeleteNode(null); }} className="text-sm text-[#2a8c7a] hover:underline">{t.close}</button>
            </div>
          </div>
        )}>
          {confirmDeleteNode && (
            <ConfirmDialog
              title={t.deleteDialogTitle}
              description={t.deleteDialogDescription(confirmDeleteNode.label)}
              cancelLabel={t.cancel}
              confirmLabel={t.deleteLabel}
              onCancel={() => setConfirmDeleteNode(null)}
              onConfirm={executeDeleteNode}
            />
          )}
        </ErrorBoundary>

        {/* Presentation mode overlay */}
        <ErrorBoundary fallback={(_err, reset) => (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="bg-white rounded-2xl p-6 text-center max-w-xs">
              <p className="text-sm text-gray-500 mb-3">{t.presentationError}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => { reset(); setPresentationMode(false); }} className="text-sm text-gray-500 hover:underline">{t.exit}</button>
                <button onClick={reset} className="text-sm text-[#2a8c7a] hover:underline">{t.retry}</button>
              </div>
            </div>
          </div>
        )}>
          <AnimatePresence>
            {presentationMode && filteredGraphData && filteredGraphData.nodes.length > 0 && (
              <PresentationMode
                nodes={filteredGraphData.nodes}
                edges={filteredGraphData.edges}
                onExit={() => setPresentationMode(false)}
                onNodeFocus={handlePresentationFocus}
              />
            )}
          </AnimatePresence>
        </ErrorBoundary>
      </div>
    </FadeIn>
  );
}
