/**
 * @AxonPlataforma/design-system v1.0.0
 *
 * Fuente unica de verdad para la identidad visual de Axon.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  BARREL RE-EXPORT — Backward compatible                     ║
 * ║                                                              ║
 * ║  Todos los tokens estan modularizados en archivos separados  ║
 * ║  para permitir importaciones granulares entre proyectos.     ║
 * ║  Este barrel re-exporta TODO, asi que los imports existentes ║
 * ║  siguen funcionando sin ningun cambio:                       ║
 * ║                                                              ║
 * ║    import { colors, headingStyle } from '@/app/design-system';║
 * ║                                                              ║
 * ║  Para imports modulares (multi-proyecto):                    ║
 * ║                                                              ║
 * ║    import { colors } from '@/app/design-system/colors';      ║
 * ║    import { headingStyle } from '@/app/design-system/typography'; ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * ESTRUCTURA DE MODULOS:
 *
 *   design-system/
 *   ├── index.ts             ← Este archivo (barrel)
 *   ├── brand.ts             ← Identidad de marca, logo sizes/themes
 *   ├── colors.ts            ← Paleta completa (primary, surface, text, semantic, mastery)
 *   ├── typography.ts        ← Familias tipograficas, reglas, headingStyle/bodyStyle
 *   ├── components.ts        ← Recetas Tailwind + helpers (iconClasses, cardClasses, etc.)
 *   ├── section-colors.ts    ← Paletas de acento (teal, multi, disciplines)
 *   ├── layout.ts            ← Dimensiones, spacing, grids
 *   ├── animation.ts         ← Presets de Motion
 *   ├── severity.ts          ← Tokens de severidad (mild/moderate/critical)
 *   └── gradients.ts         ← Gradientes decorativos tokenizados
 */

// ─────────────────────────────────────────────
// 1. BRAND
// ─────────────────────────────────────────────
export { brand } from './brand';
export type { LogoSize, LogoTheme } from './brand';

// ─────────────────────────────────────────────
// 2. COLORS (includes mastery 5-level Delta scale)
// ─────────────────────────────────────────────
export { colors } from './colors';

// ─────────────────────────────────────────────
// 3. TYPOGRAPHY
// ─────────────────────────────────────────────
export { typography, headingStyle, bodyStyle } from './typography';

// ─────────────────────────────────────────────
// 4. COMPONENT PATTERNS + HELPERS
// ─────────────────────────────────────────────
export {
  components,
  iconClasses,
  cardClasses,
  ctaButtonClasses,
  kpiCardClasses,
  iconBadgeClasses,
} from './components';
export type { ButtonSize, IconSize } from './components';

// ─────────────────────────────────────────────
// 5. SECTION ACCENT COLORS
// ─────────────────────────────────────────────
export { sectionColors } from './section-colors';

// ─────────────────────────────────────────────
// 5b. MASTERY CONVENIENCE RE-EXPORTS
// ─────────────────────────────────────────────
// The canonical 5-level Delta Mastery Scale lives in colors.mastery.
// Tokens + helpers live in design-system/mastery.ts (NOT in MasteryBar)
// to avoid a circular dependency (design-system → MasteryBar → design-system).
//
// IMPORTANT: The barrel must never import from component files — doing so
// creates cross-chunk circular initialization issues with Vite code-splitting.
export {
  MASTERY_LIGHT,
  MASTERY_DARK,
  getMasteryStyle,
  getMasteryInfo,
} from './mastery';
export type { MasteryColorSet as MasteryBarColorSet } from './mastery';

// ─────────────────────────────────────────────
// 5c. MASTERY HELPERS RE-EXPORTS (Delta color scale logic)
// ─────────────────────────────────────────────
// The mastery-helpers module computes delta-based mastery colors
// using the canonical 5-level scale from colors.mastery.
// Re-exported here so consumers can import from '@/app/design-system'.
export {
  getDeltaColor,
  getDeltaColorClasses,
  getDeltaColorLabel,
  getDominationThreshold,
  getKeywordDeltaColor,
  getKeywordDeltaColorSafe,
  getKeywordMastery,
} from '@/app/lib/mastery-helpers';
export type { DeltaColorLevel, BktState } from '@/app/lib/mastery-helpers';

// ─────────────────────────────────────────────
// 6. SPACING & LAYOUT
// ─────────────────────────────────────────────
export { layout } from './layout';

// ─────────────────────────────────────────────
// 7. ANIMATION
// ─────────────────────────────────────────────
export { animation } from './animation';

// ─────────────────────────────────────────────
// 8. SEVERITY TOKENS
// ─────────────────────────────────────────────
export { SEVERITY } from './severity';
export type { SeverityLevel } from './severity';

// ─────────────────────────────────────────────
// 9. GRADIENT TOKENS
// ─────────────────────────────────────────────
export { gradients } from './gradients';
