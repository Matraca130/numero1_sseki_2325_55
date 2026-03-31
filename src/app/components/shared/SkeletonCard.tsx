// ============================================================
// Axon — SkeletonCard
// Shimmer-animated skeleton placeholder for KPI, content, and chart cards.
// ============================================================

export interface SkeletonCardProps {
  /** Visual variant */
  variant?: 'kpi' | 'content' | 'chart';
  /** Number of skeleton cards to render */
  count?: number;
  /** Additional CSS classes */
  className?: string;
}

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
    />
  );
}

function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
      <Shimmer className="h-3 w-20" />
      <Shimmer className="h-7 w-28" />
      <Shimmer className="h-2.5 w-16" />
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <Shimmer className="h-36 w-full rounded-none" />
      <div className="p-4 space-y-2.5">
        <Shimmer className="h-4 w-3/4" />
        <Shimmer className="h-3 w-full" />
        <Shimmer className="h-3 w-5/6" />
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
      <Shimmer className="h-4 w-32" />
      <div className="flex items-end gap-2 h-40">
        <Shimmer className="flex-1 h-[60%]" />
        <Shimmer className="flex-1 h-[80%]" />
        <Shimmer className="flex-1 h-[45%]" />
        <Shimmer className="flex-1 h-[90%]" />
        <Shimmer className="flex-1 h-[55%]" />
        <Shimmer className="flex-1 h-[70%]" />
        <Shimmer className="flex-1 h-[40%]" />
      </div>
    </div>
  );
}

const VARIANT_MAP = {
  kpi: KpiSkeleton,
  content: ContentSkeleton,
  chart: ChartSkeleton,
} as const;

export function SkeletonCard({
  variant = 'kpi',
  count = 1,
  className = '',
}: SkeletonCardProps) {
  const Component = VARIANT_MAP[variant];

  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => (
        <Component key={i} />
      ))}
    </div>
  );
}
