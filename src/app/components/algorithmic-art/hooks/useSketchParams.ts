// ============================================================
// Axon — useSketchParams: manages parameter state with defaults
//
// Returns current params, handlers for change/reset, and
// a mutable ref that p5 reads in real-time without causing
// React re-renders for every animation frame.
// ============================================================
import { useState, useRef, useCallback, useEffect } from 'react';
import type { ParamSchema, ParamValues } from '../types';

interface UseSketchParamsResult {
  params: ParamValues;
  paramsRef: React.MutableRefObject<ParamValues>;
  setParam: (key: string, value: number | string | boolean) => void;
  setParams: (values: Partial<ParamValues>) => void;
  resetParams: () => void;
}

export function useSketchParams(schema: ParamSchema | null): UseSketchParamsResult {
  // Build default values from schema
  const buildDefaults = useCallback((s: ParamSchema | null): ParamValues => {
    if (!s) return {};
    return Object.fromEntries(
      Object.entries(s).map(([key, def]) => [key, def.default]),
    );
  }, []);

  const [params, setParams_] = useState<ParamValues>(() => buildDefaults(schema));
  const paramsRef = useRef<ParamValues>(params);

  // Keep ref in sync with React state
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  // When schema changes (engine switch), reset to new defaults
  useEffect(() => {
    const defaults = buildDefaults(schema);
    setParams_(defaults);
    paramsRef.current = defaults;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  const setParam = useCallback((key: string, value: number | string | boolean) => {
    setParams_(prev => {
      const next = { ...prev, [key]: value };
      paramsRef.current = next;
      return next;
    });
  }, []);

  const setParams = useCallback((values: Partial<ParamValues>) => {
    setParams_(prev => {
      const next = { ...prev, ...values };
      paramsRef.current = next;
      return next;
    });
  }, []);

  const resetParams = useCallback(() => {
    const defaults = buildDefaults(schema);
    setParams_(defaults);
    paramsRef.current = defaults;
  }, [schema, buildDefaults]);

  return { params, paramsRef, setParam, setParams, resetParams };
}
