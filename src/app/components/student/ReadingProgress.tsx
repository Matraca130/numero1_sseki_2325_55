import { useState, useEffect, useCallback } from "react";

interface ReadingProgressProps {
  /** The scrollable container ref — if null, uses window scroll */
  containerRef?: React.RefObject<HTMLElement>;
}

export function ReadingProgress({ containerRef }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);

  const handleScroll = useCallback(() => {
    let scrollTop: number;
    let scrollHeight: number;
    let clientHeight: number;

    if (containerRef?.current) {
      const el = containerRef.current;
      scrollTop = el.scrollTop;
      scrollHeight = el.scrollHeight;
      clientHeight = el.clientHeight;
    } else {
      scrollTop = window.scrollY;
      scrollHeight = document.documentElement.scrollHeight;
      clientHeight = window.innerHeight;
    }

    const max = scrollHeight - clientHeight;
    setProgress(max > 0 ? (scrollTop / max) * 100 : 0);
  }, [containerRef]);

  useEffect(() => {
    const target = containerRef?.current ?? window;
    target.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => target.removeEventListener("scroll", handleScroll);
  }, [containerRef, handleScroll]);

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progreso de lectura"
      className="fixed top-0 left-0 z-50 h-[3px] bg-axon-teal-accent transition-[width] duration-100 ease-out"
      style={{ width: `${progress}%` }}
    />
  );
}
