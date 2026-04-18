// ============================================================
// Axon — useSketchUrlState: encode seed + params in URL
//
// Enables sharing sketch state via URL query params.
// Format: /student/sketch/dolor?seed=42&intensity=8&type=somatic
// ============================================================
import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import type { ParamSchema, ParamValues } from '../types';

interface UseSketchUrlStateResult {
  /** Read initial params from URL */
  getUrlParams: () => ParamValues;
  /** Write current params to URL (debounced) */
  syncToUrl: (seed: number, params: ParamValues) => void;
  /** Generate a shareable URL for the current state */
  getShareUrl: (engineKey: string, seed: number, params: ParamValues) => string;
}

const DEBOUNCE_MS = 500;

export function useSketchUrlState(schema: ParamSchema | null): UseSketchUrlStateResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const getUrlParams = useCallback((): ParamValues => {
    if (!schema) return {};
    const result: ParamValues = {};

    for (const [key, def] of Object.entries(schema)) {
      const urlVal = searchParams.get(key);
      if (urlVal === null) continue;

      if (def.type === 'slider') {
        const num = parseFloat(urlVal);
        if (!isNaN(num)) result[key] = num;
      } else if (def.type === 'boolean') {
        result[key] = urlVal === 'true' || urlVal === '1';
      } else {
        result[key] = urlVal;
      }
    }

    return result;
  }, [schema, searchParams]);

  const syncToUrl = useCallback((seed: number, params: ParamValues) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams();
        next.set('seed', String(seed));

        // Only encode non-default params
        if (schema) {
          for (const [key, def] of Object.entries(schema)) {
            const val = params[key];
            if (val !== undefined && val !== def.default) {
              next.set(key, String(val));
            }
          }
        }

        return next;
      }, { replace: true });
    }, DEBOUNCE_MS);
  }, [schema, setSearchParams]);

  const getShareUrl = useCallback((engineKey: string, seed: number, params: ParamValues): string => {
    const url = new URL(window.location.origin);
    url.pathname = `/student/sketch/${engineKey}`;
    url.searchParams.set('seed', String(seed));

    if (schema) {
      for (const [key, def] of Object.entries(schema)) {
        const val = params[key];
        if (val !== undefined && val !== def.default) {
          url.searchParams.set(key, String(val));
        }
      }
    }

    return url.toString();
  }, [schema]);

  return { getUrlParams, syncToUrl, getShareUrl };
}
