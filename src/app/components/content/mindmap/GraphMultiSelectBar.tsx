// ============================================================
// GraphMultiSelectBar — multi-selection floating action bar
// Extracted from KnowledgeGraph.tsx (pure refactor)
// ============================================================

import { memo } from 'react';
import { X, Link, Trash2, Group, Focus } from 'lucide-react';
import type { GraphI18nStrings } from './graphI18n';

export interface GraphMultiSelectBarProps {
  multiSelectedIds: Set<string>;
  multiSelectedCount: number;
  selectedUserCreatedIds: string[];
  onDeleteNodes?: (nodeIds: string[]) => void;
  onConnectNodes?: (sourceId: string, targetId: string) => void;
  onGroupSelection: () => void;
  onFocusSelection: () => void;
  onClearSelection: () => void;
  t: GraphI18nStrings;
}

export const GraphMultiSelectBar = memo(function GraphMultiSelectBar({
  multiSelectedIds,
  multiSelectedCount,
  selectedUserCreatedIds,
  onDeleteNodes,
  onConnectNodes,
  onGroupSelection,
  onFocusSelection,
  onClearSelection,
  t,
}: GraphMultiSelectBarProps) {
  if (multiSelectedCount === 0) return null;

  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white rounded-xl shadow-lg border border-gray-200 px-3 py-2 text-xs"
      role="toolbar"
      aria-label={t.nSelected(multiSelectedCount)}
    >
      <span className="font-medium text-gray-700 whitespace-nowrap">
        {t.nSelected(multiSelectedCount)}
      </span>
      <div className="w-px h-4 bg-gray-200" />
      {selectedUserCreatedIds.length > 0 && onDeleteNodes && (
        <button
          onClick={() => {
            onDeleteNodes(selectedUserCreatedIds);
            onClearSelection();
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          title={t.deleteSelection}
          aria-label={t.deleteSelection}
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{t.deleteSelection}</span>
        </button>
      )}
      {multiSelectedCount === 2 && onConnectNodes && (
        <button
          onClick={() => {
            const ids = Array.from(multiSelectedIds);
            onConnectNodes(ids[0], ids[1]);
            onClearSelection();
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-teal-700 hover:bg-teal-50 transition-colors"
          title={t.connect}
          aria-label={t.connect}
        >
          <Link className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{t.connect}</span>
        </button>
      )}
      {multiSelectedCount >= 2 && (
        <button
          onClick={onGroupSelection}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-teal-700 hover:bg-teal-50 transition-colors"
          title={t.groupSelection}
          aria-label={t.groupSelection}
        >
          <Group className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{t.groupSelection}</span>
        </button>
      )}
      <button
        onClick={onFocusSelection}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-teal-700 hover:bg-teal-50 transition-colors"
        title={t.focusSelection}
        aria-label={t.focusSelection}
      >
        <Focus className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{t.focusSelection}</span>
      </button>
      <button
        onClick={onClearSelection}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        title={t.deselect}
        aria-label={t.deselect}
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{t.deselect}</span>
      </button>
    </div>
  );
});
