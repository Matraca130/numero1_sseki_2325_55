// ============================================================
// Axon — MapComparisonPanel
//
// Side panel comparing the student's knowledge map against the
// "ideal" base graph (professor-curated keyword connections).
//
// Shows:
//   - Coverage stats (mastered / learning / weak / no data)
//   - Donut chart of mastery distribution
//   - Gaps: base nodes the student hasn't mastered
//   - Custom additions: student-created nodes & edges
//   - Click on a node → highlights it on the graph
//
// The base graph = all keyword connections for the topic
// (auto-generated from summaries, not student custom)
//
// LANG: Spanish
// ============================================================

import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useFocusTrap } from './useFocusTrap';
import { GitCompareArrows, X, CheckCircle2, AlertTriangle, XCircle, HelpCircle, Plus, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { headingStyle } from '@/app/design-system';
import { useCountUp } from '@/app/hooks/useCountUp';
import type { GraphData, MapNode, MapEdge } from '@/app/types/mindmap';
import { MASTERY_HEX } from '@/app/types/mindmap';

// ── Props ────────────────────────────────────────────────────

interface MapComparisonPanelProps {
  open: boolean;
  onClose: () => void;
  /** Full graph data (base + custom merged) */
  graphData: GraphData | null;
  /** Callback to highlight a set of nodes on the graph */
  onHighlightNodes?: (ids: Set<string> | undefined) => void;
  /** Navigate to study action for a node */
  onNavigateToAction?: (keywordId: string, action: 'flashcard' | 'quiz') => void;
}

// ── Types ────────────────────────────────────────────────────

interface CoverageStats {
  total: number;
  mastered: number;
  learning: number;
  weak: number;
  noData: number;
  avgMastery: number;
  customNodes: number;
  customEdges: number;
  baseNodes: number;
  baseEdges: number;
}

type GapCategory = 'weak' | 'noData';

interface GapNode {
  node: MapNode;
  category: GapCategory;
}

// ── Helpers ──────────────────────────────────────────────────

function computeStats(data: GraphData): CoverageStats {
  const baseNodes = data.nodes.filter(n => !n.isUserCreated);
  const customNodes = data.nodes.filter(n => n.isUserCreated);
  const baseEdges = data.edges.filter(e => !e.isUserCreated);
  const customEdges = data.edges.filter(e => e.isUserCreated);

  let mastered = 0, learning = 0, weak = 0, noData = 0;
  let masterySum = 0;
  let masteryCount = 0;
  for (const n of baseNodes) {
    switch (n.masteryColor) {
      case 'green': mastered++; break;
      case 'yellow': learning++; break;
      case 'red': weak++; break;
      default: noData++;
    }
    if (n.mastery >= 0) { masterySum += n.mastery; masteryCount++; }
  }

  const total = baseNodes.length;
  return {
    total,
    mastered,
    learning,
    weak,
    noData,
    avgMastery: masteryCount > 0 ? masterySum / masteryCount : 0,
    customNodes: customNodes.length,
    customEdges: customEdges.length,
    baseNodes: total,
    baseEdges: baseEdges.length,
  };
}

function findGaps(data: GraphData): GapNode[] {
  return data.nodes
    .filter(n => !n.isUserCreated && (n.masteryColor === 'red' || n.masteryColor === 'gray'))
    .sort((a, b) => a.mastery - b.mastery)
    .map(node => ({
      node,
      category: node.masteryColor === 'red' ? 'weak' as const : 'noData' as const,
    }));
}

// ── Donut Chart ──────────────────────────────────────────────

function MasteryDonut({ stats }: { stats: CoverageStats }) {
  const { mastered, learning, weak, noData, total } = stats;

  // Hooks MUST be called unconditionally (Rules of Hooks)
  const pct = Math.round(stats.avgMastery * 100);
  const animPct = useCountUp(pct, 800);

  if (total === 0) return null;

  const r = 36;
  const cx = 44;
  const cy = 44;
  const circumference = 2 * Math.PI * r;

  const segments = [
    { count: mastered, color: MASTERY_HEX.green },
    { count: learning, color: MASTERY_HEX.yellow },
    { count: weak, color: MASTERY_HEX.red },
    { count: noData, color: MASTERY_HEX.gray },
  ].filter(s => s.count > 0);

  let offset = 0;
  const arcs = segments.map(s => {
    const len = (s.count / total) * circumference;
    const arc = { color: s.color, dashArray: `${len} ${circumference - len}`, dashOffset: -offset };
    offset += len;
    return arc;
  });

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 88 88" className="w-20 h-20" role="img" aria-label={`Dominio promedio: ${animPct}%`}>
        {/* Background ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        {/* Mastery segments */}
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth="8"
            strokeDasharray={arc.dashArray}
            strokeDashoffset={arc.dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        {/* Center text */}
        <text
          x={cx} y={cy - 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-lg font-bold"
          fill="#111827"
          style={{ fontSize: '16px', fontFamily: 'Georgia, serif' }}
        >
          {animPct}%
        </text>
        <text
          x={cx} y={cy + 12}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#9ca3af"
          style={{ fontSize: '8px' }}
        >
          dominio
        </text>
      </svg>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────

export function MapComparisonPanel({
  open,
  onClose,
  graphData,
  onHighlightNodes,
  onNavigateToAction,
}: MapComparisonPanelProps) {
  const focusTrapRef = useFocusTrap(open);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Close on Escape key — use stopPropagation (not stopImmediatePropagation)
  // so sibling document-level handlers (edge reconnect cancel, etc.) still fire
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Ref-stabilize onHighlightNodes to avoid re-running cleanup effect on parent re-render
  const onHighlightNodesRef = useRef(onHighlightNodes);
  onHighlightNodesRef.current = onHighlightNodes;

  // Clear highlight state when panel closes so nodes don't stay highlighted
  useEffect(() => {
    if (!open) onHighlightNodesRef.current?.(undefined);
  }, [open]);

  const stats = useMemo(() => graphData ? computeStats(graphData) : null, [graphData]);
  const gaps = useMemo(() => graphData ? findGaps(graphData) : [], [graphData]);
  const customNodes = useMemo(
    () => graphData?.nodes.filter(n => n.isUserCreated) ?? [],
    [graphData],
  );
  const customEdges = useMemo(
    () => graphData?.edges.filter(e => e.isUserCreated) ?? [],
    [graphData],
  );

  const handleHighlightGaps = useCallback(() => {
    if (gaps.length === 0) return;
    onHighlightNodes?.(new Set(gaps.map(g => g.node.id)));
  }, [gaps, onHighlightNodes]);

  const handleHighlightMastered = useCallback(() => {
    if (!graphData) return;
    const ids = new Set(
      graphData.nodes.filter(n => !n.isUserCreated && n.masteryColor === 'green').map(n => n.id)
    );
    if (ids.size > 0) onHighlightNodes?.(ids);
  }, [graphData, onHighlightNodes]);

  const handleClearHighlight = useCallback(() => {
    onHighlightNodes?.(undefined);
  }, [onHighlightNodes]);

  const handleHighlightCustom = useCallback(() => {
    if (customNodes.length === 0) return;
    onHighlightNodes?.(new Set(customNodes.map(n => n.id)));
  }, [customNodes, onHighlightNodes]);

  // Node label lookup for custom edges
  const nodeLabels = useMemo(() => {
    if (!graphData) return new Map<string, string>();
    return new Map(graphData.nodes.map(n => [n.id, n.label]));
  }, [graphData]);

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
          aria-label="Panel de comparación de mapa"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-ax-primary-50 flex items-center justify-center">
                <GitCompareArrows className="w-4 h-4 text-ax-primary-500" aria-hidden="true" />
              </div>
              <h3
                className="font-semibold text-gray-900"
                style={{ ...headingStyle, fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
              >
                Comparar mapa
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Cerrar panel de comparaci\u00f3n"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!stats || stats.total === 0 ? (
              <EmptyComparison />
            ) : (
              <>
                {/* Overall stats card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <MasteryDonut stats={stats} />
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <StatBadge
                      icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      label="Dominados"
                      count={stats.mastered}
                      color="#10b981"
                      bg="#d1fae5"
                      onClick={handleHighlightMastered}
                    />
                    <StatBadge
                      icon={<AlertTriangle className="w-3.5 h-3.5" />}
                      label="Aprendiendo"
                      count={stats.learning}
                      color="#f59e0b"
                      bg="#fef3c7"
                    />
                    <StatBadge
                      icon={<XCircle className="w-3.5 h-3.5" />}
                      label="D\u00e9biles"
                      count={stats.weak}
                      color="#ef4444"
                      bg="#fee2e2"
                      onClick={handleHighlightGaps}
                    />
                    <StatBadge
                      icon={<HelpCircle className="w-3.5 h-3.5" />}
                      label="Sin datos"
                      count={stats.noData}
                      color="#9ca3af"
                      bg="#f3f4f6"
                    />
                  </div>
                  {/* Clear highlight button */}
                  <button
                    onClick={handleClearHighlight}
                    className="mt-3 w-full text-center text-xs text-gray-500 hover:text-gray-600 transition-colors py-1"
                  >
                    Limpiar resaltado
                  </button>
                </div>

                {/* Gaps section */}
                {gaps.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4
                        className="font-semibold text-gray-900"
                        style={{ ...headingStyle, fontSize: 'clamp(0.8125rem, 1.3vw, 0.875rem)' }}
                      >
                        Brechas de conocimiento
                      </h4>
                      <button
                        onClick={handleHighlightGaps}
                        className="text-xs text-ax-primary-500 hover:underline"
                      >
                        Resaltar
                      </button>
                    </div>
                    <p
                      className="text-gray-500 mb-3 leading-relaxed"
                      style={{ fontSize: 'clamp(0.6875rem, 1.1vw, 0.75rem)' }}
                    >
                      Estos conceptos del mapa base necesitan m\u00e1s estudio.
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {gaps.map(gap => (
                        <GapItem
                          key={gap.node.id}
                          gap={gap}
                          onHighlight={() => onHighlightNodes?.(new Set([gap.node.id]))}
                          onStudy={() => onNavigateToAction?.(gap.node.id, 'flashcard')}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom additions */}
                {(customNodes.length > 0 || customEdges.length > 0) && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4
                        className="font-semibold text-gray-900"
                        style={{ ...headingStyle, fontSize: 'clamp(0.8125rem, 1.3vw, 0.875rem)' }}
                      >
                        Tus aportes
                      </h4>
                      {customNodes.length > 0 && (
                        <button
                          onClick={handleHighlightCustom}
                          className="text-xs text-ax-primary-500 hover:underline"
                        >
                          Resaltar
                        </button>
                      )}
                    </div>
                    <p
                      className="text-gray-500 mb-3 leading-relaxed"
                      style={{ fontSize: 'clamp(0.6875rem, 1.1vw, 0.75rem)' }}
                    >
                      Conceptos y conexiones que has a\u00f1adido al mapa.
                    </p>
                    {customNodes.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {customNodes.map(node => (
                          <div
                            key={node.id}
                            className="flex items-center gap-2.5 px-3 py-2 bg-ax-primary-50 rounded-xl cursor-pointer hover:bg-ax-primary-100 transition-colors"
                            onClick={() => onHighlightNodes?.(new Set([node.id]))}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onHighlightNodes?.(new Set([node.id])); } }}
                            role="button"
                            tabIndex={0}
                            aria-label={`Resaltar concepto personalizado: ${node.label}`}
                          >
                            <Plus className="w-3.5 h-3.5 text-ax-primary-500 flex-shrink-0" aria-hidden="true" />
                            <span
                              className="text-ax-primary-500 font-medium truncate"
                              style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                            >
                              {node.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {customEdges.length > 0 && (
                      <div className="space-y-1.5">
                        {customEdges.map(edge => (
                          <CustomEdgeItem key={edge.id} edge={edge} nodeLabels={nodeLabels} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Summary card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <h4
                    className="font-semibold text-gray-900 mb-2"
                    style={{ ...headingStyle, fontSize: 'clamp(0.8125rem, 1.3vw, 0.875rem)' }}
                  >
                    Resumen
                  </h4>
                  <div className="space-y-1.5 text-gray-500" style={{ fontSize: 'clamp(0.6875rem, 1.1vw, 0.75rem)' }}>
                    <p>Mapa base: <span className="font-medium text-gray-700">{stats.baseNodes}</span> conceptos, <span className="font-medium text-gray-700">{stats.baseEdges}</span> conexiones</p>
                    <p>Tus aportes: <span className="font-medium text-ax-primary-500">+{stats.customNodes}</span> conceptos, <span className="font-medium text-ax-primary-500">+{stats.customEdges}</span> conexiones</p>
                    <p>Cobertura: <span className="font-medium text-gray-700">{stats.total > 0 ? Math.round(((stats.mastered + stats.learning) / stats.total) * 100) : 0}%</span> de los conceptos en progreso</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Sub-components ───────────────────────────────────────────

function EmptyComparison() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-ax-primary-50 flex items-center justify-center mb-4">
        <GitCompareArrows className="w-7 h-7 text-ax-primary-500" aria-hidden="true" />
      </div>
      <h4
        className="font-semibold text-gray-900 mb-1.5"
        style={{ ...headingStyle, fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
      >
        Sin datos para comparar
      </h4>
      <p
        className="text-gray-500 leading-relaxed"
        style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
      >
        Estudia m\u00e1s contenido para construir tu mapa y poder compararlo con el mapa base del curso.
      </p>
    </motion.div>
  );
}

function StatBadge({
  icon, label, count, color, bg, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
  bg: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, 'aria-label': `Resaltar ${label.toLowerCase()}: ${count}` } : {})}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      style={{ backgroundColor: bg }}
    >
      <span style={{ color }}>{icon}</span>
      <div className="text-left">
        <span className="font-bold block" style={{ color, fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>{count}</span>
        <span className="text-gray-500 block" style={{ fontSize: 'clamp(0.5625rem, 0.9vw, 0.625rem)' }}>{label}</span>
      </div>
    </Tag>
  );
}

function GapItem({
  gap,
  onHighlight,
  onStudy,
}: {
  gap: GapNode;
  onHighlight: () => void;
  onStudy: () => void;
}) {
  const isWeak = gap.category === 'weak';
  const pct = gap.node.mastery >= 0 ? Math.round(gap.node.mastery * 100) : null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group">
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: isWeak ? MASTERY_HEX.red : MASTERY_HEX.gray }}
      />
      <button
        onClick={onHighlight}
        className="flex-1 text-left truncate text-gray-700 hover:text-ax-primary-500 transition-colors"
        style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
        title={gap.node.label}
      >
        {gap.node.label}
      </button>
      {pct !== null && (
        <span
          className="text-gray-400 flex-shrink-0"
          style={{ fontSize: 'clamp(0.5625rem, 0.9vw, 0.625rem)' }}
        >
          {pct}%
        </span>
      )}
      <button
        onClick={onStudy}
        className="sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus:opacity-100 px-2.5 py-1 min-h-[44px] sm:min-h-0 text-ax-primary-500 bg-ax-primary-50 rounded-full transition-opacity flex-shrink-0"
        style={{ fontSize: 'clamp(0.5625rem, 0.9vw, 0.625rem)' }}
        title="Estudiar este concepto"
      >
        Estudiar
      </button>
    </div>
  );
}

function CustomEdgeItem({ edge, nodeLabels }: { edge: MapEdge; nodeLabels: Map<string, string> }) {
  const srcLabel = nodeLabels.get(edge.source) || '?';
  const tgtLabel = nodeLabels.get(edge.target) || '?';

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 bg-blue-50 rounded-xl">
      <Link2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" aria-hidden="true" />
      <span
        className="text-blue-700 truncate"
        style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
      >
        {srcLabel} → {tgtLabel}
      </span>
      {edge.label && (
        <span
          className="text-blue-400 flex-shrink-0"
          style={{ fontSize: 'clamp(0.5625rem, 0.9vw, 0.625rem)' }}
        >
          {edge.label}
        </span>
      )}
    </div>
  );
}
