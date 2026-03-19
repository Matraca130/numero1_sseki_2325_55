// ============================================================
// Axon — Quiz Design System Tokens
//
// Single source of truth for all quiz UI patterns.
// Professor views use purple accent, Student views use Axon brand.
//
// Import these tokens instead of hardcoding Tailwind classes
// to ensure visual consistency across all quiz components.
//
// PALETTE: Axon Medical Academy brand tokens (theme.css).
// ============================================================

// ── Role-based color tokens ──────────────────────────────

export const PROFESSOR_COLORS = {
  /** Primary button bg */
  primary: 'bg-purple-600',
  primaryHover: 'hover:bg-purple-700',
  primaryDisabled: 'bg-purple-400 cursor-wait',
  /** Icon/text accent */
  accent: 'text-purple-600',
  accentMuted: 'text-purple-500',
  /** Surface backgrounds */
  surfaceBold: 'bg-purple-100',
  surface: 'bg-purple-50',
  /** Focus ring for inputs */
  ring: 'focus:ring-purple-500/20 focus:border-purple-400',
  /** Hover states */
  hoverBg: 'hover:bg-purple-50',
  /** Badge */
  badge: 'bg-purple-50 text-purple-700',
  /** Border accent */
  borderHover: 'hover:border-purple-200',
} as const;

export const STUDENT_COLORS = {
  primary: 'bg-axon-dark',
  primaryHover: 'hover:bg-axon-hover',
  primaryDisabled: 'bg-axon-accent/60 cursor-wait',
  accent: 'text-axon-accent',
  accentMuted: 'text-axon-ring-label',
  surfaceBold: 'bg-axon-accent-20',
  surface: 'bg-axon-accent-10',
  ring: 'focus:ring-axon-accent/20 focus:border-axon-accent',
  hoverBg: 'hover:bg-axon-accent-10',
  badge: 'bg-axon-accent-10 text-axon-accent border-axon-accent/20',
  borderHover: 'hover:border-axon-accent/20',
} as const;

// ── Shared component class strings ───────────────────────

/** Standard input/select — append role ring separately */
export const INPUT_BASE =
  'w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2 bg-white ' +
  'focus:outline-none focus:ring-2 transition-all placeholder:text-gray-300 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

/** Compact filter select (toolbars) */
export const FILTER_SELECT =
  'text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white ' +
  'focus:outline-none focus:ring-2 transition-all';

/** Textarea base */
export const TEXTAREA_BASE =
  'w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white ' +
  'focus:outline-none focus:ring-2 resize-none placeholder:text-gray-300';

/** Badge — standard rounded-md with border */
export const BADGE = 'text-[10px] px-2 py-0.5 rounded-md border';

/** Badge — compact (9px, for source/status labels) */
export const BADGE_COMPACT = 'text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-wider';

/** Warning banner (amber) */
export const BANNER_WARNING =
  'flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800';

/** Error banner (red) */
export const BANNER_ERROR =
  'flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12px]';

/** Success banner (emerald) */
export const BANNER_SUCCESS =
  'flex items-start gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px]';

/** Modal overlay (backdrop) */
export const MODAL_OVERLAY =
  'fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm';

/** Modal card */
export const MODAL_CARD =
  'bg-white rounded-2xl shadow-2xl border border-gray-200';

/** Modal header */
export const MODAL_HEADER =
  'flex items-center justify-between px-6 py-4 border-b border-gray-100';

/** Modal footer */
export const MODAL_FOOTER =
  'flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-[#F0F2F5]/50';

// ── Button sizes ─────────────────────────────────────────

/** Primary action button (medium) — used in toolbars and modal footers */
export const BTN_PRIMARY =
  'flex items-center gap-2 px-5 py-2 rounded-lg text-[12px] text-white transition-all shadow-sm';

/** Primary action button (small) — used in filter bars */
export const BTN_PRIMARY_SM =
  'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] text-white transition-all shadow-sm';

/** Secondary/ghost button */
export const BTN_GHOST =
  'px-4 py-2 text-[12px] text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100';

/** Close button (icon only) */
export const BTN_CLOSE =
  'p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors';

/** Icon action button (small, for card toolbars) */
export const BTN_ICON =
  'p-1.5 rounded-lg text-gray-400 transition-colors';

// ── Semantic feedback colors ─────────────────────────────

export const FEEDBACK = {
  correct: {
    border: 'border-emerald-400',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    textBold: 'text-emerald-700',
  },
  incorrect: {
    border: 'border-rose-300',
    bg: 'bg-rose-50',
    text: 'text-rose-500',
    textBold: 'text-rose-600',
  },
  unanswered: {
    border: 'border-gray-200',
    bg: 'bg-[#F0F2F5]',
    text: 'text-gray-400',
    textBold: 'text-gray-500',
  },
} as const;

// ── Card styles ──────────────────────────────────────────

export const CARD_ACTIVE =
  'bg-white rounded-xl border border-gray-200 transition-all';

export const CARD_INACTIVE =
  'bg-white rounded-xl border border-red-200 bg-red-50/30 opacity-75 transition-all';

// ── Scrollbar ────────────────────────────────────────────

/** Apply to any scrollable quiz container for a polished scrollbar */
export const SCROLLABLE = 'overflow-y-auto custom-scrollbar-light';

// ── Label styles ─────────────────────────────────────────

export const LABEL =
  'text-[11px] text-gray-500 mb-1 block';

export const SECTION_LABEL =
  'text-[10px] text-gray-400 uppercase tracking-wider';
