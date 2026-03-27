import {
  FileText,
  Zap,
  ArrowRight,
  Table,
  List,
  LayoutGrid,
  Columns2,
  AlertTriangle,
  ImageIcon,
  Minus,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SidebarOutlineProps {
  blocks: Array<{ id: string; type: string; content?: Record<string, unknown> }>;
  activeBlockId: string | null;
  onBlockClick: (blockId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** Optional mastery levels per block id (0-1). Prepared for Wave 2. */
  masteryLevels?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------

const ICON_BY_TYPE: Record<string, LucideIcon> = {
  prose: FileText,
  key_point: Zap,
  stages: ArrowRight,
  comparison: Table,
  list_detail: List,
  grid: LayoutGrid,
  two_column: Columns2,
  callout: AlertTriangle,
  image_reference: ImageIcon,
  section_divider: Minus,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBlockLabel(block: { type: string; content?: Record<string, unknown> }): string {
  const title = block.content?.title;
  if (typeof title === 'string' && title.length > 0) return title;

  const label = block.content?.label;
  if (typeof label === 'string' && label.length > 0) return label;

  return block.type.replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SidebarOutline({
  blocks,
  activeBlockId,
  onBlockClick,
  collapsed,
  onToggleCollapse,
  masteryLevels,
}: SidebarOutlineProps) {
  const ToggleIcon = collapsed ? ChevronRight : ChevronLeft;

  return (
    <aside
      className="sticky top-[72px] flex-shrink-0 max-h-[calc(100vh-88px)] overflow-y-auto custom-scrollbar-light transition-all duration-200"
      style={{ width: collapsed ? 44 : 220 }}
    >
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-2 py-3">
        {!collapsed && (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 select-none">
            Estructura
          </span>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-50 text-teal-500 hover:bg-teal-100 transition-colors"
          aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          <ToggleIcon size={14} />
        </button>
      </div>

      {/* ── Block list ─────────────────────────────── */}
      <nav className="flex flex-col gap-0.5 px-1">
        {blocks.map((block) => {
          const isActive = block.id === activeBlockId;
          const Icon = ICON_BY_TYPE[block.type] ?? FileText;
          const label = getBlockLabel(block);
          const mastery = masteryLevels?.[block.id];

          return (
            <button
              key={block.id}
              type="button"
              onClick={() => onBlockClick(block.id)}
              title={collapsed ? label : undefined}
              className={[
                'relative flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                'border-l-[3px]',
                isActive
                  ? 'border-l-[#2a8c7a] bg-teal-50 font-semibold text-[#2a8c7a]'
                  : 'border-l-transparent text-gray-500 hover:bg-gray-50',
                collapsed ? 'justify-center' : '',
              ].join(' ')}
            >
              <Icon size={16} className="flex-shrink-0" />

              {!collapsed && (
                <span className="truncate">{label}</span>
              )}

              {/* Mastery dot — prepared for Wave 2 */}
              {mastery !== undefined && (
                <span
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-gray-300"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
