// ============================================================
// Axon — useMomentum hook
//
// Fetches student study momentum from GET /schedule/momentum.
// Returns: { score: 0-100, trend: rising|stable|falling, streak: number }
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/app/lib/api';

export interface MomentumData {
  score: number;
  trend: 'rising' | 'stable' | 'falling';
  streak: number;
}

const MOMENTUM_KEY = ['schedule-momentum'] as const;

async function fetchMomentum(): Promise<MomentumData> {
  const res = await apiCall<MomentumData>('/schedule/momentum');
  return res;
}

export function useMomentum() {
  return useQuery({
    queryKey: MOMENTUM_KEY,
    queryFn: fetchMomentum,
    staleTime: 5 * 60 * 1000, // 5 min
    retry: 1,
  });
}
