import React, { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react';

// ── Types ────────────────────────────────────────────────────

export type ThemeType = 'dark' | 'light';

interface UIContextType {
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  activeSummaryId: string | undefined;
  setActiveSummaryId: (id: string | undefined) => void;
}

const noop = () => {};

const defaultValue: UIContextType = {
  isSidebarOpen: true,
  setSidebarOpen: noop,
  theme: 'light',
  setTheme: noop,
  activeSummaryId: undefined,
  setActiveSummaryId: noop,
};

const UIContext = createContext<UIContextType>(defaultValue);

// ── Provider ─────────────────────────────────────────────────

export function UIProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<ThemeType>('light');
  const [activeSummaryId, setActiveSummaryIdRaw] = useState<string | undefined>(undefined);
  const setActiveSummaryId = useCallback((id: string | undefined) => setActiveSummaryIdRaw(id), []);

  const value = useMemo<UIContextType>(() => ({
    isSidebarOpen,
    setSidebarOpen,
    theme,
    setTheme,
    activeSummaryId,
    setActiveSummaryId,
  }), [isSidebarOpen, theme, activeSummaryId, setActiveSummaryId]);

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────

export function useUI() {
  return useContext(UIContext);
}
