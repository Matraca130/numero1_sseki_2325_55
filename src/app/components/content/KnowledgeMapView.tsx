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

/** Haptic feedback for mobile — no-op when Vibration API is unavailable. */
const haptic = (ms = 50) => navigator?.vibrate?.(ms);
/** Stable empty array to avoid creating new reference on every render. */
const EMPTY_NODES: import('./mindmap').MapNode[] = [];
import { useNavigate, useSearchParams } from 'react-router';
import { Brain, Map as MapIcon, RefreshCw, Globe, BookOpen, X, Plus, Trash2, ChevronDown, Maximize2, Minimize2, Sparkles, Link2, Undo2, Redo2, Presentation, Clock, Share2, GitCompareArrows, StickyNote as StickyNoteIcon } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { useCountUp } from '@/app/hooks/useCountUp';
import { EmptyState, ErrorState } from '@/app/components/shared/PageStates';
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
import { deleteCustomNode, deleteCustomEdge, createCustomEdge } from '@/app/services/mindmapApi';
import type { EdgeReconnectResult } from './mindmap/useEdgeReconnect';
import { useSearchFocus } from './mindmap/useSearchFocus';
import { useGraphControls } from './mindmap/useGraphControls';
import { ConfirmDialog } from './mindmap/ConfirmDialog';
import { useFullscreen } from './mindmap/useFullscreen';
import { MapToolsPanel } from './mindmap/MapToolsPanel';
import { AiTutorPanel } from './mindmap/AiTutorPanel';
import { useUndoRedo } from './mindmap/useUndoRedo';
import { GraphSkeleton } from './mindmap/GraphSkeleton';
import { PresentationMode } from './mindmap/PresentationMode';
import { ChangeHistoryPanel } from './mindmap/ChangeHistoryPanel';
import { ShareMapModal } from './mindmap/ShareMapModal';
import { MapComparisonPanel } from './mindmap/MapComparisonPanel';
import { StickyNotesLayer, loadStickyNotes, createStickyNote, saveStickyNotes } from './mindmap/StickyNote';
import type { StickyNoteData } from './mindmap/StickyNote';
import { loadNodeColors, saveNodeColor } from './mindmap/useNodeColors';
import type { NodeColorMap } from './mindmap/useNodeColors';
import { loadHistory, saveHistory, clearHistoryStorage, createNodeEntry, createEdgeEntry, createDeleteNodeEntry } from './mindmap/changeHistoryHelpers';
import type { HistoryEntry } from './mindmap/changeHistoryHelpers';
import type { MapTool } from './mindmap/MapToolsPanel';
import type { MapNode, NodeAction, GraphControls } from '@/app/types/mindmap';
import { MASTERY_HEX } from '@/app/types/mindmap';
import { headingStyle } from '@/app/design-system';
import { getSafeMasteryColor } from '@/app/lib/mastery-helpers';

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
              name: topic.name || 'Sin título',
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
    }
  }, [topicId, clearHistory]);

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
  const [activeTool, setActiveTool] = useState<MapTool>('pointer');
  const [connectSource, setConnectSource] = useState<MapNode | null>(null);
  const [connectTarget, setConnectTarget] = useState<MapNode | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [presentationMode, setPresentationMode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [aiHighlightNodes, setAiHighlightNodes] = useState<Set<string> | undefined>();
  const [aiReviewNodes, setAiReviewNodes] = useState<Set<string> | undefined>();
  const [zoomLevel, setZoomLevel] = useState(1);
  const [masteryFilter, setMasteryFilter] = useState<import('@/app/lib/mastery-helpers').MasteryColor | null>(null);
  // Minimap: visible on desktop by default, hidden on mobile
  const [showMinimap, setShowMinimap] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const toggleMinimap = useCallback(() => setShowMinimap(v => !v), []);
  const graphControlsRef = useRef<GraphControls | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const connectSourceRef = useRef(connectSource);
  connectSourceRef.current = connectSource;
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const deletingNodeRef = useRef(false);
  const reconnectingRef = useRef(false);
  const { isFullscreen, toggleFullscreen, fullscreenRef } = useFullscreen();

  // First-visit onboarding tip
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem('axon_map_onboarded'); } catch { return true; }
  });
  const showOnboardingRef = useRef(showOnboarding);
  showOnboardingRef.current = showOnboarding;
  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    try { localStorage.setItem('axon_map_onboarded', '1'); } catch {}
  }, []);

  // Dismiss onboarding with Escape key
  useEffect(() => {
    if (!showOnboarding) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismissOnboarding(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showOnboarding, dismissOnboarding]);

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
        toast.info('Conexión cancelada');
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
          toast.error('Solo puedes eliminar conceptos creados por ti');
        }
        return;
      case 'connect':
        if (!source) {
          // First click: select source
          setConnectSource(node);
          toast.info(`Origen: "${node.label}" — Ahora selecciona el destino`);
        } else if (source.id === node.id) {
          // Clicked same node: cancel
          setConnectSource(null);
          setConnectTarget(null);
          toast.info('Conexión cancelada');
        } else {
          // Second click: open modal pre-filled with source→target
          setConnectTarget(node);
          setAddModalOpen(true);
          setActiveTool('pointer');
        }
        return;
      default:
        setSelectedNode(node);
        setContextMenu({ node, position: position ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 } });
        haptic(10);
    }
  }, []);

  const handleNodeRightClick = useCallback((node: MapNode, position: { x: number; y: number }) => {
    haptic(30);
    setContextMenu({ node, position });
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Effective topicId for custom node creation and navigation fallback
  const effectiveTopicId = topicId || courseTopicIds[0] || '';

  // Load history from sessionStorage when topic changes
  useEffect(() => {
    if (effectiveTopicId) setHistoryEntries(loadHistory(effectiveTopicId));
  }, [effectiveTopicId]);
  // Persist history entries to sessionStorage
  useEffect(() => {
    if (effectiveTopicId && historyEntries.length > 0) saveHistory(effectiveTopicId, historyEntries);
  }, [effectiveTopicId, historyEntries]);

  // ── Sticky notes ───────────────────────────────────────────
  const [stickyNotes, setStickyNotes] = useState<StickyNoteData[]>([]);
  useEffect(() => {
    if (effectiveTopicId) {
      setStickyNotes(loadStickyNotes(effectiveTopicId));
    } else {
      setStickyNotes([]);
    }
  }, [effectiveTopicId]);

  const handleAddStickyNote = useCallback(() => {
    if (!effectiveTopicId) return;
    setStickyNotes(prev => {
      if (prev.length >= 10) {
        toast.error('Máximo 10 notas por tema');
        return prev;
      }
      const note = createStickyNote();
      const next = [...prev, note];
      saveStickyNotes(effectiveTopicId, next);
      return next;
    });
  }, [effectiveTopicId]);

  // ── Custom node colors ────────────────────────────────────
  const [customNodeColors, setCustomNodeColors] = useState<NodeColorMap>(new Map());
  useEffect(() => {
    if (effectiveTopicId) {
      setCustomNodeColors(loadNodeColors(effectiveTopicId));
    } else {
      setCustomNodeColors(new Map());
    }
  }, [effectiveTopicId]);

  const handleNodeColorChange = useCallback((nodeId: string, color: string) => {
    if (!effectiveTopicId) return;
    saveNodeColor(effectiveTopicId, nodeId, color);
    setCustomNodeColors(prev => {
      const next = new Map(prev);
      next.set(nodeId, color);
      return next;
    });
  }, [effectiveTopicId]);

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
        toast.info(`Origen: "${node.label}" — Ahora selecciona el destino`);
        break;
      case 'annotate':
        setAnnotationNode(node);
        break;
      case 'details':
        setSelectedNode(node);
        break;
    }
  }, [navigateWithFade, effectiveTopicId]);

  const { handleZoomIn, handleZoomOut, handleFitView, handleCollapseAll, handleExpandAll, handleExportPNG, handleExportJPEG } = useGraphControls(graphControlsRef);

  const handlePresentationFocus = useCallback((nodeId: string) => {
    graphControlsRef.current?.focusNode?.(nodeId);
  }, []);

  const [confirmDeleteNode, setConfirmDeleteNode] = useState<MapNode | null>(null);

  const handleDeleteCustomNode = useCallback(async (node: MapNode) => {
    if (!node.isUserCreated) return;
    setConfirmDeleteNode(node);
  }, []);

  const executeDeleteNode = useCallback(async () => {
    if (!confirmDeleteNode || deletingNodeRef.current) return;
    deletingNodeRef.current = true;
    try {
      await deleteCustomNode(confirmDeleteNode.id);
      if (!mountedRef.current) return;
      // Record for undo — store enough data to re-create the node
      pushAction({
        type: 'delete-node',
        nodeId: confirmDeleteNode.id,
        payload: {
          label: confirmDeleteNode.label,
          definition: confirmDeleteNode.definition,
          topic_id: effectiveTopicId,
        },
      });
      setHistoryEntries(prev => [...prev, createDeleteNodeEntry(confirmDeleteNode.label)]);
      setSelectedNode(prev => prev?.id === confirmDeleteNode.id ? null : prev);
      setConfirmDeleteNode(null);
      refetch();
    } catch (e: unknown) {
      if (!mountedRef.current) return;
      toast.error(e instanceof Error ? e.message : 'Error al eliminar concepto');
      setConfirmDeleteNode(null);
    } finally {
      deletingNodeRef.current = false;
    }
  }, [confirmDeleteNode, refetch, pushAction, effectiveTopicId]);

  // Handle edge reconnect: delete old edge, create new edge, record undo action
  const handleEdgeReconnect = useCallback(async (result: EdgeReconnectResult) => {
    if (reconnectingRef.current) return;
    reconnectingRef.current = true;
    const { oldEdge, movedEndpoint, newNodeId } = result;
    try {
      // Build new edge source/target
      const newSource = movedEndpoint === 'source' ? newNodeId : oldEdge.source;
      const newTarget = movedEndpoint === 'target' ? newNodeId : oldEdge.target;

      // Guard: prevent duplicate edges (use ref for fresh data)
      const edgeExists = graphDataEdgesRef.current?.some(
        e => e.source === newSource && e.target === newTarget && e.id !== oldEdge.id,
      );
      if (edgeExists) {
        toast.warning('Ya existe una conexión entre estos nodos');
        return;
      }

      // Delete the old edge
      await deleteCustomEdge(oldEdge.id);

      // Create the new edge (preserving label, connection type, style, etc.)
      const oldEdgePayload = {
        source_node_id: oldEdge.source,
        target_node_id: oldEdge.target,
        label: oldEdge.label,
        connection_type: oldEdge.connectionType,
        topic_id: effectiveTopicId,
        line_style: oldEdge.lineStyle === 'solid' ? undefined : oldEdge.lineStyle,
        custom_color: oldEdge.customColor,
        directed: oldEdge.directed,
        arrow_type: oldEdge.arrowType,
      };
      let newEdgeRes;
      try {
        newEdgeRes = await createCustomEdge({
          source_node_id: newSource,
          target_node_id: newTarget,
          label: oldEdge.label,
          connection_type: oldEdge.connectionType,
          topic_id: effectiveTopicId,
          line_style: oldEdge.lineStyle === 'solid' ? undefined : oldEdge.lineStyle,
          custom_color: oldEdge.customColor,
          directed: oldEdge.directed,
          arrow_type: oldEdge.arrowType,
        });
      } catch (createErr: unknown) {
        // Compensate: re-create the old edge since delete already succeeded
        try { await createCustomEdge(oldEdgePayload); } catch { /* best effort */ }
        throw createErr;
      }

      if (!mountedRef.current) return;

      // Record for undo
      pushAction({
        type: 'reconnect-edge',
        oldEdgeId: oldEdge.id,
        oldPayload: oldEdgePayload,
        newEdgeId: newEdgeRes.id,
        newPayload: {
          source_node_id: newSource,
          target_node_id: newTarget,
          label: oldEdge.label,
          connection_type: oldEdge.connectionType,
          topic_id: effectiveTopicId,
          line_style: oldEdge.lineStyle === 'solid' ? undefined : oldEdge.lineStyle,
          custom_color: oldEdge.customColor,
          directed: oldEdge.directed,
          arrow_type: oldEdge.arrowType,
        },
      });

      // Find node labels for toast (use ref for stable callback)
      const srcNode = graphDataNodesRef.current?.find(n => n.id === newSource);
      const tgtNode = graphDataNodesRef.current?.find(n => n.id === newTarget);
      toast.success(`Arista reconectada: ${srcNode?.label ?? '?'} → ${tgtNode?.label ?? '?'}`);
      haptic(50);
      refetch();
    } catch (e: unknown) {
      if (!mountedRef.current) return;
      toast.error(e instanceof Error ? e.message : 'Error al reconectar arista');
    } finally {
      reconnectingRef.current = false;
    }
  }, [effectiveTopicId, pushAction, refetch]);

  // Quick-add handler: open AddNodeEdgeModal with source pre-filled
  const handleQuickAdd = useCallback((sourceId: string) => {
    const sourceNode = graphDataNodesRef.current?.find(n => n.id === sourceId);
    if (sourceNode) {
      setConnectSource(sourceNode);
      setAddModalOpen(true);
    }
  }, []);


  // Ctrl+F / '/' → focus search input
  useSearchFocus(searchInputRef);

  // Tool keyboard shortcuts (V/N/C/D/A) — reset connect state when switching away
  const handleToolChange = useCallback((tool: MapTool) => {
    if (tool !== 'connect') {
      setConnectSource(null);
      setConnectTarget(null);
    }
    setActiveTool(tool);
  }, []);

  useEffect(() => {
    const handleToolKey = (e: KeyboardEvent) => {
      if (showOnboardingRef.current) return;
      const el = e.target as HTMLElement;
      if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.tagName === 'SELECT' || el?.isContentEditable) return;
      // Suppress tool shortcuts when any modal/dialog is open
      if (el?.closest('[role="dialog"], [role="alertdialog"]')) return;
      const map: Record<string, MapTool> = { v: 'pointer', n: 'add-node', c: 'connect', d: 'delete', a: 'annotate' };
      const tool = map[e.key.toLowerCase()];
      if (tool) handleToolChange(tool);
    };
    document.addEventListener('keydown', handleToolKey);
    return () => document.removeEventListener('keydown', handleToolKey);
  }, [handleToolChange]);

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

  const handleNodeCreated = useCallback((nodeId: string, payload: { label: string }) => {
    pushAction({ type: 'create-node', nodeId, payload: payload as Parameters<typeof pushAction>[0]['payload'] });
    setHistoryEntries(prev => [...prev, createNodeEntry(payload.label)]);
    haptic(50);
  }, [pushAction]);

  const handleEdgeCreated = useCallback((edgeId: string, payload: { source_node_id: string; target_node_id: string }) => {
    pushAction({ type: 'create-edge', edgeId, payload: payload as Parameters<typeof pushAction>[0]['payload'] });
    const srcNode = graphDataNodesRef.current?.find(n => n.id === payload.source_node_id);
    const tgtNode = graphDataNodesRef.current?.find(n => n.id === payload.target_node_id);
    setHistoryEntries(prev => [...prev, createEdgeEntry(srcNode?.label || '?', tgtNode?.label || '?')]);
    haptic(50);
  }, [pushAction]);

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

  if (loading) return (
    <FadeIn>
      <div className="flex flex-col h-[calc(100dvh-4rem)] p-3 sm:p-6 lg:p-8">
        {/* Skeleton header */}
        <div className="flex-shrink-0 mb-4">
          <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse motion-reduce:animate-none mb-2" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse motion-reduce:animate-none" />
        </div>
        {/* Skeleton toolbar */}
        <div className="flex-shrink-0 mb-3 flex items-center gap-2">
          <div className="h-9 w-36 bg-gray-100 rounded-full animate-pulse motion-reduce:animate-none" />
          <div className="h-9 w-24 bg-gray-100 rounded-full animate-pulse motion-reduce:animate-none" />
          <div className="h-9 w-44 bg-gray-100 rounded-full animate-pulse motion-reduce:animate-none" />
        </div>
        {/* Skeleton graph canvas — content-shaped nodes & edges */}
        <div className="flex-1 min-h-0">
          <GraphSkeleton />
        </div>
      </div>
    </FadeIn>
  );

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  if (!topicId && !summaryId && scope !== 'course') {
    return (
      <FadeIn>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <div className="w-16 h-16 rounded-2xl bg-[#e8f5f1] flex items-center justify-center mb-5">
            <MapIcon className="w-8 h-8 text-[#2a8c7a] animate-pulse" aria-hidden="true" />
          </div>
          <h2
            className="text-gray-900 mb-2 text-center"
            style={{ ...headingStyle, fontSize: 'clamp(1.1rem, 2vw, 1.35rem)' }}
          >
            Mapa de Conocimiento
          </h2>
          <p
            className="text-gray-500 mb-6 text-center max-w-sm leading-relaxed"
            style={{ fontSize: 'clamp(0.8125rem, 1.3vw, 0.875rem)' }}
          >
            Selecciona un tema para ver tu mapa de conocimiento.
          </p>
          {allTopics.length > 0 ? (
            <div className="relative w-full max-w-xs">
              <select
                value=""
                onChange={(e) => e.target.value && handleTopicSelect(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-full px-4 py-2.5 pr-9 text-sm text-gray-700 shadow-sm hover:border-gray-300 transition-colors"
                style={{ outlineColor: '#2a8c7a' }}
              >
                <option value="">Seleccionar tema...</option>
                {allTopics.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.courseName} — {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          ) : (
            <p
              className="text-gray-400 leading-relaxed"
              style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
            >
              Ningún tema disponible. Ingresa a un curso primero.
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
            title="Mapa de Conocimiento"
            subtitle={currentCourse?.name || 'Todos los temas'}
            onBack={() => navigate(-1)}
          />
          <EmptyState
            icon={<Globe className="w-12 h-12 text-[#2a8c7a] animate-pulse" />}
            title="Ningún concepto en el curso"
            description={courseTopicIds.length === 0
              ? 'Este curso no tiene temas. Accede a un curso con contenido primero.'
              : 'Los temas de este curso aún no tienen conceptos mapeados. ¡Estudia más para construir tu mapa!'}
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
            title="Mapa de Conocimiento"
            subtitle="Visualiza tu dominio de cada concepto"
            onBack={() => navigate(-1)}
          />
          <EmptyState
            icon={<Brain className="w-12 h-12 text-[#2a8c7a] animate-pulse" />}
            title="Ningún concepto encontrado"
            description="Este tema aún no tiene palabras clave con conexiones. ¡Estudia más para construir tu mapa!"
          />
        </div>
      </FadeIn>
    );
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
        {/* Header — hidden in fullscreen mode */}
        <div className={`flex-shrink-0 mb-4 ${isFullscreen ? 'hidden' : ''}`}>
          <AxonPageHeader
            title="Mapa de Conocimiento"
            subtitle={scope === 'course' ? (currentCourse?.name || 'Todos los temas') : (currentTopic?.title || 'Visualiza tu dominio')}
            onBack={() => navigate(-1)}
            actionButton={
              <div
                className="flex items-center gap-1.5 sm:gap-2 flex-nowrap sm:flex-wrap justify-end overflow-x-auto sm:overflow-x-visible max-w-full [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
                style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
              >
                {/* Topic switcher */}
                {allTopics.length > 1 && scope === 'topic' && (
                  <div className="relative">
                    <select
                      value={topicId || ''}
                      onChange={(e) => e.target.value && handleTopicSelect(e.target.value)}
                      className="appearance-none bg-white border border-gray-200 rounded-full pl-3 pr-7 py-1.5 text-xs text-gray-600 shadow-sm hover:border-gray-300 transition-colors max-w-[160px] sm:max-w-[220px] truncate"
                      style={{ outlineColor: '#2a8c7a' }}
                      aria-label="Seleccionar tema"
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
                  <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-200 p-0.5" role="radiogroup" aria-label="Alcance del mapa">
                    <button
                      onClick={() => setScope('topic')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        scope === 'topic'
                          ? 'bg-[#e8f5f1] text-[#2a8c7a]'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      role="radio"
                      aria-checked={scope === 'topic'}
                      aria-label="Ver tema actual"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Tema</span>
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
                      aria-label="Ver todos los temas del curso"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Todos</span>
                    </button>
                  </div>
                )}
                {effectiveTopicId && scope === 'topic' && (
                  <button
                    onClick={() => setAddModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-xs font-medium text-white rounded-full shadow-sm transition-colors hover:bg-[#244e47]"
                    style={{ backgroundColor: '#2a8c7a' }}
                    aria-label="Añadir concepto al mapa"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Añadir</span>
                  </button>
                )}
                {effectiveTopicId && (
                  <button
                    onClick={handleAddStickyNote}
                    className="flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-xs font-medium text-gray-500 hover:text-[#2a8c7a] bg-white rounded-full border border-gray-200 shadow-sm hover:border-[#2a8c7a]/30 transition-colors"
                    aria-label="Agregar nota adhesiva"
                    title="Agregar nota adhesiva"
                  >
                    <StickyNoteIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Nota</span>
                    {stickyNotes.length > 0 && (
                      <span
                        className="px-1.5 py-0.5 rounded-full font-medium"
                        style={{ fontSize: 'clamp(0.5625rem, 0.9vw, 0.625rem)', backgroundColor: '#e8f5f1', color: '#2a8c7a' }}
                      >
                        {stickyNotes.length}
                      </span>
                    )}
                  </button>
                )}
                {/* Undo / Redo */}
                <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-200 p-0.5">
                  <button
                    onClick={() => { undo(); haptic(30); }}
                    disabled={!canUndo || undoBusy || deletingNodeRef.current || reconnectingRef.current}
                    className="flex items-center gap-1 px-2 py-2.5 sm:py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-30 text-gray-500 hover:text-[#2a8c7a]"
                    aria-label="Deshacer (Ctrl+Z)"
                    title="Deshacer (Ctrl+Z)"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { redo(); haptic(30); }}
                    disabled={!canRedo || undoBusy || deletingNodeRef.current || reconnectingRef.current}
                    className="flex items-center gap-1 px-2 py-2.5 sm:py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-30 text-gray-500 hover:text-[#2a8c7a]"
                    aria-label="Rehacer (Ctrl+Y)"
                    title="Rehacer (Ctrl+Y)"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={refetch}
                  className="flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-xs font-medium text-gray-500 hover:text-[#2a8c7a] bg-white rounded-full border border-gray-200 shadow-sm hover:border-[#2a8c7a]/30 transition-colors"
                  aria-label="Actualizar mapa"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Actualizar</span>
                </button>
                <button
                  onClick={() => { setShowAiPanel(v => { if (!v) { setShowHistory(false); setShowComparison(false); } return !v; }); }}
                  className={`flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-xs font-medium rounded-full border shadow-sm transition-colors ${
                    showAiPanel
                      ? 'text-[#2a8c7a] bg-[#e8f5f1] border-[#2a8c7a]/30'
                      : 'text-gray-500 hover:text-[#2a8c7a] bg-white border-gray-200 hover:border-[#2a8c7a]/30'
                  }`}
                  aria-label="IA Tutor"
                  title="IA Tutor"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">IA</span>
                </button>
                <button
                  onClick={() => { setShowHistory(v => { if (!v) { setShowAiPanel(false); setShowComparison(false); } return !v; }); }}
                  className={`flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 rounded-full border shadow-sm transition-colors ${
                    showHistory ? 'text-[#2a8c7a] bg-[#e8f5f1] border-[#2a8c7a]/30' : 'text-gray-500 hover:text-[#2a8c7a] bg-white border-gray-200 hover:border-[#2a8c7a]/30'
                  }`}
                  style={{ fontSize: 'clamp(0.7rem, 1.1vw, 0.75rem)' }}
                  aria-label="Historial de cambios"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Historial</span>
                </button>
                {filteredGraphData && filteredGraphData.nodes.length > 0 && (
                  <button
                    onClick={() => setPresentationMode(true)}
                    className="flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-xs font-medium text-gray-500 hover:text-[#2a8c7a] bg-white rounded-full border border-gray-200 shadow-sm hover:border-[#2a8c7a]/30 transition-colors"
                    aria-label={`Modo presentaci\u00f3n`}
                    title={`Modo presentaci\u00f3n`}
                  >
                    <Presentation className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Presentar</span>
                  </button>
                )}
                {effectiveTopicId && (
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-xs font-medium text-gray-500 hover:text-[#2a8c7a] bg-white rounded-full border border-gray-200 shadow-sm hover:border-[#2a8c7a]/30 transition-colors"
                    aria-label="Compartir mapa"
                    title="Compartir mapa"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Compartir</span>
                  </button>
                )}
                <button
                  onClick={() => { setShowComparison(v => { if (!v) { setShowAiPanel(false); setShowHistory(false); } return !v; }); }}
                  className={`flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-xs font-medium rounded-full border shadow-sm transition-colors ${
                    showComparison
                      ? 'text-[#2a8c7a] bg-[#e8f5f1] border-[#2a8c7a]/30'
                      : 'text-gray-500 hover:text-[#2a8c7a] bg-white border-gray-200 hover:border-[#2a8c7a]/30'
                  }`}
                  aria-label="Comparar mapa"
                  title="Comparar tu mapa con el mapa base"
                >
                  <GitCompareArrows className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Comparar</span>
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-xs font-medium text-gray-500 hover:text-[#2a8c7a] bg-white rounded-full border border-gray-200 shadow-sm hover:border-[#2a8c7a]/30 transition-colors"
                  aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            }
            statsLeft={
              masteryStats && (
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">
                    {displayPct}% dominio
                  </span>
                  <span className="hidden sm:inline">{masteryStats.mastered} dominados</span>
                  <span className="hidden sm:inline">{masteryStats.learning} aprendiendo</span>
                  <span className="hidden md:inline">{masteryStats.weak} débiles</span>
                </div>
              )
            }
          />
        </div>

        {/* Screen reader search results announcement (persistent DOM node for reliable aria-live) */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {searchQuery.trim()
            ? matchCount === 0
              ? 'Ningún concepto encontrado'
              : `${matchCount} conceptos encontrados para "${searchQuery}"`
            : ''}
        </div>

        {/* Fullscreen floating title + exit button */}
        {isFullscreen && (
          <div className="flex-shrink-0 flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700" style={headingStyle}>
              Mapa de Conocimiento
            </h2>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-xs font-medium text-gray-500 hover:text-[#2a8c7a] bg-white rounded-full border border-gray-200 shadow-sm hover:border-[#2a8c7a]/30 transition-colors"
              aria-label="Salir de pantalla completa"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        )}

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
            onExportPNG={handleExportPNG}
            onExportJPEG={handleExportJPEG}
            showMinimap={showMinimap}
            onMinimapToggle={toggleMinimap}
            zoomLevel={zoomLevel}
            masteryFilter={masteryFilter}
            onMasteryFilterChange={setMasteryFilter}
          />
        </div>

        {/* Mobile mastery legend (hidden on md+, where GraphToolbar legend shows) */}
        {masteryStats && (
          <div className="flex md:hidden items-center gap-3 mb-2 px-2 py-1.5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {(['green', 'yellow', 'red', 'gray'] as const).map(color => {
              const key = color === 'green' ? 'mastered' : color === 'yellow' ? 'learning' : color === 'red' ? 'weak' : 'noData';
              const label = color === 'green' ? 'Dominados' : color === 'yellow' ? 'Aprendiendo' : color === 'red' ? 'Débiles' : 'Sin datos';
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
          {/* Floating tool palette — horizontal bottom bar on mobile, vertical left on desktop */}
          <MapToolsPanel
            activeTool={activeTool}
            onToolChange={handleToolChange}
            visible={!loading && !!filteredGraphData && filteredGraphData.nodes.length > 0}
          />
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
                enableEdgeReconnect
                onEdgeReconnect={handleEdgeReconnect}
                onZoomChange={setZoomLevel}
              />
            ) : searchQuery.trim() ? (
              <div className="w-full h-full min-h-[180px] sm:min-h-[280px] bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center">
                <div className="flex flex-col items-center text-center px-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#e8f5f1] flex items-center justify-center mb-3">
                    <Brain className="w-6 h-6 text-[#2a8c7a]" />
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

          {/* Hint when all nodes are collapsed — canvas appears empty */}
          {collapsedCount > 0 && filteredGraphData && collapsedCount >= filteredGraphData.nodes.length && (
            <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
              <div className="pointer-events-auto bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200 px-5 py-4 text-center max-w-[260px]">
                <p className="text-sm font-medium text-gray-600 mb-2">Todas las ramas están colapsadas</p>
                <button
                  onClick={() => graphControlsRef.current?.expandAll()}
                  className="text-xs font-medium text-[#2a8c7a] hover:underline"
                >
                  Expandir todo
                </button>
              </div>
            </div>
          )}

          {/* Sticky notes layer — floats above graph, below modals */}
          <ErrorBoundary fallback={(_err, reset) => (
            <div className="absolute bottom-3 right-3 z-10 bg-white rounded-lg shadow border border-gray-200 px-3 py-2 flex items-center gap-2">
              <p className="text-xs text-gray-500">Error en notas</p>
              <button onClick={reset} className="text-xs font-medium text-[#2a8c7a] hover:underline">Reintentar</button>
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
                {' → Selecciona destino'}
              </span>
              <button
                onClick={() => { setConnectSource(null); setConnectTarget(null); setActiveTool('pointer'); }}
                className="p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Cancelar conexión"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* AI Tutor panel — slides in from right */}
          {effectiveTopicId && (
            <ErrorBoundary fallback={(_err, reset) => (
              <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg z-40 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-sm text-gray-500">Error al cargar el panel de IA.</p>
                <button onClick={reset} className="text-sm text-[#2a8c7a] hover:underline">Reintentar</button>
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
              <p className="text-sm text-gray-500">Error al cargar el historial.</p>
              <button onClick={reset} className="text-sm text-[#2a8c7a] hover:underline">Reintentar</button>
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
              <p className="text-sm text-gray-500">Error al cargar la comparación.</p>
              <button onClick={reset} className="text-sm text-[#2a8c7a] hover:underline">Reintentar</button>
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
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 rounded-2xl" role="dialog" aria-modal="true" aria-label="Bienvenida al mapa de conocimiento">
              <div className="bg-white rounded-2xl shadow-xl p-5 mx-4 max-w-sm w-full">
                <h3 className="font-medium text-gray-900 mb-3" style={headingStyle}>
                  ¡Bienvenido al Mapa de Conocimiento!
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 mb-4">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#e8f5f1] text-[#2a8c7a] flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                    <span>Toca un concepto para ver flashcards, quiz y resumen.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#e8f5f1] text-[#2a8c7a] flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                    <span>Los colores indican tu dominio: verde = dominado, amarillo = aprendiendo, rojo = débil.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#e8f5f1] text-[#2a8c7a] flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                    <span>Pellizca para zoom, arrastra para mover. Usa la barra de búsqueda para encontrar conceptos.</span>
                  </li>
                </ul>
                <button
                  onClick={dismissOnboarding}
                  autoFocus
                  className="w-full px-4 py-2.5 text-sm font-medium text-white rounded-full transition-colors hover:bg-[#244e47]"
                  style={{ backgroundColor: '#2a8c7a' }}
                >
                  ¡Entendido!
                </button>
              </div>
            </div>
          )}

          {/* Annotation modal — rendered outside overflow context via fixed positioning */}
          <ErrorBoundary fallback={(_err, reset) => (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <div className="bg-white rounded-2xl p-6 text-center max-w-xs">
                <p className="text-sm text-gray-500 mb-3">Error al cargar la anotación.</p>
                <button onClick={reset} className="text-sm text-[#2a8c7a] hover:underline">Reintentar</button>
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
                <p className="text-sm text-gray-600">Error en menú contextual</p>
                <button onClick={reset} className="text-sm font-medium text-[#2a8c7a] hover:underline">Cerrar</button>
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
              onToggleCollapse={contextMenu?.node ? (() => { const id = contextMenu.node.id; return () => graphControlsRef.current?.toggleCollapse(id); })() : undefined}
              onColorChange={handleNodeColorChange}
              currentCustomColor={contextMenu?.node ? customNodeColors.get(contextMenu.node.id) : undefined}
            />
          </ErrorBoundary>

        </div>

        {/* Add custom node/edge modal */}
        <ErrorBoundary fallback={(_err, reset) => (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-2xl p-6 text-center max-w-xs">
              <p className="text-sm text-gray-500 mb-3">Error al cargar el formulario.</p>
              <button onClick={reset} className="text-sm text-[#2a8c7a] hover:underline">Reintentar</button>
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
              <p className="text-sm text-gray-600 text-center">Error al cargar compartir</p>
              <div className="flex gap-2">
                <button onClick={() => { setShowShareModal(false); reset(); }} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cerrar</button>
                <button onClick={reset} className="text-sm px-3 py-1.5 rounded-lg bg-[#2a8c7a] text-white hover:bg-[#244e47]">Reintentar</button>
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
        {confirmDeleteNode && (
          <ConfirmDialog
            title="¿Eliminar concepto?"
            description={`\u201c${confirmDeleteNode.label}\u201d será eliminado de tu mapa. Puedes deshacerlo con Ctrl+Z.`}
            cancelLabel="Cancelar"
            confirmLabel="Eliminar"
            onCancel={() => setConfirmDeleteNode(null)}
            onConfirm={executeDeleteNode}
          />
        )}

        {/* Presentation mode overlay */}
        <ErrorBoundary fallback={(_err, reset) => (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="bg-white rounded-2xl p-6 text-center max-w-xs">
              <p className="text-sm text-gray-500 mb-3">Error en modo presentación.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => { reset(); setPresentationMode(false); }} className="text-sm text-gray-500 hover:underline">Salir</button>
                <button onClick={reset} className="text-sm text-[#2a8c7a] hover:underline">Reintentar</button>
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

