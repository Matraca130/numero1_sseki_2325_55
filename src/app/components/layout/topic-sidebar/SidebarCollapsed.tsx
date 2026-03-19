// ============================================================
// SidebarCollapsed — Narrow collapsed state (w-12)
// ============================================================

import { PanelLeft, BookOpen } from 'lucide-react';

interface SidebarCollapsedProps {
  onExpand: () => void;
}

export function SidebarCollapsed({ onExpand }: SidebarCollapsedProps) {
  return (
    <div className="hidden lg:flex flex-col items-center py-4 px-1 bg-white border-r border-zinc-300 w-12 shrink-0">
      <button
        onClick={onExpand}
        className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition-colors"
        aria-label="Expandir sidebar"
      >
        <PanelLeft size={18} />
      </button>
      <div className="mt-4 flex flex-col items-center gap-2">
        <BookOpen size={16} className="text-teal-600" />
        <span
          className="text-[10px] text-zinc-400 font-medium"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          Contenido
        </span>
      </div>
    </div>
  );
}
