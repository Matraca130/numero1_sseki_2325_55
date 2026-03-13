// ============================================================
// Axon v4.4 — Gamification Context Provider
//
// Sprint G3: Central context to eliminate duplicate hook instances.
// ============================================================

import React, { createContext, useContext } from 'react';
import {
  useGamificationProfile,
  type GamificationState,
} from '@/app/hooks/useGamificationProfile';

const GamificationCtx = createContext<GamificationState | null>(null);

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

export function useGamification(): GamificationState {
  const ctx = useContext(GamificationCtx);
  if (ctx) return ctx;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useGamificationProfile();
}
