// ============================================================
// Axon v4.4 — Gamification Context Provider
//
// Sprint G3: Central context to eliminate duplicate hook instances.
// GamificationBar, GamificationPanel, BadgeShowcase, and
// XpHistoryTimeline all share the same profile/streak data.
//
// Place <GamificationProvider> inside StudentLayout (once).
// Consume with useGamification() in any child component.
//
// Responsibilities:
//   1. Single instance of useGamificationProfile()
//   2. Daily check-in fires once on mount
//   3. refresh() available to all consumers
//   4. XP delta shared for toast triggering
//
// INTEGRATION NOTE (for StudentLayout — prohibited file):
//   import { GamificationProvider } from '@/app/context/GamificationContext';
//   <GamificationProvider>
//     <GamificationBar />
//     {children}
//   </GamificationProvider>
// ============================================================

import React, { createContext, useContext } from 'react';
import {
  useGamificationProfile,
  type GamificationState,
} from '@/app/hooks/useGamificationProfile';

// ── Context ──────────────────────────────────────────────

const GamificationCtx = createContext<GamificationState | null>(null);

// ── Provider ─────────────────────────────────────────────

interface GamificationProviderProps {
  children: React.ReactNode;
}

export function GamificationProvider({ children }: GamificationProviderProps) {
  const state = useGamificationProfile();

  return (
    <GamificationCtx.Provider value={state}>
      {children}
    </GamificationCtx.Provider>
  );
}

// ── Consumer Hook ────────────────────────────────────────

/**
 * Consume gamification state from the nearest GamificationProvider.
 * Falls back to direct useGamificationProfile() if no provider
 * is present (safe for standalone usage during dev).
 */
export function useGamification(): GamificationState {
  const ctx = useContext(GamificationCtx);
  if (ctx) return ctx;

  // Fallback: no provider found — run hook directly
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useGamificationProfile();
}
