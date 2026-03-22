/**
 * @module @axon/design-system/components
 * @version 2.0.0 — Evolution Premium (Forest Canopy)
 *
 * Recetas Tailwind para componentes: cards, botones, iconos,
 * filtros, progress bars, sidebar, header, KPI, charts.
 * Incluye helpers utilitarios para clases compuestas.
 *
 * Changelog v2.0.0 — Evolution Premium:
 *   - pageHeader.titleFont: Georgia → Playfair Display
 *   - pageHeader.subtitleFont: Georgia → DM Sans
 *   - card backgrounds: warm ivory variants
 *   - kpiCard: subtle warm shadow
 *
 * Changelog v1.1.0:
 *   - cardDark.base: #2c3e50 → #1a2e2a (Axon Dark Panel)
 *   - filterButton.activeDark: #2c3e50 → #1a2e2a
 *   - sidebar.bgOuter/bgInner: → #1B3B36 (Axon Dark Teal)
 *   - navItem.active: sky-500 → #2a8c7a (Teal Accent)
 *   - navItem.inactive: gray-400 → #8fbfb3
 *   - sectionLabel: gray-500 → #6db5a5
 *   - header.height: h-12 → h-14 (56px)
 *   - header.bg: #1e293b → #1B3B36
 *
 * Standalone:  import { components, iconClasses, cardClasses, ctaButtonClasses } from '@/app/design-system/components';
 * Barrel:      import { components, iconClasses } from '@/app/design-system';
 */

// ─────────────────────────────────────────────
// COMPONENT PATTERN TOKENS
// ─────────────────────────────────────────────

