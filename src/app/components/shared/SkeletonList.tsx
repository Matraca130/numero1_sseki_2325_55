// ============================================================
// Axon — SkeletonList
// Shimmer-animated skeleton for list views (flashcards, quizzes, etc.).
// ============================================================

export interface SkeletonListProps {
  /** Number of placeholder rows */
  rows?: number;
  /** Show circular avatar placeholder */
  showAvatar?: boolean;
  /** Show action button placeholder on the right */
  showAction?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function SkeletonList({
  rows = 5,
  showAvatar = false,
  showAction = false,
  className = '',
}: SkeletonListProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-gray-200 shadow-sm p-4"
        >
          {showAvatar && (
            <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200 animate-pulse" />
          )}

          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/5 rounded-md bg-gray-200 animate-pulse" />
            <div className="h-2.5 w-2/5 rounded-md bg-gray-200 animate-pulse" />
          </div>

          {showAction && (
            <div className="h-8 w-16 shrink-0 rounded-full bg-gray-200 animate-pulse" />
          )}
        </div>
      ))}
    </div>
  );
}
