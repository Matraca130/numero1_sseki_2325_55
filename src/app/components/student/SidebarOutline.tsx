import { useEffect, type ReactNode } from 'react';
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
  /** Optional mastery legend rendered inside the overlay when expanded. */
  masteryLegend?: ReactNode;
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

/** Maps a mastery level (0-1+) to the Delta Mastery Scale color token.
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
  masteryLegend,
}: SidebarOutlineProps) {
  const ToggleIcon = collapsed ? ChevronRight : ChevronLeft;

  // Close on Escape key
  useEffect(() => {
    if (collapsed) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onToggleCollapse();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [collapsed, onToggleCollapse]);

  return (
    <>
      {/* ── Backdrop scrim — click to close ── */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/8 backdrop-blur-[1px] transition-opacity duration-200"
          onClick={onToggleCollapse}
          aria-hidden="true"
        />
      )}

      <aside
        role="navigation"
        aria-label="Estructura del resumen"
        aria-expanded={!collapsed}
        className={[
          'max-h-[calc(100vh-88px)] overflow-y-auto custom-scrollbar-light',
          'bg-white dark:bg-[#1e1f25]',
          'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          collapsed
            ? 'sticky top-[72px] border-r border-gray-200 dark:border-[#2d2e34]'
            : 'absolute top-0 left-0 z-40 shadow-2xl rounded-2xl border border-gray-200 dark:border-[#2d2e34]',
        ].join(' ')}
        style={{
          width: collapsed ? 52 : 272,
          padding: collapsed ? 0 : '4px 0',
        }}
      >
        {/* -- Header -- */}
        <div
          className="flex items-center justify-between"
          style={{ padding: collapsed ? '0 0 8px' : '12px 12px 8px' }}
        >
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
            className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-50 dark:bg-[#1a2e2a] text-teal-500 hover:bg-teal-100 dark:hover:bg-[#224038] transition-colors"
            aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            <ToggleIcon size={14} className="text-teal-500" />
          </button>
        </div>

        {/* -- Block list -- */}
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
                aria-current={isActive ? 'page' : undefined}
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
                  fontSize: collapsed ? 12 : 13,
                  cursor: 'pointer',
                }}
              >
                <Icon size={collapsed ? 16 : 14} className="flex-shrink-0" />

                {!collapsed && (
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                )}

                {/* Mastery dot -- Delta Mastery Scale */}
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

        {/* Mastery legend inside overlay when expanded */}
        {!collapsed && masteryLegend && (
          <div className="px-3 pt-3 pb-2 border-t border-gray-100 dark:border-[#2d2e34] mt-2">
            {masteryLegend}
          </div>
        )}
      </aside>
    </>
  );
}
