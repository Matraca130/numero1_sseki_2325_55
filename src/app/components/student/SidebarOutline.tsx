import { useEffect, useState, type ReactNode } from 'react';
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
  Layers,
  X,
  type LucideIcon,
} from 'lucide-react';
import { colors } from '@/app/design-system';
import { getMasteryInfo } from '@/app/components/student/MasteryBar';

// Tailwind `md:` breakpoint. Keep in sync with `StudentSummaryReader` so the
// "hidden md:block" rail and the mobile drawer condition agree.
const MOBILE_MAX_PX = 767;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = 'enriched' | 'reading';

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
  /** Current view mode */
  viewMode?: ViewMode;
  /** Callback to change view mode */
  onViewModeChange?: (mode: ViewMode) => void;
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


const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function isGarbageTitle(s: string): boolean {
  return UUID_RE.test(s) || s.includes('{{');
}

function getBlockLabel(block: { type: string; content?: Record<string, unknown> }): string {
  const title = block.content?.title;
  if (typeof title === 'string' && title.length > 0 && !isGarbageTitle(title)) return title;

  const label = block.content?.label;
  if (typeof label === 'string' && label.length > 0 && !isGarbageTitle(label)) return label;

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
  viewMode = 'enriched',
  onViewModeChange,
}: SidebarOutlineProps) {
  const ToggleIcon = collapsed ? ChevronRight : ChevronLeft;

  // ── Viewport-class reactive (mobile = full-viewport drawer) ───────────
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`).matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (collapsed) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onToggleCollapse();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [collapsed, onToggleCollapse]);

  // Lock body scroll while the mobile drawer is open so background doesn't
  // scroll underneath the translucent backdrop.
  useEffect(() => {
    if (!(isMobile && !collapsed)) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobile, collapsed]);

  // On mobile, when collapsed, render nothing — the parent hides the 52px
  // rail with `hidden md:block`, and the drawer is triggered from the toolbar.
  if (isMobile && collapsed) return null;

  // ── Layout variants ────────────────────────────────────────────────────
  // Desktop rail:  sticky 52px (top:72, shadow-less, right border).
  // Desktop overlay:  absolute 280px with shadow + click-away.
  // Mobile drawer:  fixed full-height slide-in (max-w 320) with solid backdrop.

  const variant: 'rail' | 'desktopOverlay' | 'mobileDrawer' = isMobile
    ? 'mobileDrawer'
    : collapsed
      ? 'rail'
      : 'desktopOverlay';

  return (
    <>
      {/* ── Backdrop / click-away layer ── */}
      {!collapsed && (
        <div
          className={variant === 'mobileDrawer' ? 'fixed inset-0 bg-black/50 backdrop-blur-sm' : 'fixed inset-0'}
          style={{ zIndex: variant === 'mobileDrawer' ? colors.zIndex.drawerBackdrop : colors.zIndex.sidebarRail + 5 }}
          onClick={onToggleCollapse}
          aria-hidden="true"
        />
      )}

      <aside
        role={variant === 'mobileDrawer' ? 'dialog' : 'navigation'}
        aria-modal={variant === 'mobileDrawer' ? true : undefined}
        aria-label="Estructura del resumen"
        aria-expanded={!collapsed}
        className={[
          'overflow-y-auto custom-scrollbar-light',
          'bg-white dark:bg-[#1e1f25]',
          'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          variant === 'rail'
            ? 'sticky top-[72px] max-h-[calc(100vh-88px)] border-r border-gray-200 dark:border-[#2d2e34]'
            : variant === 'desktopOverlay'
              ? 'absolute left-0 shadow-xl rounded-2xl border border-gray-200/80 dark:border-[#2d2e34]'
              : 'fixed left-0 top-0 h-dvh shadow-2xl border-r border-gray-200 dark:border-[#2d2e34]',
        ].join(' ')}
        style={{
          width:
            variant === 'rail' ? 52 : variant === 'desktopOverlay' ? 280 : 'min(86vw, 320px)',
          ...(variant === 'desktopOverlay'
            ? { top: 0, maxHeight: 'calc(100vh - 120px)', zIndex: colors.zIndex.drawer }
            : variant === 'mobileDrawer'
              ? { zIndex: colors.zIndex.drawer }
              : {}),
        }}
      >
        {/* -- Header -- */}
        <div
          className="flex items-center justify-between"
          style={{
            padding:
              variant === 'rail' && collapsed
                ? '0 0 8px'
                : variant === 'mobileDrawer'
                  ? '16px 14px 10px'
                  : '12px 12px 8px',
          }}
        >
          {!collapsed && (
            <span
              className="uppercase select-none text-gray-400 dark:text-gray-500"
              aria-hidden={collapsed ? true : undefined}
              style={{
                fontSize: variant === 'mobileDrawer' ? 11 : 10,
                fontWeight: 700,
                letterSpacing: 1,
                paddingLeft: 4,
                whiteSpace: 'nowrap',
              }}
            >
              Estructura
            </span>
          )}

          <button
            type="button"
            onClick={onToggleCollapse}
            className={[
              'flex items-center justify-center rounded-md bg-teal-50 dark:bg-[#1a2e2a] text-teal-500',
              'hover:bg-teal-100 dark:hover:bg-[#224038] transition-colors',
              'focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 focus-visible:outline-none',
              variant === 'mobileDrawer' ? 'h-9 w-9' : 'h-7 w-7',
            ].join(' ')}
            aria-label={collapsed ? 'Expandir sidebar' : 'Cerrar estructura'}
          >
            {variant === 'mobileDrawer' ? (
              <X size={16} className="text-teal-500" />
            ) : (
              <ToggleIcon size={14} className="text-teal-500" />
            )}
          </button>
        </div>

        {/* -- View mode toggle -- */}
        {onViewModeChange && (
          collapsed ? (
            <div className="flex justify-center pb-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => onViewModeChange(viewMode === 'enriched' ? 'reading' : 'enriched')}
                title={viewMode === 'enriched' ? 'Cambiar a lectura limpia' : 'Cambiar a vista enriquecida'}
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d2e34] transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 focus-visible:outline-none"
              >
                {viewMode === 'enriched' ? <Layers size={14} /> : <FileText size={14} />}
              </button>
            </div>
          ) : (
            <div className="flex mx-2 mb-2 p-0.5 rounded-lg bg-gray-100 dark:bg-[#2a2b31]">
              <button
                type="button"
                onClick={() => onViewModeChange('reading')}
                className={[
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium transition-all',
                  'focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 focus-visible:outline-none',
                  viewMode === 'reading'
                    ? 'bg-white dark:bg-[#1e1f25] text-teal-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400',
                ].join(' ')}
              >
                <FileText size={12} /> Lectura
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('enriched')}
                className={[
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium transition-all',
                  'focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 focus-visible:outline-none',
                  viewMode === 'enriched'
                    ? 'bg-white dark:bg-[#1e1f25] text-teal-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400',
                ].join(' ')}
              >
                <Layers size={12} /> Enriquecido
              </button>
            </div>
          )
        )}

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
                aria-label={collapsed
                  ? `${label}${mastery !== undefined ? ` – ${getMasteryInfo(mastery).label}` : ''}`
                  : undefined}
                className={[
                  'relative flex items-center gap-2 text-left transition-all',
                  'border-l-[3px]',
                  'focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 focus-visible:outline-none',
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
