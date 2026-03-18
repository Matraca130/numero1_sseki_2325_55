// ============================================================
// Axon — AI Tutor Panel
//
// Side panel showing AI analysis of the student's knowledge graph.
// Features:
//   - "Analizar mi mapa" button → calls AI analysis endpoint
//   - Shows weak areas, strong areas, study path, overall score
//   - Weak areas highlighted in red on the graph
//   - Study path shown as numbered sequence
//   - Suggested connections as dashed ghost lines
//
// LANG: Spanish
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { Sparkles, AlertTriangle, CheckCircle2, Route, X, Layers, HelpCircle, FileText, Link2, Check, XCircle, Brain, ArrowDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { analyzeKnowledgeGraph, suggestStudentConnections, getStudentWeakPoints } from '@/app/services/mindmapAiApi';
import { useFocusTrap } from './useFocusTrap';
import type { AnalyzeKnowledgeGraphResponse, WeakPoint, SuggestedConnection } from '@/app/types/mindmap-ai';
import { createCustomEdge } from '@/app/services/mindmapApi';
import { colors, headingStyle } from '@/app/design-system';
import { useCountUp } from '@/app/hooks/useCountUp';

// ── Skeleton shimmer for loading state ─────────────────────
function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-100 rounded-xl ${className || ''}`} />
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-4">
      {/* Score skeleton */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center gap-3">
        <SkeletonBlock className="w-20 h-20 !rounded-full" />
        <SkeletonBlock className="w-28 h-3" />
      </div>
      {/* Summary skeleton */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <SkeletonBlock className="w-full h-3 mb-2" />
        <SkeletonBlock className="w-3/4 h-3 mb-2" />
        <SkeletonBlock className="w-1/2 h-3" />
      </div>
      {/* Section skeleton x2 */}
      {[0, 1].map(i => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
          <SkeletonBlock className="w-24 h-3" />
          <SkeletonBlock className="w-full h-8" />
          <SkeletonBlock className="w-full h-8" />
        </div>
      ))}
    </div>
  );
}

// ── Animated percentage display (uses hook, safe inside .map) ──
function AnimatedPercent({ value, className }: { value: number; className?: string }) {
  const display = useCountUp(Math.round(value * 100), 800);
  return <span className={className}>{display}%</span>;
}

// ── Success checkmark shown when a weak node improves after study ──
function ImprovedCheckmark({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 rounded-xl border border-emerald-100"
      style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
        className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"
      >
        <Check className="w-3 h-3 text-white" strokeWidth={3} />
      </motion.div>
      <span className="font-medium text-emerald-700 truncate">{name}</span>
      <span className="text-emerald-500 flex-shrink-0 ml-auto">Mejorado</span>
    </motion.div>
  );
}

// ── Pull-to-refresh hook (touch-only, lightweight) ──────────
const PULL_THRESHOLD = 60;

function usePullToRefresh(onRefresh: () => void, enabled: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [releasing, setReleasing] = useState(false);
  const isPulling = useRef(false);
  const pullDistanceRef = useRef(0);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled) return;

    // Check prefers-reduced-motion
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const handleTouchStart = (e: TouchEvent) => {
      if (el.scrollTop <= 0) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return;
      if (el.scrollTop > 0) {
        isPulling.current = false;
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }
      const delta = Math.max(0, e.touches[0].clientY - touchStartY.current);
      // Apply rubber-band resistance (diminishing returns past threshold)
      const capped = delta < PULL_THRESHOLD ? delta : PULL_THRESHOLD + (delta - PULL_THRESHOLD) * 0.3;
      const value = reducedMotion ? Math.min(capped, PULL_THRESHOLD) : capped;
      pullDistanceRef.current = value;
      setPullDistance(value);
    };

    const handleTouchEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;
      if (pullDistanceRef.current >= PULL_THRESHOLD) {
        setReleasing(true);
        onRefreshRef.current();
        // Reset after a brief visual moment — clear previous timer to avoid stacking on rapid pulls
        clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = setTimeout(() => {
          pullDistanceRef.current = 0;
          setPullDistance(0);
          setReleasing(false);
        }, 600);
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      clearTimeout(releaseTimerRef.current);
    };
  }, [enabled]);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const pastThreshold = pullDistance >= PULL_THRESHOLD;

  return { scrollRef, pullDistance, progress, pastThreshold, releasing };
}

// ── Props ───────────────────────────────────────────────────

interface AiTutorPanelProps {
  topicId: string;
  /** Called when AI identifies weak nodes — parent highlights them */
  onHighlightNodes?: (nodeIds: Set<string>) => void;
  /** Called when user clicks a weak point — navigate to study action */
  onNavigateToAction?: (keywordId: string, action: 'flashcard' | 'quiz' | 'summary' | 'review') => void;
  /** Whether the panel is open */
  open: boolean;
  onClose: () => void;
  /** Existing node IDs for suggest connections */
  existingNodeIds?: string[];
  /** Existing edge IDs for suggest connections */
  existingEdgeIds?: string[];
  /** Called after accepting a suggested connection to refetch graph */
  onEdgeCreated?: () => void;
  /** Node ID→label map for displaying suggestion names */
  nodeLabels?: Map<string, string>;
  /** Called when AI identifies nodes that need review — shows badge on graph */
  onReviewNodes?: (nodeIds: Set<string>) => void;
}

// ── Component ───────────────────────────────────────────────

export function AiTutorPanel({ topicId, onHighlightNodes, onNavigateToAction, open, onClose, existingNodeIds, existingEdgeIds, onEdgeCreated, nodeLabels, onReviewNodes }: AiTutorPanelProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeKnowledgeGraphResponse | null>(null);
  const [weakPoints, setWeakPoints] = useState<WeakPoint[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedConnection[]>([]);
  const [suggestingConnections, setSuggestingConnections] = useState(false);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());
  const [acceptingKey, setAcceptingKey] = useState<string | null>(null);

  // ── Improved-node detection ──────────────────────────────────
  // Stores previous weak area IDs+names so we can detect when a
  // node improves between analyses (student studied and came back).
  const prevWeakMapRef = useRef<Map<string, string>>(new Map());
  const [improvedNodes, setImprovedNodes] = useState<Array<{ id: string; name: string }>>([]);
  const improvedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Mounted guard — prevents state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; if (improvedTimerRef.current) clearTimeout(improvedTimerRef.current); }; }, []);
  const focusTrapRef = useFocusTrap(open);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onHighlightRef = useRef(onHighlightNodes);
  onHighlightRef.current = onHighlightNodes;
  const onReviewRef = useRef(onReviewNodes);
  onReviewRef.current = onReviewNodes;
  const onNavigateRef = useRef(onNavigateToAction);
  onNavigateRef.current = onNavigateToAction;
  const onEdgeCreatedRef = useRef(onEdgeCreated);
  onEdgeCreatedRef.current = onEdgeCreated;
  // Guard: discard results from stale topicId when user switches topics mid-analysis
  const analyzeTopicRef = useRef(topicId);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); onCloseRef.current(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Reset all state when topicId changes (prevents stale data from previous topic)
  useEffect(() => {
    setAnalysis(null);
    setWeakPoints([]);
    setSuggestions([]);
    setAcceptedSuggestions(new Set());
    setAcceptingKey(null);
    setImprovedNodes([]);
    prevWeakMapRef.current = new Map();
  }, [topicId]);

  const analyzingRef = useRef(false);
  const handleAnalyze = useCallback(async () => {
    if (analyzingRef.current) return;
    analyzingRef.current = true;
    analyzeTopicRef.current = topicId;
    setAnalyzing(true);
    try {
      // Reset previous results at the start of fetch (not before)
      // so the UI stays visible until new data arrives on success
      const [result, weak] = await Promise.all([
        analyzeKnowledgeGraph(topicId),
        getStudentWeakPoints(topicId),
      ]);
      // Discard results if topicId changed while request was in-flight
      if (!mountedRef.current || analyzeTopicRef.current !== topicId) return;

      // ── Detect improved nodes (was weak, now gone or in strong) ──
      const newWeakIds = new Set(result.weak_areas.map(w => w.keyword_id));
      const strongIds = new Set(result.strong_areas.map(s => s.keyword_id));
      if (prevWeakMapRef.current.size > 0) {
        const improved: Array<{ id: string; name: string }> = [];
        for (const [id, name] of prevWeakMapRef.current) {
          if (!newWeakIds.has(id) || strongIds.has(id)) {
            improved.push({ id, name });
          }
        }
        if (improved.length > 0) {
          setImprovedNodes(improved);
          // Clear after 2.5s — enough time to notice, not enough to annoy
          if (improvedTimerRef.current) clearTimeout(improvedTimerRef.current);
          improvedTimerRef.current = setTimeout(() => {
            if (mountedRef.current) setImprovedNodes([]);
          }, 2500);
        }
      }
      // Store current weak areas for next comparison
      const nextWeakMap = new Map<string, string>();
      for (const wa of result.weak_areas) nextWeakMap.set(wa.keyword_id, wa.keyword_name);
      prevWeakMapRef.current = nextWeakMap;

      setAnalysis(result);
      setWeakPoints(weak);
      // Highlight weak nodes on the graph
      if (result.weak_areas.length > 0) {
        const weakIds = new Set(result.weak_areas.map(w => w.keyword_id));
        onHighlightRef.current?.(weakIds);
        onReviewRef.current?.(weakIds);
      }
      toast.success('Análisis completado');
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('AI analysis failed:', err);
      if (mountedRef.current) toast.error('Error al analizar el mapa');
    } finally {
      analyzingRef.current = false;
      if (mountedRef.current) setAnalyzing(false);
    }
  }, [topicId]);

  const handleWeakPointClick = useCallback((wp: WeakPoint) => {
    onHighlightRef.current?.(new Set([wp.keyword_id]));
    onNavigateRef.current?.(wp.keyword_id, wp.recommended_action);
  }, []);

  const suggestingRef = useRef(false);
  const handleSuggestConnections = useCallback(async () => {
    if (suggestingRef.current || !existingNodeIds?.length) return;
    suggestingRef.current = true;
    setSuggestingConnections(true);
    try {
      const result = await suggestStudentConnections(topicId, existingNodeIds, existingEdgeIds || []);
      if (!mountedRef.current) return;
      setSuggestions(result);
      setAcceptedSuggestions(new Set());
      if (result.length === 0) {
        toast.info('No se encontraron conexiones sugeridas');
      }
    } catch {
      if (mountedRef.current) toast.error('Error al sugerir conexiones');
    } finally {
      suggestingRef.current = false;
      if (mountedRef.current) setSuggestingConnections(false);
    }
  }, [topicId, existingNodeIds, existingEdgeIds]);

  const acceptedRef = useRef(acceptedSuggestions);
  acceptedRef.current = acceptedSuggestions;
  const acceptingKeyRef = useRef(acceptingKey);
  acceptingKeyRef.current = acceptingKey;

  const handleAcceptSuggestion = useCallback(async (suggestion: SuggestedConnection) => {
    const key = `${suggestion.source}-${suggestion.target}`;
    if (acceptedRef.current.has(key) || acceptingKeyRef.current === key) return;
    setAcceptingKey(key);
    try {
      await createCustomEdge({
        source_node_id: suggestion.source,
        target_node_id: suggestion.target,
        label: suggestion.reason,
        connection_type: suggestion.type,
        topic_id: topicId,
      });
      if (!mountedRef.current) return;
      setAcceptedSuggestions(prev => new Set(prev).add(key));
      onEdgeCreatedRef.current?.();
      toast.success('Conexión añadida al mapa');
    } catch (err: unknown) {
      if (mountedRef.current) toast.error(err instanceof Error ? err.message : 'Error al crear conexión');
    } finally {
      if (mountedRef.current) setAcceptingKey(null);
    }
  }, [topicId]);

  const handleDismissSuggestion = useCallback((suggestion: SuggestedConnection) => {
    setSuggestions(prev => prev.filter(s => !(s.source === suggestion.source && s.target === suggestion.target)));
  }, []);

  const scoreColor = analysis
    ? analysis.overall_score >= 0.7 ? colors.semantic.success : analysis.overall_score >= 0.4 ? colors.semantic.warning : colors.semantic.error
    : colors.text.tertiary;

  // Count-up animation for overall score (shared hook, respects reduced-motion)
  const targetScore = analysis ? Math.round(analysis.overall_score * 100) : 0;
  const displayScore = useCountUp(targetScore, 800);

  const ACTION_ICONS: Record<string, typeof Layers> = {
    flashcard: Layers,
    quiz: HelpCircle,
    summary: FileText,
    review: Route,
  };

  const ACTION_LABELS: Record<string, string> = {
    flashcard: 'Flashcards',
    quiz: 'Quiz',
    summary: 'Resumen',
    review: 'Revisar',
  };

  // Pull-to-refresh — only active when analysis results exist
  const { scrollRef, pullDistance, progress, pastThreshold, releasing } = usePullToRefresh(
    handleAnalyze,
    !!analysis && !analyzing,
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 320 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 320 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          ref={focusTrapRef}
          className="absolute right-0 top-0 bottom-0 w-80 sm:w-[22rem] bg-surface-page border-l border-gray-200 shadow-lg z-20 flex flex-col overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Panel de IA Tutor"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-ax-primary-50 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-ax-primary-500" aria-hidden="true" />
              </div>
              <h3
                className="font-semibold text-gray-900"
                style={{ ...headingStyle, fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
              >
                IA Tutor
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Cerrar panel IA"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body — scrollable */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Pull-to-refresh indicator (touch-only) */}
            <AnimatePresence>
              {pullDistance > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: pullDistance > 8 ? 40 : 0, opacity: progress }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
                  className="flex items-center justify-center overflow-hidden -mt-1 mb-1"
                >
                  {releasing ? (
                    <Loader2
                      className="w-4 h-4 text-ax-primary-500 animate-spin"
                    />
                  ) : (
                    <motion.div
                      className="flex items-center gap-1.5"
                      animate={{ rotate: pastThreshold ? 180 : 0 }}
                      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                    >
                      <ArrowDown
                        className="w-3.5 h-3.5"
                        style={{ color: pastThreshold ? colors.primary[500] : colors.text.tertiary }}
                      />
                      <span
                        className="font-medium"
                        style={{
                          fontSize: 'clamp(0.625rem, 1vw, 0.6875rem)',
                          color: pastThreshold ? colors.primary[500] : colors.text.tertiary,
                        }}
                      >
                        {pastThreshold ? 'Soltar para actualizar' : 'Tira hacia abajo'}
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            {/* Empty state — beautiful CTA before analysis */}
            {!analysis && !analyzing && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-ax-primary-50 flex items-center justify-center mb-4">
                  <Brain className="w-7 h-7 text-ax-primary-500" aria-hidden="true" />
                </div>
                <h4
                  className="font-semibold text-gray-900 mb-1.5"
                  style={{ ...headingStyle, fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
                >
                  Analiza tu mapa
                </h4>
                <p
                  className="text-gray-500 mb-5 leading-relaxed"
                  style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                >
                  La IA evaluará tu dominio, identificará puntos débiles y te sugerirá una ruta de estudio personalizada.
                </p>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 font-medium text-white rounded-full transition-colors hover:bg-ax-primary-600 disabled:opacity-60"
                  style={{ backgroundColor: colors.primary[500], fontSize: 'clamp(0.8125rem, 1.3vw, 0.875rem)' }}
                >
                  <Sparkles className="w-4 h-4" />
                  Analizar mi mapa
                </button>
              </motion.div>
            )}

            {/* Skeleton loading state */}
            {analyzing && <div aria-live="polite" aria-atomic="true"><p className="sr-only">Analizando tu mapa de conocimiento...</p><AnalysisSkeleton /></div>}

            {/* Analysis results */}
            {analysis && !analyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
                aria-live="polite"
                aria-atomic="true"
              >
                {/* Overall score card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                    className="w-20 h-20 rounded-full border-[5px] flex items-center justify-center mb-2"
                    style={{ borderColor: scoreColor }}
                  >
                    <span
                      className="font-bold"
                      style={{ color: scoreColor, fontSize: 'clamp(1.25rem, 2vw, 1.5rem)' }}
                    >
                      {displayScore}%
                    </span>
                  </motion.div>
                  <p
                    className="text-gray-500"
                    style={{ fontSize: 'clamp(0.6875rem, 1.1vw, 0.75rem)' }}
                  >
                    Puntuación general
                  </p>
                </div>

                {/* Summary card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <p
                    className="text-gray-600 leading-relaxed"
                    style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                  >
                    {analysis.summary_text}
                  </p>
                </div>

                {/* Improved nodes banner — shows briefly after re-analysis */}
                <AnimatePresence>
                  {improvedNodes.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                      className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-4 overflow-hidden"
                    >
                      <h4
                        className="flex items-center gap-1.5 font-medium text-emerald-600 mb-3"
                        style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Progreso detectado
                      </h4>
                      <div className="space-y-1.5">
                        {improvedNodes.map((node) => (
                          <ImprovedCheckmark key={node.id} name={node.name} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Weak areas card */}
                {analysis.weak_areas.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <h4
                      className="flex items-center gap-1.5 font-medium text-red-600 mb-3"
                      style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                      Puntos débiles ({analysis.weak_areas.length})
                    </h4>
                    <div className="space-y-1.5">
                      {analysis.weak_areas.map((wa) => (
                        <div
                          key={wa.keyword_id}
                          className="flex items-center justify-between px-3 py-2.5 bg-red-50 rounded-xl cursor-pointer hover:bg-red-100 transition-colors"
                          style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                          onClick={() => onHighlightRef.current?.(new Set([wa.keyword_id]))}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onHighlightRef.current?.(new Set([wa.keyword_id])); } }}
                          role="button"
                          tabIndex={0}
                          aria-label={`Resaltar punto débil: ${wa.keyword_name}, ${Math.round(wa.mastery * 100)}% dominio`}
                        >
                          <span className="font-medium text-red-700 truncate mr-2">{wa.keyword_name}</span>
                          <AnimatedPercent value={wa.mastery} className="text-red-500 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strong areas card */}
                {analysis.strong_areas.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <h4
                      className="flex items-center gap-1.5 font-medium text-emerald-600 mb-3"
                      style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Puntos fuertes ({analysis.strong_areas.length})
                    </h4>
                    <div className="space-y-1.5">
                      {analysis.strong_areas.map((sa) => {
                      const wasImproved = improvedNodes.some(n => n.id === sa.keyword_id);
                      return (
                        <div
                          key={sa.keyword_id}
                          className="flex items-center justify-between px-3 py-2.5 bg-emerald-50 rounded-xl"
                          style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                        >
                          <span className="font-medium text-emerald-700 truncate mr-2 flex items-center gap-1.5">
                            {sa.keyword_name}
                            {/* Animated checkmark badge for recently-improved nodes */}
                            <AnimatePresence>
                              {wasImproved && (
                                <motion.span
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 flex-shrink-0"
                                >
                                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </span>
                          <AnimatedPercent value={sa.mastery} className="text-emerald-500 flex-shrink-0" />
                        </div>
                      );
                    })}
                    </div>
                  </div>
                )}

                {/* Study path card */}
                {analysis.study_path.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <h4
                      className="flex items-center gap-1.5 font-medium text-ax-primary-500 mb-3"
                      style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                    >
                      <Route className="w-3.5 h-3.5" />
                      Ruta de estudio
                    </h4>
                    <div className="space-y-2.5">
                      {analysis.study_path.map((step) => (
                        <div key={step.step} className="flex items-start gap-2.5">
                          <span
                            className="w-6 h-6 rounded-full bg-ax-primary-50 text-ax-primary-500 flex items-center justify-center font-bold flex-shrink-0 mt-0.5"
                            style={{ fontSize: '0.625rem' }}
                          >
                            {step.step}
                          </span>
                          <div className="min-w-0">
                            <p
                              className="font-medium text-gray-700 truncate"
                              style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                            >
                              {step.keyword_name || step.keyword_id}
                            </p>
                            <p
                              className="text-gray-400 mt-0.5"
                              style={{ fontSize: 'clamp(0.625rem, 1vw, 0.6875rem)' }}
                            >
                              {step.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Re-analyze button */}
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 font-medium text-ax-primary-500 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-ax-primary-50 transition-colors"
                  style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Analizar de nuevo
                </button>
              </motion.div>
            )}

            {/* Suggest connections button — always visible when graph has nodes */}
            {existingNodeIds && existingNodeIds.length > 0 && (
              <div className="pt-1">
                <button
                  onClick={handleSuggestConnections}
                  disabled={suggestingConnections}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 font-medium text-white rounded-full transition-colors disabled:opacity-60 hover:bg-ax-primary-600"
                  style={{ backgroundColor: colors.primary[700], fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                >
                  {suggestingConnections ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Buscando conexiones...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5" />
                      Sugerir conexiones
                    </>
                  )}
                </button>

                {/* Suggested connections list */}
                {suggestions.length > 0 && (
                  <div className="mt-3 space-y-2" aria-live="polite">
                    <h4
                      className="flex items-center gap-1.5 font-medium text-gray-600 px-1"
                      style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                    >
                      <Link2 className="w-3.5 h-3.5 text-ax-primary-500" />
                      Conexiones sugeridas ({suggestions.length})
                    </h4>
                    {suggestions.map((s) => {
                      const key = `${s.source}-${s.target}`;
                      const accepted = acceptedSuggestions.has(key);
                      const sourceName = nodeLabels?.get(s.source) || s.source.slice(0, 8);
                      const targetName = nodeLabels?.get(s.target) || s.target.slice(0, 8);
                      return (
                        <div
                          key={key}
                          className={`rounded-2xl border p-3 transition-colors ${
                            accepted
                              ? 'bg-ax-primary-50 border-ax-primary-500/30'
                              : 'bg-white border-gray-100 shadow-sm'
                          }`}
                        >
                          <div
                            className="flex items-center gap-1.5 mb-1.5"
                            style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                          >
                            <span className="font-medium text-gray-700 truncate">{sourceName}</span>
                            <span className="text-gray-300">→</span>
                            <span className="font-medium text-gray-700 truncate">{targetName}</span>
                          </div>
                          <p
                            className="text-gray-400 mb-2 line-clamp-2"
                            style={{ fontSize: 'clamp(0.625rem, 1vw, 0.6875rem)' }}
                          >
                            {s.reason}
                          </p>
                          <div className="flex items-center justify-between">
                            <span
                              className="text-gray-400"
                              style={{ fontSize: 'clamp(0.625rem, 1vw, 0.6875rem)' }}
                            >
                              {Math.round(s.confidence * 100)}% confianza · {s.type}
                            </span>
                            {accepted ? (
                              <span
                                className="text-ax-primary-500 font-medium flex items-center gap-0.5"
                                style={{ fontSize: 'clamp(0.625rem, 1vw, 0.6875rem)' }}
                              >
                                <Check className="w-3 h-3" /> Añadida
                              </span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleAcceptSuggestion(s)}
                                  disabled={acceptingKey === key}
                                  className="w-9 h-9 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-full text-ax-primary-500 hover:bg-ax-primary-50 disabled:opacity-50 transition-colors"
                                  aria-label="Aceptar conexión"
                                  title="Aceptar"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDismissSuggestion(s)}
                                  className="w-9 h-9 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
                                  aria-label="Rechazar conexión"
                                  title="Rechazar"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Weak points list (always available after first analysis) */}
            {weakPoints.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <h4
                  className="font-medium text-gray-500 mb-2.5"
                  style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                >
                  Conceptos para repasar
                </h4>
                <div className="space-y-0.5">
                  {weakPoints.map((wp) => {
                    const Icon = ACTION_ICONS[wp.recommended_action] || Route;
                    return (
                      <button
                        key={wp.keyword_id}
                        onClick={() => handleWeakPointClick(wp)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left hover:bg-gray-50 transition-colors group"
                        style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                      >
                        <Icon className="w-4 h-4 text-gray-400 group-hover:text-ax-primary-500 flex-shrink-0 transition-colors" />
                        <span className="truncate flex-1 text-gray-600 group-hover:text-gray-800">{wp.name}</span>
                        <span
                          className="text-gray-400 flex-shrink-0 bg-gray-50 px-2 py-0.5 rounded-full"
                          style={{ fontSize: 'clamp(0.625rem, 1vw, 0.6875rem)' }}
                        >
                          {ACTION_LABELS[wp.recommended_action]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
