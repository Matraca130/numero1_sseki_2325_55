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
import { colors } from '@/app/design-system';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SidebarOutlineProps {
  blocks: Array<{ id: string; type: string; content?: Record<string, unknown> }>;
  activeBlockId: string | null;
  onBlockClick: (blockId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** Optional mastery levels per block id (0-2). */
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

/** Maps a mastery level (0–1+) to the Delta Mastery Scale color token.
 *  Logic mirrors MasteryBar's getMasteryInfo so colors stay consistent. */
function getMasteryDotColor(level: number): string {
  if (level > 1.0) return colors.mastery.maestria;      // blue
  if (level === 1.0) return colors.mastery.consolidado;  // green
  if (level >= 0.85) return colors.mastery.enProgreso;   // amber
  if (level >= 0.5) return colors.mastery.emergente;     // red
  return colors.mastery.descubrir;                        // gray
}

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
      role="navigation"
      aria-label="Summary outline"
      className="sticky top-[72px] flex-shrink-0 max-h-[calc(100vh-88px)] overflow-y-auto custom-scrollbar-light bg-white dark:bg-[#1e1f25] border-r border-gray-200 dark:border-[#2d2e34]"
      style={{
        width: collapsed ? 44 : 220,
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        padding: 8,
        borderRadius: '0 12px 12px 0',
      }}
    >
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between" style={{ padding: '0 0 8px' }}>
        {!collapsed && (
          <span
            className="uppercase select-none text-gray-400 dark:text-gray-500"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, paddingLeft: 4, whiteSpace: 'nowrap' }}
          >
            Estructura
          </span>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center justify-center transition-colors"
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'rgba(42,140,122,0.08)',
            flexShrink: 0,
          }}
          aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          <ToggleIcon size={14} className="text-teal-500" />
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
              aria-current={isActive ? 'true' : undefined}
              aria-label={collapsed ? label : undefined}
              className={[
                'relative flex items-center gap-2 text-left transition-all',
                'border-l-[3px]',
                isActive
                  ? 'border-l-[#2a8c7a] bg-teal-50 dark:bg-[#1a2e2a] font-semibold text-[#2a8c7a]'
                  : 'border-l-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a2e2a]',
                collapsed ? 'justify-center' : '',
              ].join(' ')}
              style={{
                padding: collapsed ? '6px 0' : '6px 8px',
                borderRadius: 8,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <Icon size={collapsed ? 16 : 12} className="flex-shrink-0" />

              {!collapsed && (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
              )}

              {/* Mastery dot — Delta Mastery Scale */}
              {mastery !== undefined && (
                <span
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: getMasteryDotColor(mastery) }}
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