export const components = {

  /** Patron de icono: fondo teal claro + icono teal */
  icon: {
    default:  { bg: 'bg-teal-50',    text: 'text-teal-500' },
    sizes: {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
    },
    container: 'rounded-xl flex items-center justify-center',
    /** PROHIBIDO: no usar gradientes, no usar bg-blue-*, bg-violet-* */
  },

  /** Card generico */
  card: {
    base:     'bg-white rounded-2xl border border-gray-200 shadow-sm',
    hover:    'hover:shadow-md transition-shadow',
    padding:  'p-5',
    paddingLg: 'p-6',
    paddingXl: 'p-7',
  },

  /** Card oscuro — Axon Dark Panel (#1a2e2a) */
  cardDark: {
    base:     'bg-[#1a2e2a] rounded-2xl text-white shadow-lg',
    padding:  'p-7',
  },

  /** Boton primario (teal solido, pill) */
  buttonPrimary: {
    base:     'bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-full transition-colors',
    sizes: {
      sm:     'px-4 py-1.5 text-xs',
      md:     'px-6 py-2.5 text-sm',
      lg:     'px-8 py-3 text-base',
    },
  },

  /** Boton de accion dentro de cards */
  buttonAction: {
    base:     'bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-sm text-center transition-colors cursor-pointer',
    full:     'w-full py-2.5',
  },

  /** Filtro temporal */
  filterButton: {
    active:   'bg-teal-500 text-white shadow-sm',
    inactive: 'text-gray-500 hover:text-gray-700',
    /** Variante dark (WelcomeView) — Axon Dark Panel */
    activeDark:   'bg-[#1a2e2a] text-white',
    inactiveDark: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  },

  /** Barra de progresso */
  progressBar: {
    track:    'w-full h-2 bg-gray-100 rounded-full overflow-hidden',
    fill:     'h-full rounded-full transition-all duration-700',
    colorDefault: 'bg-teal-500',
  },

  /** Progresso circular (SVG) */
  progressCircle: {
    strokeBg:     'rgba(255,255,255,0.1)',
    strokeActive: '#14b8a6',
    strokeWidth:  14,
    strokeWidthSmall: 3,
    strokeLinecap: 'round' as const,
    strokeColorSmall: '#0d9488',
  },

  /** KPI Card */
  kpiCard: {
    base:     'bg-white p-5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 hover:shadow-md transition-all',
    iconBg:   'p-2.5 rounded-xl',
    trend: {
      up:     'text-green-700 bg-green-50',
      down:   'text-red-700 bg-red-50',
    },
  },

  /** AxonPageHeader — Evolution Premium (Playfair Display + DM Sans) */
  pageHeader: {
    wrapper:  'relative px-8 pt-4 pb-6 bg-white overflow-hidden border-b border-gray-200',
    title:    'text-[clamp(2rem,4vw,3rem)] font-bold text-gray-900 tracking-tight leading-[1]',
    titleFont: '"Playfair Display", Georgia, serif',
    subtitle: 'text-sm text-gray-500',
    subtitleFont: '"DM Sans", "Inter", sans-serif',
  },

  /** Sidebar — Axon Dark Teal (#1B3B36) */
  sidebar: {
    width:        260,
    bgOuter:      '#1B3B36',
    bgInner:      '#1B3B36',
    borderColor:  'rgba(255,255,255,0.05)',
    navItem: {
      base:     'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
      active:   'bg-[#2a8c7a]/15 text-[#2a8c7a] shadow-sm border border-[#2a8c7a]/20',
      inactive: 'text-[#8fbfb3] hover:text-white hover:bg-white/5',
    },
    sectionLabel: 'px-3 text-xs font-bold text-[#6db5a5] uppercase tracking-widest mb-2',
  },

  /** Header / Top Nav — Axon Dark Teal, 56px (h-14) */
  header: {
    height:    'h-14',
    bg:        'bg-[#1B3B36]',
    border:    'border-b border-white/10',
    menuBtn:   'p-2 bg-white/[0.08] hover:bg-white/15 border border-white/[0.1] rounded-lg text-white',
  },

  /** Course Switcher */
  courseSwitcher: {
    iconSize:     'w-10 h-10',
    iconRadius:   'rounded-lg',
    courseLabel:   'font-medium tracking-wide uppercase text-[14px] font-sans',
    courseName:   'font-semibold leading-none text-[16px] font-sans',
    dropdown:     'bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl',
  },

  /** Quick access shortcut cards (WelcomeView) */
  shortcutCard: {
    base:     'bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer',
    iconSize: 'w-10 h-10 rounded-xl',
    iconBg:   'bg-teal-50',
    iconColor: 'text-teal-500',
  },

  /** Course card (WelcomeView) */
  courseCard: {
    base:     'bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow',
    iconSize: 'w-12 h-12 rounded-xl',
    ctaButton: 'w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold text-center transition-colors cursor-pointer',
  },

  /** Activity item */
  activityItem: {
    iconSize: 'w-10 h-10 rounded-lg',
    layout:   'flex items-start gap-3',
  },

  /** Chart containers */
  chartCard: {
    base:    'bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100',
    tooltip: { borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  },
} as const;

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────

/** Shorthand for the icon pattern: combines bg + text + size + container */
export function iconClasses(size: 'sm' | 'md' | 'lg' = 'md') {
  return `${components.icon.sizes[size]} ${components.icon.default.bg} ${components.icon.container}`;
}

/** Shorthand for card classes */
export function cardClasses(interactive = false) {
  return `${components.card.base} ${components.card.padding} ${interactive ? components.card.hover + ' cursor-pointer' : ''}`;
}

/** Shorthand for full-width CTA button inside a card (teal pill) */
export function ctaButtonClasses() {
  return `${components.buttonAction.full} ${components.buttonPrimary.base}`;
}

/** Shorthand for KPI/stat card */
export function kpiCardClasses() {
  return components.kpiCard.base;
}

/** Shorthand for icon-in-card (p-2.5 rounded-xl with teal bg) */
export function iconBadgeClasses() {
  return `${components.kpiCard.iconBg} ${components.icon.default.bg} ${components.icon.default.text}`;
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type ButtonSize = keyof typeof components.buttonPrimary.sizes;
export type IconSize = keyof typeof components.icon.sizes;
