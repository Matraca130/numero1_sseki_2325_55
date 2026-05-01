// ============================================================
// Axon — RunProgress: Realtime advance test
//
// Verifies that:
//   1. The component renders the initial run from useAtlasRun.
//   2. When the Realtime channel callback fires (simulated), the
//      component refetches the view row and re-renders the new status.
//   3. On terminal status, supabase.removeChannel is called.
//
// First Realtime feature in the FE — locks in the cleanup contract.
// ============================================================
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AtlasRun } from '@/app/types/atlasRuns';

// ── Mock sonner (toast side-effects irrelevant here) ────────
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  },
}));

// ── Mock the supabase client ────────────────────────────────
// We capture the realtime callback so the test can drive it
// synchronously, mimicking a Postgres UPDATE event.
type RealtimeCb = (payload: { new: Record<string, unknown> }) => void | Promise<void>;
const realtimeCallbacks: RealtimeCb[] = [];
const removeChannel = vi.fn();
const fakeChannel: {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
} = {
  on: vi.fn(function (_event: string, _filter: unknown, cb: RealtimeCb) {
    realtimeCallbacks.push(cb);
    return fakeChannel;
  }),
  subscribe: vi.fn((cb?: (status: string) => void | Promise<void>) => {
    // Mimic real client: invoke the status callback asynchronously.
    if (cb) Promise.resolve().then(() => cb('SUBSCRIBED'));
    return fakeChannel;
  }),
};

// supabase.from(...).select(...).eq(...).maybeSingle() chain
let nextSingleResult: { data: AtlasRun | null; error: null } = { data: null, error: null };
const maybeSingle = vi.fn(async () => nextSingleResult);
const eqFn = vi.fn(() => ({ maybeSingle }));
const selectFn = vi.fn(() => ({ eq: eqFn }));
const fromFn = vi.fn(() => ({ select: selectFn }));

vi.mock('@/app/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromFn(...args),
    channel: vi.fn(() => fakeChannel),
    removeChannel: (...args: unknown[]) => removeChannel(...args),
  },
}));

// ── Import after mocks ─────────────────────────────────────
import { RunProgress } from '../RunProgress';

const RUN_ID = '00000000-0000-0000-0000-000000000001';

const RUNNING_RUN: AtlasRun = {
  run_id: RUN_ID,
  user_id: 'u1',
  institution_id: 'i1',
  topic: 'Mitocondria',
  subject: 'Biologia',
  mode: 'contenido',
  status: 'running',
  summary_id: null,
  pdf_name: null,
  started_at: new Date(Date.now() - 5000).toISOString(),
  finished_at: null,
  error_message: null,
  heartbeat_at: null,
};

const COMPLETED_RUN: AtlasRun = {
  ...RUNNING_RUN,
  status: 'ok',
  summary_id: '11111111-1111-1111-1111-111111111111',
  finished_at: new Date().toISOString(),
};

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('RunProgress', () => {
  beforeEach(() => {
    realtimeCallbacks.length = 0;
    removeChannel.mockClear();
    fakeChannel.on.mockClear();
    fakeChannel.subscribe.mockClear();
    fromFn.mockClear();
    selectFn.mockClear();
    eqFn.mockClear();
    maybeSingle.mockClear();
  });

  it('renders the initial run and advances on a Realtime UPDATE', async () => {
    // Initial fetch returns the running run.
    nextSingleResult = { data: RUNNING_RUN, error: null };

    renderWithQuery(<RunProgress runId={RUN_ID} />);

    // Initial state: "En proceso" badge visible.
    await waitFor(() => {
      expect(screen.getByText('En proceso')).toBeInTheDocument();
    });
    expect(screen.getByText('Mitocondria')).toBeInTheDocument();

    // Subscription registered.
    expect(fakeChannel.on).toHaveBeenCalledTimes(1);
    expect(fakeChannel.subscribe).toHaveBeenCalledTimes(1);
    expect(realtimeCallbacks).toHaveLength(1);

    // Simulate a Postgres UPDATE → callback triggers a view refetch.
    nextSingleResult = { data: COMPLETED_RUN, error: null };
    await act(async () => {
      await realtimeCallbacks[0]({ new: COMPLETED_RUN as unknown as Record<string, unknown> });
    });

    // Component now shows "Completado" + the summary_id.
    await waitFor(() => {
      expect(screen.getByText('Completado')).toBeInTheDocument();
    });
    expect(screen.getByText(COMPLETED_RUN.summary_id!)).toBeInTheDocument();

    // Terminal status → channel removed at least once (via in-callback cleanup).
    expect(removeChannel).toHaveBeenCalled();
  });
});
