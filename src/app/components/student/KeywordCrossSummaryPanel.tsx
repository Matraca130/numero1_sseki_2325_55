import { Component, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useKeywordSearchQuery } from '@/app/hooks/queries/useKeywordConnectionsQueries';

interface KeywordCrossSummaryPanelProps {
  keywordName: string;
  currentSummaryId: string;
  onNavigate?: (summaryId: string) => void;
}

/** Silently swallow errors (e.g. missing QueryClientProvider in tests). */
class SafeBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

function KeywordCrossSummaryPanelInner({
  keywordName,
  currentSummaryId,
  onNavigate,
}: KeywordCrossSummaryPanelProps) {
  const { data: results, isLoading } = useKeywordSearchQuery(
    keywordName,
    currentSummaryId,
  );

  if (isLoading) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 pt-2">
        <Loader2 size={12} className="animate-spin" />
        Buscando...
      </span>
    );
  }

  if (!results || results.length === 0) {
    return (
      <span className="block text-xs text-gray-400 dark:text-gray-500 italic pt-2">
        Este keyword solo aparece aquí
      </span>
    );
  }

  // Deduplicate by summary_id (same keyword can appear multiple times in a summary)
  const uniqueSummaries = Array.from(
    new Map(results.map((r) => [r.summary_id, r])).values(),
  );

  return (
    <span className="block pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
      <span className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
        También aparece en:
      </span>
      <span className="block space-y-0.5">
        {uniqueSummaries.map((item) => (
          <span
            key={item.summary_id}
            role="button"
            tabIndex={0}
            className="block text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline cursor-pointer truncate"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate?.(item.summary_id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onNavigate?.(item.summary_id);
              }
            }}
          >
            {item.summary_title || 'Resumen sin título'}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function KeywordCrossSummaryPanel(
  props: KeywordCrossSummaryPanelProps,
) {
  return (
    <SafeBoundary>
      <KeywordCrossSummaryPanelInner {...props} />
    </SafeBoundary>
  );
}
