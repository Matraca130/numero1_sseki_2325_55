// ============================================================
// Axon — Skeleton loading components
// Reusable shimmer placeholders for various loading states.
// ============================================================
import React from 'react';

// -- Base shimmer bar ------------------------------------------

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
    />
  );
}

// -- SkeletonCard: generic card placeholder --------------------

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-5 space-y-3 ${className}`}>
      <Shimmer className="h-4 w-2/3" />
      <Shimmer className="h-3 w-1/2" />
      <Shimmer className="h-2 w-full mt-2" />
    </div>
  );
}

// -- SkeletonList: rows of text placeholders -------------------

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Shimmer className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-3/4" />
            <Shimmer className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// -- SkeletonSchedule: full-page schedule loading state --------

export function SkeletonSchedule() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Shimmer className="h-7 w-48" />
        <Shimmer className="h-4 w-64" />
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-2">
        <Shimmer className="h-9 w-24 rounded-lg" />
        <Shimmer className="h-9 w-24 rounded-lg" />
        <Shimmer className="h-9 w-24 rounded-lg" />
      </div>

      {/* 3-column layout skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Shimmer className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Shimmer className="h-4 w-3/4" />
                  <Shimmer className="h-3 w-1/2" />
                </div>
                <Shimmer className="h-6 w-16 rounded-full" />
              </div>
              <Shimmer className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>

        {/* Sidebar column */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <Shimmer className="h-5 w-32" />
            <Shimmer className="h-40 w-full rounded-lg" />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <Shimmer className="h-5 w-28" />
            <Shimmer className="h-24 w-full rounded-lg" />
            <Shimmer className="h-3 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

// -- SkeletonStats: KPI card row placeholder -------------------

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shimmer className="h-8 w-8 rounded-lg" />
            <Shimmer className="h-3 w-20" />
          </div>
          <Shimmer className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}
