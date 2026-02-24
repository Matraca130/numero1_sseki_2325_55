// ============================================================
// Axon — ConnectionsMap (mini SVG visualization)
//
// Central node: current keyword (with mastery color)
// Connected nodes: related keywords (with colors)
// Lines with relationship labels
// Max 8 nodes displayed
// ============================================================
import React, { useMemo } from 'react';
import clsx from 'clsx';
import {
  type MasteryColor,
  getMasteryColor,
  getMasteryTailwind,
} from '@/app/lib/mastery-helpers';

interface ConnectionNode {
  id: string;
  name: string;
  relationship: string | null;
  mastery: number; // -1 = no data
  isCrossSummary: boolean;
}

interface ConnectionsMapProps {
  centralKeyword: { id: string; name: string; mastery: number };
  nodes: ConnectionNode[];
  onNodeClick?: (keywordId: string) => void;
  className?: string;
}

// Color hex for SVG
const colorHex: Record<MasteryColor, string> = {
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  gray: '#a1a1aa',
};

const colorHexLight: Record<MasteryColor, string> = {
  green: '#10b98133',
  yellow: '#f59e0b33',
  red: '#ef444433',
  gray: '#a1a1aa33',
};

export function ConnectionsMap({
  centralKeyword,
  nodes,
  onNodeClick,
  className,
}: ConnectionsMapProps) {
  // Limit to 8 nodes max
  const visibleNodes = nodes.slice(0, 8);
  const count = visibleNodes.length;

  // SVG dimensions
  const W = 320;
  const H = Math.max(200, count > 4 ? 240 : 200);
  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(W, H) * 0.34;

  // Calculate node positions in a circle around center
  const nodePositions = useMemo(() => {
    return visibleNodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      return {
        ...node,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
  }, [visibleNodes, count, cx, cy, radius]);

  const centralColor: MasteryColor = centralKeyword.mastery < 0
    ? 'gray'
    : getMasteryColor(centralKeyword.mastery);

  if (count === 0) {
    return (
      <div className={clsx('flex items-center justify-center py-4', className)}>
        <p className="text-[10px] text-zinc-600 italic">Sin conexiones para visualizar</p>
      </div>
    );
  }

  return (
    <div className={clsx('w-full', className)}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        className="select-none"
      >
        {/* Background */}
        <rect width={W} height={H} fill="transparent" />

        {/* Connection lines */}
        {nodePositions.map((node) => {
          const nodeColor: MasteryColor = node.mastery < 0
            ? 'gray'
            : getMasteryColor(node.mastery);
          return (
            <g key={`line-${node.id}`}>
              <line
                x1={cx}
                y1={cy}
                x2={node.x}
                y2={node.y}
                stroke={colorHex[nodeColor]}
                strokeWidth={1.5}
                strokeOpacity={0.35}
                strokeDasharray={node.isCrossSummary ? '4 3' : 'none'}
              />
              {/* Relationship label on line */}
              {node.relationship && (
                <text
                  x={(cx + node.x) / 2}
                  y={(cy + node.y) / 2 - 5}
                  textAnchor="middle"
                  fill="#71717a"
                  fontSize={7}
                  fontStyle="italic"
                  className="pointer-events-none"
                >
                  {node.relationship.length > 18
                    ? node.relationship.slice(0, 16) + '...'
                    : node.relationship}
                </text>
              )}
            </g>
          );
        })}

        {/* Central node */}
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={24}
            fill={colorHexLight[centralColor]}
            stroke={colorHex[centralColor]}
            strokeWidth={2}
          />
          <circle
            cx={cx}
            cy={cy}
            r={6}
            fill={colorHex[centralColor]}
          />
          <text
            x={cx}
            y={cy + 34}
            textAnchor="middle"
            fill="#e4e4e7"
            fontSize={9}
            className="pointer-events-none"
          >
            {centralKeyword.name.length > 16
              ? centralKeyword.name.slice(0, 14) + '...'
              : centralKeyword.name}
          </text>
        </g>

        {/* Connected nodes */}
        {nodePositions.map((node) => {
          const nodeColor: MasteryColor = node.mastery < 0
            ? 'gray'
            : getMasteryColor(node.mastery);
          return (
            <g
              key={`node-${node.id}`}
              className="cursor-pointer"
              onClick={() => onNodeClick?.(node.id)}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={16}
                fill={colorHexLight[nodeColor]}
                stroke={colorHex[nodeColor]}
                strokeWidth={1.5}
                className="transition-all hover:opacity-80"
              />
              {/* Cross-summary indicator: small external arrow */}
              {node.isCrossSummary && (
                <circle
                  cx={node.x + 11}
                  cy={node.y - 11}
                  r={4}
                  fill="#8b5cf6"
                  stroke="#27272a"
                  strokeWidth={1}
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r={4}
                fill={colorHex[nodeColor]}
              />
              <text
                x={node.x}
                y={node.y + 25}
                textAnchor="middle"
                fill="#a1a1aa"
                fontSize={8}
                className="pointer-events-none"
              >
                {node.name.length > 14
                  ? node.name.slice(0, 12) + '...'
                  : node.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-1 mb-1">
        <span className="flex items-center gap-1 text-[8px] text-zinc-600">
          <span className="w-3 h-px bg-zinc-500 inline-block" /> mismo resumen
        </span>
        <span className="flex items-center gap-1 text-[8px] text-zinc-600">
          <span className="w-3 h-px bg-zinc-500 inline-block border-b border-dashed" style={{ borderBottom: '1px dashed #a1a1aa' }} /> otro resumen
        </span>
        <span className="flex items-center gap-1 text-[8px] text-zinc-600">
          <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" /> cross-ref
        </span>
      </div>
    </div>
  );
}
