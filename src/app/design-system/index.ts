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
 *   ├── shapes.ts            ← Border radius por tipo de elemento
 *   ├── shadows.ts           ← Niveles de sombra
 *   ├── components.ts        ← Recetas Tailwind + helpers (iconClasses, cardClasses, etc.)
 *   ├── section-colors.ts    ← Paletas de acento (teal, multi, disciplines)
 *   ├── navigation.ts        ← Vistas, sidebar items, shortcuts
 *   ├── layout.ts            ← Dimensiones, spacing, grids
 *   ├── animation.ts         ← Presets de Motion
 *   └── rules.ts             ← Reglas obligatorias y prohibidas
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
// 4. SHAPES & RADIUS
// ─────────────────────────────────────────────
export { shapes } from './shapes';

// ─────────────────────────────────────────────
// 5. SHADOWS
// ─────────────────────────────────────────────
export { shadows } from './shadows';

// ─────────────────────────────────────────────
// 6. COMPONENT PATTERNS + HELPERS
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
// 7. SECTION ACCENT COLORS
// ─────────────────────────────────────────────
export { sectionColors } from './section-colors';

// ─────────────────────────────────────────────
// 7b. MASTERY CONVENIENCE RE-EXPORTS
// ─────────────────────────────────────────────
// The canonical 5-level Delta Mastery Scale lives in colors.mastery.
// These re-exports give consumers a shorter import path:
//
//   import { MASTERY_LIGHT, MASTERY_DARK, getMasteryStyle } from '@/app/design-system';
//
// Note: The 6-tier flashcard rating scale in
//   components/content/flashcard/mastery-colors.ts
// is a DIFFERENT concept and is intentionally NOT re-exported here.
export {
  MASTERY_LIGHT,
  MASTERY_DARK,
  getMasteryStyle,
  getMasteryInfo,
} from '@/app/components/student/MasteryBar';
export type { MasteryColorSet as MasteryBarColorSet } from '@/app/components/student/MasteryBar';

// ─────────────────────────────────────────────
// 7c. MASTERY HELPERS RE-EXPORTS (Delta color scale logic)
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
// 8. NAVIGATION
// ─────────────────────────────────────────────
export { navigation } from './navigation';
export type { ViewType } from './navigation';

// ─────────────────────────────────────────────
// 9. SPACING & LAYOUT
// ─────────────────────────────────────────────
export { layout } from './layout';

// ─────────────────────────────────────────────
// 10. ANIMATION
// ─────────────────────────────────────────────
export { animation } from './animation';

// ─────────────────────────────────────────────
// 11. DESIGN RULES
// ─────────────────────────────────────────────
export { designRules } from './rules';
