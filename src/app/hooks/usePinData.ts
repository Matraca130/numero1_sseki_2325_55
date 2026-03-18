// ============================================================
// Axon — usePinData Hook
//
// M5 audit: Extracted from PinSystem + PinEditor to deduplicate
// identical pin-fetching logic.
//
// Both components were doing the exact same:
//   getModel3DPins(modelId) → setPins(res?.items || [])
//
// This hook provides the shared data layer:
//   { pins, loading, setPins, refetch }
//
// The caller owns CRUD mutations (create/update/delete) because
// PinSystem and PinEditor have different CRUD patterns.
// After mutation, the caller can either:
//   - Optimistically update via setPins(prev => ...)
//   - Or call refetch() to reload from server
// ============================================================

import { useState, useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';
import { getModel3DPins } from '@/app/lib/model3d-api';
import type { Model3DPin } from '@/app/lib/model3d-api';
import { logger } from '@/app/lib/logger';

interface UsePinDataOptions {
  /** Identifier for log messages (e.g. 'PinSystem', 'PinEditor') */
  tag?: string;
  /** When incremented, triggers a refetch. Used by PinSystem to sync
   *  after PinEditor performs CRUD via the shared refreshKey in ModelViewer3D. */
  refreshKey?: number;
}

interface UsePinDataReturn {
  pins: Model3DPin[];
  loading: boolean;
  /** Direct state setter for optimistic updates after CRUD */
  setPins: Dispatch<SetStateAction<Model3DPin[]>>;
  /** Re-fetches pins from the API */
  refetch: () => Promise<void>;
}

export function usePinData(
  modelId: string,
  options: UsePinDataOptions = {},
): UsePinDataReturn {
  const { tag = 'usePinData', refreshKey } = options;

  const [pins, setPins] = useState<Model3DPin[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getModel3DPins(modelId);
      setPins(res?.items || []);
    } catch (err: unknown) {
      logger.error(tag, 'fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [modelId, tag]);

  // Fetch on mount + when refreshKey changes
  useEffect(() => {
    refetch();
  }, [refetch, refreshKey]);

  return { pins, loading, setPins, refetch };
}