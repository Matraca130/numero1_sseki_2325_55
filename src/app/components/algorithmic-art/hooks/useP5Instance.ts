// ============================================================
// Axon — useP5Instance: manages p5 lifecycle
//
// Handles create, destroy, and restart on seed change.
// Returns a ref for the container element and the p5 instance.
// ============================================================
import { useRef, useEffect, useCallback } from 'react';
import type { SketchFactory, ParamValues } from '../types';

interface UseP5InstanceOptions {
  sketch: SketchFactory | null;
  paramsRef: React.MutableRefObject<ParamValues>;
  seed: number;
  onReady?: () => void;
  onError?: (err: Error) => void;
}

export function useP5Instance({
  sketch,
  paramsRef,
  seed,
  onReady,
  onError,
}: UseP5InstanceOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5Ref = useRef<import('p5') | null>(null);
  const unmountedRef = useRef(false);

  const destroy = useCallback(() => {
    if (p5Ref.current) {
      try { p5Ref.current.remove(); } catch { /* ignore */ }
      p5Ref.current = null;
    }
  }, []);

  const create = useCallback(async () => {
    if (!containerRef.current || unmountedRef.current || !sketch) return;
    destroy();

    // Clear children
    const container = containerRef.current;
    while (container.firstChild) container.removeChild(container.firstChild);

    try {
      const P5 = (await import('p5')).default;
      if (!container || unmountedRef.current) return;

      // Inject seed into params
      paramsRef.current = { ...paramsRef.current, _seed: seed };

      const instanceSketch = (p: import('p5')) => {
        sketch(p, paramsRef);
      };

      p5Ref.current = new P5(instanceSketch, container);
      if (!unmountedRef.current) onReady?.();
    } catch (err) {
      if (!unmountedRef.current) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }, [sketch, seed, paramsRef, destroy, onReady, onError]);

  useEffect(() => {
    unmountedRef.current = false;
    create();
    return () => {
      unmountedRef.current = true;
      destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sketch, seed]);

  return { containerRef, p5Ref, create, destroy };
}
