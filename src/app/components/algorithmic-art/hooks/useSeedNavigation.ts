// ============================================================
// Axon — useSeedNavigation: prev/next/random/jump seed navigation
//
// Syncs seed to URL search param `?seed=N` for shareability.
// ============================================================
import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router';

const MAX_SEED = 99999;

function randomSeed(): number {
  return Math.floor(Math.random() * MAX_SEED) + 1;
}

interface UseSeedNavigationResult {
  seed: number;
  prevSeed: () => void;
  nextSeed: () => void;
  randomizeSeed: () => void;
  jumpToSeed: (s: number) => void;
}

export function useSeedNavigation(initialSeed?: number): UseSeedNavigationResult {
  const [searchParams, setSearchParams] = useSearchParams();

  // Resolve initial seed: URL param > prop > random
  const resolveSeed = useCallback((): number => {
    const urlSeed = parseInt(searchParams.get('seed') ?? '', 10);
    if (!isNaN(urlSeed) && urlSeed > 0) return urlSeed;
    if (initialSeed !== undefined) return initialSeed;
    return randomSeed();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [seed, setSeedState] = useState<number>(resolveSeed);

  const applyJump = useCallback((s: number) => {
    const clamped = Math.max(1, Math.min(MAX_SEED, Math.round(s)));
    setSeedState(clamped);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('seed', String(clamped));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const prevSeed = useCallback(() => {
    setSeedState(prev => {
      const next = prev > 1 ? prev - 1 : MAX_SEED;
      setSearchParams(sp => {
        const n = new URLSearchParams(sp);
        n.set('seed', String(next));
        return n;
      }, { replace: true });
      return next;
    });
  }, [setSearchParams]);

  const nextSeed = useCallback(() => {
    setSeedState(prev => {
      const next = prev < MAX_SEED ? prev + 1 : 1;
      setSearchParams(sp => {
        const n = new URLSearchParams(sp);
        n.set('seed', String(next));
        return n;
      }, { replace: true });
      return next;
    });
  }, [setSearchParams]);

  const randomizeSeed = useCallback(() => {
    applyJump(randomSeed());
  }, [applyJump]);

  const jumpToSeed = useCallback((s: number) => {
    applyJump(s);
  }, [applyJump]);

  // Sync if URL seed changes externally (e.g. browser back/forward)
  useEffect(() => {
    const urlSeed = parseInt(searchParams.get('seed') ?? '', 10);
    if (!isNaN(urlSeed) && urlSeed > 0 && urlSeed !== seed) {
      setSeedState(urlSeed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return { seed, prevSeed, nextSeed, randomizeSeed, jumpToSeed };
}
