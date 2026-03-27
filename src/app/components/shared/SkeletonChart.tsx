// ============================================================
// Axon — SkeletonChart
// Shimmer-animated skeleton for chart/graph areas.
// ============================================================

export interface SkeletonChartProps {
  /** Height class (Tailwind), e.g. 'h-64' */
  height?: string;
  /** Chart type shape */
  type?: 'bar' | 'line' | 'donut';
  /** Additional CSS classes */
  className?: string;
}

function BarSkeleton({ height }: { height: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 shadow-sm p-5 ${height}`}>
      <div className="h-4 w-28 rounded-md bg-gray-200 animate-pulse mb-4" />
      <div className="flex items-end gap-3 h-[calc(100%-2.5rem)]">
        {[60, 80, 45, 90, 55, 70, 40].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md bg-gray-200 animate-pulse"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function LineSkeleton({ height }: { height: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 shadow-sm p-5 ${height}`}>
      <div className="h-4 w-28 rounded-md bg-gray-200 animate-pulse mb-4" />
      <div className="relative h-[calc(100%-2.5rem)]">
        {/* Wavy line placeholder using stacked rounded bars */}
        <svg
          viewBox="0 0 200 80"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <path
            d="M0,60 C30,40 50,70 80,35 C110,0 130,50 160,30 C180,15 190,45 200,40"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="3"
            className="animate-pulse"
          />
        </svg>
      </div>
    </div>
  );
}

function DonutSkeleton({ height }: { height: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col items-center justify-center ${height}`}>
      <div className="h-4 w-28 rounded-md bg-gray-200 animate-pulse mb-4 self-start" />
      <div className="relative">
        <div className="h-32 w-32 rounded-full border-[12px] border-gray-200 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-10 rounded-md bg-gray-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

const TYPE_MAP = {
  bar: BarSkeleton,
  line: LineSkeleton,
  donut: DonutSkeleton,
} as const;

export function SkeletonChart({
  height = 'h-64',
  type = 'bar',
  className = '',
}: SkeletonChartProps) {
  const Component = TYPE_MAP[type];
  return (
    <div className={className}>
      <Component height={height} />
    </div>
  );
}
