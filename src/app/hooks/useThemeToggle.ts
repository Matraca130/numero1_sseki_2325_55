import { useState, useCallback, useEffect, type RefObject } from 'react';

const STORAGE_KEY = 'axon-reader-theme';

interface UseThemeToggleReturn {
  isDark: boolean;
  toggle: () => void;
}

/**
 * Hook for toggling dark mode on a specific container element (e.g. the .axon-reader div).
 * Persists preference to localStorage and toggles the `dark` class
 * only on the referenced container — never on document.documentElement.
 */
export function useThemeToggle(containerRef: RefObject<HTMLElement | null>): UseThemeToggleReturn {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (isDark) {
      el.classList.add('dark');
    } else {
      el.classList.remove('dark');
    }

    try {
      localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // localStorage unavailable — silently ignore
    }

    return () => {
      el.classList.remove('dark');
    };
  }, [isDark, containerRef]);

  const toggle = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  return { isDark, toggle };
}
