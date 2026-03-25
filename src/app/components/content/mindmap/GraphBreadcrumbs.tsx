// ============================================================
// GraphBreadcrumbs — breadcrumb nav for collapsed branch drill-down
// Extracted from KnowledgeGraph.tsx (pure refactor)
// ============================================================

import { memo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { GraphI18nStrings } from './graphI18n';

export interface GraphBreadcrumbsProps {
  breadcrumbs: Array<{ id: string; label: string }>;
  onBreadcrumbClick: (crumbId: string | null) => void;
  t: GraphI18nStrings;
}

export const GraphBreadcrumbs = memo(function GraphBreadcrumbs({
  breadcrumbs,
  onBreadcrumbClick,
  t,
}: GraphBreadcrumbsProps) {
  if (breadcrumbs.length === 0) return null;

  return (
    <nav
      className="absolute top-2 left-2 z-[6] flex items-center gap-0.5 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 px-2 py-1.5 text-[11px] max-w-[calc(100%-1rem)] overflow-x-auto"
      aria-label={t.breadcrumbNav}
    >
      <button
        onClick={() => onBreadcrumbClick(null)}
        className="text-teal-700 hover:text-teal-900 hover:underline whitespace-nowrap font-medium transition-colors"
      >
        {t.breadcrumbRoot}
      </button>
      {breadcrumbs.map((crumb, i) => (
        <span key={crumb.id} className="flex items-center gap-0.5">
          <ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
          {i < breadcrumbs.length - 1 ? (
            <button
              onClick={() => onBreadcrumbClick(crumb.id)}
              className="text-teal-700 hover:text-teal-900 hover:underline whitespace-nowrap transition-colors"
            >
              {crumb.label}
            </button>
          ) : (
            <span className="text-gray-600 font-medium whitespace-nowrap">
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
});
