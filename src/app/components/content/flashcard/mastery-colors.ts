// ============================================================
// Mastery Colors — SISTEMA B (card mastery absoluto)
// See MASTERY-SYSTEMS.md in repo root for the full 3-system overview.
//
// Este archivo expone colores por card/topic individual sobre p_know [0-1].
// NO usar para rating INPUT (eso es Sistema A en flashcard-types.ts
// RATINGS) ni para keywords con priority (Sistema C en
// lib/mastery-helpers.ts). Los tres sistemas NO son intercambiables.
// ============================================================
export interface MasteryColorSet {
  level: 0 | 1 | 2 | 3 | 4 | 5;
  hex: string;
  accent: string;
  accentLight: string;
  dot: string;
  text: string;
  border: string;
  hoverAccent: string;
  label: string;
}

const SLATE: MasteryColorSet = { level: 0, hex: '#94a3b8', accent: 'bg-slate-400', accentLight: 'bg-slate-50', dot: 'bg-slate-400', text: 'text-slate-500', border: 'border-slate-300', hoverAccent: 'hover:bg-slate-500', label: 'Nueva' } as const;
const ROSE: MasteryColorSet = { level: 1, hex: '#f43f5e', accent: 'bg-rose-500', accentLight: 'bg-rose-50', dot: 'bg-rose-500', text: 'text-rose-600', border: 'border-rose-300', hoverAccent: 'hover:bg-rose-600', label: 'No sabe' } as const;
const ORANGE: MasteryColorSet = { level: 2, hex: '#f97316', accent: 'bg-orange-500', accentLight: 'bg-orange-50', dot: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-300', hoverAccent: 'hover:bg-orange-600', label: 'Dificil' } as const;
const AMBER: MasteryColorSet = { level: 3, hex: '#f59e0b', accent: 'bg-amber-500', accentLight: 'bg-amber-50', dot: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-300', hoverAccent: 'hover:bg-amber-600', label: 'En progreso' } as const;
const TEAL: MasteryColorSet = { level: 4, hex: '#14b8a6', accent: 'bg-teal-500', accentLight: 'bg-teal-50', dot: 'bg-teal-500', text: 'text-teal-600', border: 'border-teal-300', hoverAccent: 'hover:bg-teal-600', label: 'Bien' } as const;
const EMERALD: MasteryColorSet = { level: 5, hex: '#10b981', accent: 'bg-emerald-500', accentLight: 'bg-emerald-50', dot: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-300', hoverAccent: 'hover:bg-emerald-600', label: 'Dominada' } as const;

const MASTERY_COLORS: Record<number, MasteryColorSet> = { 0: SLATE, 1: ROSE, 2: ORANGE, 3: AMBER, 4: TEAL, 5: EMERALD };

export function getMasteryColor(mastery: number | undefined | null): MasteryColorSet {
  if (mastery == null || !Number.isFinite(mastery)) return SLATE;
  const clamped = Math.max(0, Math.min(5, Math.round(mastery)));
  return MASTERY_COLORS[clamped] ?? SLATE;
}

export function getMasteryColorFromPct(ratio: number): MasteryColorSet {
  if (ratio >= 0.90) return EMERALD;
  if (ratio >= 0.75) return TEAL;
  if (ratio >= 0.60) return AMBER;
  if (ratio >= 0.40) return ORANGE;
  if (ratio >= 0.20) return ROSE;
  return SLATE;
}

export const DOT_COLORS: readonly MasteryColorSet[] = [ROSE, ORANGE, AMBER, TEAL, EMERALD] as const;

export const MASTERY_HEX_SCALE: readonly string[] = ['#94a3b8', '#f43f5e', '#f97316', '#f59e0b', '#14b8a6', '#10b981'] as const;
