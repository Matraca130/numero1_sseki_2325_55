import React, { createContext, useContext, useState, useMemo, type ReactNode } from 'react';

// ── Types ────────────────────────────────────────────────────

export type ThemeType = 'dark' | 'light';

interface UIContextType {
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const noop = () => {};

const defaultValue: UIContextType = {
  isSidebarOpen: true,
  setSidebarOpen: noop,
  theme: 'light',
  setTheme: noop,
};

const UIContext = createContext<UIContextType>(defaultValue);

// ── Provider ─────────────────────────────────────────────────

export function UIProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<ThemeType>('light');

  const value = useMemo<UIContextType>(() => ({
    isSidebarOpen,
    setSidebarOpen,
    theme,
    setTheme,
  }), [isSidebarOpen, theme]);

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
