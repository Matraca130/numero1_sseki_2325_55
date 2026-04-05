// ============================================================
// Axon — P5Canvas: Core p5.js instance mode wrapper
//
// Features:
//   - Lazy p5 import for code splitting
//   - Instance mode: new P5(sketch, container)
//   - Params via mutable ref (real-time updates, no recreate)
//   - Recreate only on seed/sketch function change
//   - IntersectionObserver: pause (noLoop) when not visible
//   - ResizeObserver: responsive canvas resizing
//   - Screenshot via p.saveCanvas()
//   - Clean cleanup on unmount (p.remove())
// ============================================================
import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import type { SketchFactory, ParamValues } from './types';

export interface P5CanvasHandle {
  /** Save a screenshot of the current canvas state */
  screenshot: (filename?: string) => void;
  /** Restart sketch with current params */
  restart: () => void;
}

interface P5CanvasProps {
  /** The p5 sketch factory function */
  sketch: SketchFactory;
  /** Live param values passed via mutable ref — updates without recreating */
  paramsRef: React.MutableRefObject<ParamValues>;
  /** Seed value — changing this recreates the sketch */
  seed: number;
  /** Width in pixels (optional; defaults to container width) */
  width?: number;
  /** Height in pixels (optional; defaults to computed aspect ratio) */
  height?: number;
  /** CSS class name applied to the outer container */
  className?: string;
  /** Called when p5 instance is ready */
  onReady?: () => void;
  /** Called when an error occurs in the sketch */
  onError?: (err: Error) => void;
}

const P5Canvas = forwardRef<P5CanvasHandle, P5CanvasProps>(function P5Canvas(
  { sketch, paramsRef, seed, width, height, className, onReady, onError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Hold the p5 instance so we can call remove() on cleanup
  const p5InstanceRef = useRef<import('p5') | null>(null);
  // Track whether we've been unmounted to avoid stale callbacks
  const unmountedRef = useRef(false);

  /** Destroy the current p5 instance if one exists */
  const destroyInstance = useCallback(() => {
    if (p5InstanceRef.current) {
      try {
        p5InstanceRef.current.remove();
      } catch {
        // ignore errors during cleanup
      }
      p5InstanceRef.current = null;
    }
  }, []);

  /** Create a fresh p5 instance */
  const createInstance = useCallback(async () => {
    if (!containerRef.current || unmountedRef.current) return;
    destroyInstance();

    // Clear any existing canvas children
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    try {
      // Lazy-import p5 for code splitting
      const P5 = (await import('p5')).default;
      if (!containerRef.current || unmountedRef.current) return;

      const container = containerRef.current;
      const containerWidth = width ?? container.clientWidth ?? 800;
      const containerHeight = height ?? Math.round(containerWidth * (700 / 900));

      // Build the instance-mode sketch wrapper
      const instanceSketch = (p: import('p5')) => {
        // Inject seed into paramsRef so engines can read it
        paramsRef.current = { ...paramsRef.current, _seed: seed };

        // Call the engine's sketch factory
        sketch(p, paramsRef);

        // Capture original setup to inject canvas sizing
        const originalSetup = (p as unknown as { setup?: () => void }).setup;
        (p as unknown as { setup: () => void }).setup = function () {
          p.createCanvas(containerWidth, containerHeight);
          if (originalSetup) originalSetup.call(p);
        };
      };

      const p5Instance = new P5(instanceSketch, container);
      p5InstanceRef.current = p5Instance;

      if (!unmountedRef.current) {
        onReady?.();
      }
    } catch (err) {
      if (!unmountedRef.current) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }, [sketch, paramsRef, seed, width, height, destroyInstance, onReady, onError]);

  // ── Lifecycle: create/destroy on sketch or seed change ──
  useEffect(() => {
    unmountedRef.current = false;
    createInstance();

    return () => {
      unmountedRef.current = true;
      destroyInstance();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sketch, seed]);

  // ── IntersectionObserver: pause when off-screen ──────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const p = p5InstanceRef.current;
        if (!p) return;
        if (entry.isIntersecting) {
          p.loop();
        } else {
          p.noLoop();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── ResizeObserver: resize canvas on container change ────
  useEffect(() => {
    if (width || height) return; // Skip if explicit dimensions are provided
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const p = p5InstanceRef.current;
      if (!p) return;
      const newWidth = entry.contentRect.width;
      if (newWidth > 0) {
        const newHeight = Math.round(newWidth * (700 / 900));
        p.resizeCanvas(newWidth, newHeight);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [width, height]);

  // ── Reduced motion support ─────────────────────────────────
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionPref = (e: MediaQueryListEvent | MediaQueryList) => {
      const p = p5InstanceRef.current;
      if (!p) return;
      if (e.matches) {
        // Reduce to ~15 fps by setting frameRate
        p.frameRate(15);
      } else {
        p.frameRate(60);
      }
    };
    // Apply initial state
    handleMotionPref(mql);
    mql.addEventListener('change', handleMotionPref);
    return () => mql.removeEventListener('change', handleMotionPref);
  }, [sketch, seed]);

  // ── Imperative handle ─────────────────────────────────────
  useImperativeHandle(ref, () => ({
    screenshot: (filename = 'axon-sketch') => {
      p5InstanceRef.current?.saveCanvas(filename, 'png');
    },
    restart: () => {
      createInstance();
    },
    getInstance: () => p5InstanceRef.current,
  }));

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: width ? `${width}px` : '100%', overflow: 'hidden' }}
      role="img"
      aria-label="Visualización algorítmica interactiva"
      data-testid="p5-canvas-container"
    />
  );
});

P5Canvas.displayName = 'P5Canvas';
export default P5Canvas;
