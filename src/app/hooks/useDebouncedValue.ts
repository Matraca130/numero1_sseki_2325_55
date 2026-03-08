// ============================================================
// Axon — useDebouncedValue
//
// Generic debounce hook. Delays updating a value until the
// caller stops changing it for `delayMs` milliseconds.
//
// Usage:
//   const debouncedSearch = useDebouncedValue(searchQuery, 350);
// ============================================================

import { useState, useEffect } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
