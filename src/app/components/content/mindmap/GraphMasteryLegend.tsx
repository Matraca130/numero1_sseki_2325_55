// ============================================================
// GraphMasteryLegend — mastery color legend overlay
// Extracted from KnowledgeGraph.tsx (pure refactor)
// ============================================================

import { memo } from 'react';
import { MASTERY_HEX } from '@/app/types/mindmap';
import type { GraphI18nStrings } from './graphI18n';

export interface GraphMasteryLegendProps {
  t: GraphI18nStrings;
}

export const GraphMasteryLegend = memo(function GraphMasteryLegend({ t }: GraphMasteryLegendProps) {
  return (
    <div
      className="absolute bottom-2 left-2 z-[4] bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 px-2.5 py-2 text-[10px] pointer-events-none hidden sm:block"
      role="group"
      aria-label={t.masteryLegend}
    >
      <div className="font-semibold text-gray-500 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
        {t.masteryLegend}
      </div>
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: MASTERY_HEX.red }} />
          <span className="text-gray-500">{t.masteryLow}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: MASTERY_HEX.yellow }} />
          <span className="text-gray-500">{t.masteryMid}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: MASTERY_HEX.green }} />
          <span className="text-gray-500">{t.masteryHigh}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: MASTERY_HEX.gray }} />
          <span className="text-gray-500">{t.masteryNone}</span>
        </div>
      </div>
    </div>
  );
});
