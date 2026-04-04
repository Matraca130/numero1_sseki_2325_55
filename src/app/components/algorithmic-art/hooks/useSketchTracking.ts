// ============================================================
// Axon — useSketchTracking: analytics hook for sketch interactions
//
// Inserts into sketch_interactions table via Supabase.
// Non-blocking — errors are silently ignored.
// ============================================================
import { useCallback, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import type { EngineKey, SketchInteraction } from '../types';

interface UseSketchTrackingResult {
  track: (interaction: Omit<SketchInteraction, 'engine'>) => void;
  trackView: (durationMs: number) => void;
}

export function useSketchTracking(engine: EngineKey | null): UseSketchTrackingResult {
  // Debounce param_change events to avoid flooding
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingParamRef = useRef<SketchInteraction | null>(null);

  const flush = useCallback(async (interaction: SketchInteraction) => {
    if (!engine) return;
    try {
      await supabase.from('sketch_interactions').insert({
        engine: interaction.engine,
        action: interaction.action,
        param_key: interaction.param_key ?? null,
        param_value: interaction.param_value != null ? String(interaction.param_value) : null,
        seed: interaction.seed ?? null,
        duration_ms: interaction.duration_ms ?? null,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Silently ignore tracking errors
    }
  }, [engine]);

  const track = useCallback((partial: Omit<SketchInteraction, 'engine'>) => {
    if (!engine) return;
    const interaction: SketchInteraction = { engine, ...partial };

    // Debounce param_change events
    if (partial.action === 'param_change') {
      pendingParamRef.current = interaction;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        if (pendingParamRef.current) {
          flush(pendingParamRef.current);
          pendingParamRef.current = null;
        }
      }, 1000);
      return;
    }

    flush(interaction);
  }, [engine, flush]);

  const trackView = useCallback((durationMs: number) => {
    if (!engine) return;
    flush({ engine, action: 'view', duration_ms: durationMs });
  }, [engine, flush]);

  return { track, trackView };
}
