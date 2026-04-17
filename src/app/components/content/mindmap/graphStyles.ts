// ============================================================
// graphStyles — Pure style-computation helpers for G6 graph nodes and edges.
// Extracted from useGraphInit.ts (pure refactor, no logic changes).
// ============================================================

import type { GraphData, MapNode } from '@/app/types/mindmap';
import { colors } from '@/app/design-system';
import { getNodeFill, getNodeStroke, getEdgeColor } from './graphHelpers';
import { NODE_COLOR_FILL } from './useNodeColors';
import { truncateLabel } from '@/app/types/mindmap';

// ── Node style helper (extracted for reuse and readability) ──

export function computeNodeStyle(
  node: MapNode,
  isCollapsed: boolean,
  childCount: number,
  customNodeColors?: Map<string, string>,
  savedPos?: { x: number; y: number },
  comboId?: string,
) {
  const strokeColor = getNodeStroke(node.masteryColor);
  const baseLabel = truncateLabel(node.label);
  const displayLabel = isCollapsed && childCount > 0
    ? baseLabel + ` (+${childCount})`
    : baseLabel;

  return {
    id: node.id,
    ...(comboId ? { combo: comboId } : {}),
    data: {
      label: displayLabel,
      fullLabel: node.label,
      definition: node.definition,
      mastery: node.mastery,
      masteryColor: node.masteryColor,
      type: node.type,
      summaryId: node.summaryId,
      topicId: node.topicId,
      flashcardCount: node.flashcardCount,
      quizCount: node.quizCount,
      annotation: node.annotation,
      needsReview: false,
      _raw: node,
    },
    style: {
      fill: node.isUserCreated && customNodeColors?.get(node.id)
        ? (NODE_COLOR_FILL[customNodeColors.get(node.id)!] || colors.primary[50])
        : node.isUserCreated ? colors.primary[50] : getNodeFill(node.masteryColor),
      stroke: node.isUserCreated && customNodeColors?.get(node.id)
        ? customNodeColors.get(node.id)!
        : node.isUserCreated ? colors.primary[500] : strokeColor,
      lineWidth: isCollapsed ? 2.5 : node.isUserCreated ? 2 : 1.5,
      lineDash: isCollapsed ? [4, 4] : node.isUserCreated ? [6, 3] : undefined,
      shadowColor: 'transparent',
      shadowBlur: 0,
      opacity: 1,
      labelText: displayLabel,
      labelFill: colors.text.primary,
      labelFontSize: 12,
      labelFontFamily: 'Inter, sans-serif',
      size: Math.max(44, Math.min(56, 44 + (node.mastery >= 0 ? node.mastery * 12 : 0))),
      // Donut ring (mastery progress)
      innerR: '65%',
      donuts: (node.mastery >= 0 && node.mastery > 0) ? [node.mastery, 1 - node.mastery] : [0, 1],
      donutPalette: [strokeColor, '#e5e7eb'],
      ...(savedPos ? { x: savedPos.x, y: savedPos.y } : {}),
    },
  };
}

export function computeEdgeStyle(edge: GraphData['edges'][number]) {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    data: {
      label: edge.label,
      connectionType: edge.connectionType,
      _raw: edge,
    },
    style: {
      stroke: edge.customColor || (edge.isUserCreated ? colors.primary[500] : getEdgeColor(edge.connectionType)),
      lineWidth: edge.isUserCreated ? 2 : 1.5,
      lineDash: edge.lineStyle === 'dashed' ? [6, 3]
        : edge.lineStyle === 'dotted' ? [2, 4]
        : edge.isUserCreated && !edge.lineStyle ? [6, 3]
        : undefined,
      opacity: 1,
      endArrow: (edge.directed || !!edge.sourceKeywordId)
        ? { type: edge.arrowType || 'triangle', size: 8 }
        : false,
      labelText: edge.label || undefined,
      labelFill: edge.label ? '#71717a' : undefined,
      labelFontSize: edge.label ? 10 : undefined,
      labelFontFamily: edge.label ? 'Inter, sans-serif' : undefined,
      labelBackground: !!edge.label,
      labelBackgroundFill: edge.label ? '#ffffff' : undefined,
      labelBackgroundOpacity: edge.label ? 0.85 : undefined,
      labelBackgroundRadius: edge.label ? 4 : undefined,
      labelPadding: edge.label ? [2, 6, 2, 6] : undefined,
    },
  };
}
