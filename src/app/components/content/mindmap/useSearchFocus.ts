// ============================================================
// Axon — useSearchFocus hook
//
// Listens for Ctrl+F / '/' keydown and focuses the given
// search input ref. Ignores events when already inside inputs.
// ============================================================

import { useEffect, type RefObject } from 'react';

export function useSearchFocus(inputRef: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (el?.isContentEditable) return;
      if (el?.closest?.('[role="dialog"], [role="alertdialog"]')) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [inputRef]);
}
