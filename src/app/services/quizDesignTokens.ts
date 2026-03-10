// ============================================================
// Axon — Quiz Design System Tokens
//
// Single source of truth for all quiz UI patterns.
// Professor views use purple accent, Student views use teal.
// ============================================================

// ── Role-based color tokens ──────────────────────────────

export const PROFESSOR_COLORS = {
  primary: 'bg-purple-600',
  primaryHover: 'hover:bg-purple-700',
  primaryDisabled: 'bg-purple-400 cursor-wait',
  accent: 'text-purple-600',
  accentMuted: 'text-purple-500',
  surfaceBold: 'bg-purple-100',
  surface: 'bg-purple-50',
  ring: 'focus:ring-purple-500/20 focus:border-purple-400',
  hoverBg: 'hover:bg-purple-50',
  badge: 'bg-purple-50 text-purple-700',
  borderHover: 'hover:border-purple-200',
} as const;

export const STUDENT_COLORS = {
  primary: 'bg-teal-600',
  primaryHover: 'hover:bg-teal-700',
  primaryDisabled: 'bg-teal-400 cursor-wait',
  accent: 'text-teal-600',
  accentMuted: 'text-teal-500',
  surfaceBold: 'bg-teal-100',
  surface: 'bg-teal-50',
  ring: 'focus:ring-teal-500/20 focus:border-teal-400',
  hoverBg: 'hover:bg-teal-50',
  badge: 'bg-teal-50 text-teal-700 border-teal-200',
  borderHover: 'hover:border-teal-200',
} as const;

// ── Shared component class strings ───────────────────────

export const INPUT_BASE =
  'w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2 bg-white ' +
  'focus:outline-none focus:ring-2 transition-all placeholder:text-gray-300 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

export const FILTER_SELECT =
  'text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white ' +
  'focus:outline-none focus:ring-2 transition-all';

export const TEXTAREA_BASE =
  'w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white ' +
  'focus:outline-none focus:ring-2 resize-none placeholder:text-gray-300';

export const BADGE = 'text-[10px] px-2 py-0.5 rounded-md border';
export const BADGE_COMPACT = 'text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-wider';

export const BANNER_WARNING =
  'flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800';

export const BANNER_ERROR =
  'flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12px]';

export const BANNER_SUCCESS =
  'flex items-start gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px]';

export const MODAL_OVERLAY =
  'fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm';

export const MODAL_CARD =
  'bg-white rounded-2xl shadow-2xl border border-gray-200';

export const MODAL_HEADER =
  'flex items-center justify-between px-6 py-4 border-b border-gray-100';

export const MODAL_FOOTER =
  'flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50';

// ── Button sizes ─────────────────────────────────────────

export const BTN_PRIMARY =
  'flex items-center gap-2 px-5 py-2 rounded-lg text-[12px] text-white transition-all shadow-sm';

export const BTN_PRIMARY_SM =
  'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] text-white transition-all shadow-sm';

export const BTN_GHOST =
  'px-4 py-2 text-[12px] text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100';

export const BTN_CLOSE =
  'p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors';

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
    bg: 'bg-gray-50',
    text: 'text-gray-400',
    textBold: 'text-gray-500',
  },
} as const;

// ── Card styles ──────────────────────────────────────────

export const CARD_ACTIVE =
  'bg-white rounded-xl border border-gray-200 transition-all';

export const CARD_INACTIVE =
  'bg-white rounded-xl border border-red-200 bg-red-50/30 opacity-75 transition-all';

export const SCROLLABLE = 'overflow-y-auto custom-scrollbar-light';

export const LABEL =
  'text-[11px] text-gray-500 mb-1 block';

export const SECTION_LABEL =
  'text-[10px] text-gray-400 uppercase tracking-wider';
