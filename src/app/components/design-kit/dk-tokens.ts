/**
 * AXON v4.4 — Design Kit: Tokens & Utilities
 * Extracted from design-kit.tsx (zero functional changes)
 */
import { useCallback } from "react";
import { useReducedMotion } from "motion/react";

/* ═══════════════════════════════════════════════════════════════════════
   1. TOKENS — La paleta dopaminergica
   ═════════════════════════════════════════════════════════════════════ */

export const tokens = {
  // Fondos
  bg: {
    page: "bg-[#faf9f6]",
    card: "bg-white",
    hero: "bg-gradient-to-br from-teal-800 via-teal-900 to-teal-950",
    cardDark: "bg-[#1a2e2a]",
    sidebar: "bg-white",
  },
  // Bordes
  border: {
    default: "border-zinc-200",
    card: "border border-zinc-200",
    cardHover: "hover:border-zinc-300",
    dark: "border-white/[0.07]",
    active: "border-teal-300",
    success: "border-emerald-300",
    amber: "border-amber-400/15",
    amberHover: "hover:border-amber-400/30",
  },
  // Radios
  radius: {
    card: "rounded-2xl",
    button: "rounded-xl",
    pill: "rounded-full",
    small: "rounded-lg",
  },
  // Sombras
  shadow: {
    card: "shadow-sm",
    cardHover: "hover:shadow-xl hover:shadow-zinc-900/5",
    button: "shadow-lg shadow-teal-600/25",
    amber: "shadow-xl shadow-amber-500/25",
    amberHover: "hover:shadow-amber-500/40",
  },
  // Colores de estado
  status: {
    completed: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", accent: "bg-emerald-500" },
    inProgress: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", accent: "bg-teal-500" },
    notStarted: { bg: "bg-zinc-100", text: "text-zinc-500", border: "border-zinc-200", accent: "bg-zinc-300" },
  },
  // Colores de mastery (Delta Mastery Scale — aligned with mastery-helpers.ts)
  mastery: {
    gray:   { bg: "bg-zinc-100",    text: "text-zinc-600",    border: "border-zinc-300",    label: "Por descubrir" },
    red:    { bg: "bg-red-100",     text: "text-red-700",     border: "border-red-300",     label: "Emergente" },
    yellow: { bg: "bg-amber-100",   text: "text-amber-700",   border: "border-amber-300",   label: "En progreso" },
    green:  { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", label: "Consolidado" },
    blue:   { bg: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-300",    label: "Maestría" },
  },
  // Colores semanticos de seccion
  section: {
    professor:  { icon: "text-indigo-600", bg: "bg-indigo-50/60",  border: "border-indigo-200/60", badge: { bg: "bg-indigo-100", text: "text-indigo-600" } },
    student:    { icon: "text-teal-600",   bg: "bg-teal-50",       border: "border-teal-200",      badge: { bg: "bg-teal-100",   text: "text-teal-600"   } },
    connection: { icon: "text-violet-600",  bg: "bg-violet-50",     border: "border-violet-200",    badge: { bg: "bg-violet-100", text: "text-violet-600" } },
    crossRef:   { icon: "text-blue-600",   bg: "bg-blue-50",       border: "border-blue-200",      badge: { bg: "bg-blue-100",   text: "text-blue-600"   } },
    note:       { icon: "text-amber-600",  bg: "bg-amber-50",      border: "border-amber-200",     badge: { bg: "bg-amber-100",  text: "text-amber-600"  } },
    ai:         { icon: "text-sky-600",    bg: "bg-sky-50",        border: "border-sky-200/60",     badge: { bg: "bg-sky-100",    text: "text-sky-600"    } },
  },
  // Tags de comentarios del profesor
  commentTag: {
    tip:        { label: "Tip",         bg: "bg-blue-100",   text: "text-blue-700"   },
    mnemonic:   { label: "Mnemotecnia", bg: "bg-purple-100", text: "text-purple-700" },
    clinical:   { label: "Clinica",     bg: "bg-rose-100",   text: "text-rose-700"   },
    correction: { label: "Correccion",  bg: "bg-orange-100", text: "text-orange-700" },
  },
} as const;

/* ═══════════════════════════════════════════════════════════════════════
   2. UTILIDADES — Helpers de animacion y accesibilidad
   ═══════════════════════════════════════════════════════════════════════ */

/** Clase de focus ring accesible — aplicar a todo boton/link interactivo */
export const focusRing = "focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none";

/**
 * fadeUp — animacion de entrada escalonada.
 * USO: <motion.div {...fadeUp(0.3)}>
 * Respeta prefers-reduced-motion automaticamente.
 */
export function useFadeUp() {
  const shouldReduce = useReducedMotion();
  return useCallback(
    (delay: number) =>
      shouldReduce
        ? {}
        : {
            initial: { y: 20, opacity: 0 } as const,
            animate: { y: 0, opacity: 1 } as const,
            transition: { duration: 0.5, delay },
          },
    [shouldReduce]
  );
}

/** Hook que respeta prefers-reduced-motion. */
export { useReducedMotion as useReducedMotionSafe } from "motion/react";
