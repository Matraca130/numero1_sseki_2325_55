// ============================================================
// Axon — GraphSkeleton
//
// Content-shaped skeleton loader for the knowledge graph.
// Shows placeholder circles (nodes) and lines (edges) with
// a shimmer gradient animation for a premium loading feel.
//
// Variants:
//   - default: full-page graph skeleton with label
//   - mini: compact version for MicroGraphPanel embeds
//
// Respects prefers-reduced-motion by disabling animation.
// ============================================================

const NODES = [
  { cx: 88, cy: 84, r: 22 },
  { cx: 200, cy: 50, r: 26 },
  { cx: 312, cy: 78, r: 20 },
  { cx: 140, cy: 154, r: 24 },
  { cx: 260, cy: 140, r: 18 },
  { cx: 80, cy: 210, r: 16 },
  { cx: 200, cy: 202, r: 22 },
  { cx: 320, cy: 190, r: 20 },
];

const MINI_NODES = [
  { cx: 60, cy: 40, r: 14 },
  { cx: 140, cy: 28, r: 16 },
  { cx: 220, cy: 44, r: 12 },
  { cx: 100, cy: 80, r: 14 },
  { cx: 180, cy: 74, r: 10 },
];

const EDGES: [number, number][] = [
  [0, 1], [1, 2], [0, 3], [1, 4], [3, 4],
  [3, 5], [3, 6], [4, 7], [6, 7], [5, 6],
];

const MINI_EDGES: [number, number][] = [
  [0, 1], [1, 2], [0, 3], [1, 4], [3, 4],
];

interface GraphSkeletonProps {
  /** Optional label below the skeleton */
  label?: string;
  className?: string;
  /** Compact variant for embedded panels */
  variant?: 'default' | 'mini';
}

export function GraphSkeleton({
  label = 'Cargando mapa de conocimiento...',
  className = '',
  variant = 'default',
}: GraphSkeletonProps) {
  const isMini = variant === 'mini';
  const nodes = isMini ? MINI_NODES : NODES;
  const edges = isMini ? MINI_EDGES : EDGES;
  const viewBox = isMini ? '0 0 280 110' : '0 0 400 260';
  const labelIndices = isMini ? [0, 1, 3] : [0, 1, 3, 4, 6];

  const wrapperClass = isMini
    ? `w-full bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center overflow-hidden ${className}`
    : `w-full h-full min-h-[180px] sm:min-h-[300px] bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center overflow-hidden ${className}`;

  return (
    <div className={wrapperClass} role="status" aria-label={label || 'Cargando grafo'}>
      <svg
        viewBox={viewBox}
        className={`w-full ${isMini ? 'max-w-[240px] h-auto px-3 py-2' : 'max-w-md h-auto px-6'}`}
        aria-hidden="true"
      >
        <defs>
          {/* Shimmer gradient that sweeps left-to-right */}
          <linearGradient id={`skeleton-shimmer-${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="40%" stopColor="#e5e7eb" />
            <stop offset="50%" stopColor="#f3f4f6" />
            <stop offset="60%" stopColor="#e5e7eb" />
            <stop offset="100%" stopColor="#e5e7eb" />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              from="-1 0"
              to="1 0"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </linearGradient>
        </defs>

        {/* Edges */}
        {edges.map(([from, to], i) => {
          const a = nodes[from];
          const b = nodes[to];
          return (
            <line
              key={`e-${i}`}
              x1={a.cx}
              y1={a.cy}
              x2={b.cx}
              y2={b.cy}
              stroke="#e5e7eb"
              strokeWidth={isMini ? 1 : 1.5}
              strokeLinecap="round"
            />
          );
        })}
        {/* Nodes — filled with shimmer gradient */}
        {nodes.map((node, i) => (
          <circle
            key={`n-${i}`}
            cx={node.cx}
            cy={node.cy}
            r={node.r}
            fill={`url(#skeleton-shimmer-${variant})`}
            stroke={i % 2 === 0 ? '#d1d5db' : '#e5e7eb'}
            strokeWidth={isMini ? 1 : 1.5}
          />
        ))}
        {/* Label placeholders under some nodes */}
        {labelIndices.map(i => {
          const node = nodes[i];
          const w = isMini ? 24 : 36;
          const h = isMini ? 4 : 6;
          return (
            <rect
              key={`lbl-${i}`}
              x={node.cx - w / 2}
              y={node.cy + node.r + (isMini ? 4 : 6)}
              width={w}
              height={h}
              rx={h / 2}
              fill={`url(#skeleton-shimmer-${variant})`}
            />
          );
        })}
      </svg>
      {label && !isMini && (
        <p className="text-xs text-gray-400 mt-3 animate-pulse motion-reduce:animate-none">{label}</p>
      )}
    </div>
  );
}
