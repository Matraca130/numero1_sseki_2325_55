// ============================================================
// AdminAIHealthPage — Component tests
//
// Tests rendering, loading/error states, stat calculations,
// and log table display for AI health monitoring.
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import type { AiScheduleLog } from '@/app/services/platform-api/pa-ai';

// ── Mock motion/react ──────────────────────────────────────
vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div {...props} ref={ref}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ── Mock UI components ─────────────────────────────────────
vi.mock('@/app/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div className={className} data-testid="skeleton" />,
}));

vi.mock('@/app/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/app/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock('@/app/components/shared/PageHeader', () => ({
  PageHeader: ({ title, subtitle, icon, actions }: any) => (
    <div data-testid="page-header">
      <div>{icon}</div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {actions && <div>{actions}</div>}
    </div>
  ),
}));

// ── Mock API ───────────────────────────────────────────────
const mockGetAiScheduleLogs = vi.fn();

vi.mock('@/app/services/platform-api/pa-ai', () => ({
  getAiScheduleLogs: (...args: any[]) => mockGetAiScheduleLogs(...args),
}));

// ── Mock contexts ──────────────────────────────────────────
const mockUseAuth = vi.fn();

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Import after mocks ────────────────────────────────────
import { AdminAIHealthPage } from '../AdminAIHealthPage';
import { render, screen as libScreen } from '@testing-library/react';

// ── Mock data ──────────────────────────────────────────────

function createMockLog(overrides?: Partial<AiScheduleLog>): AiScheduleLog {
  return {
    id: 'log-1',
    created_at: '2025-04-03T10:00:00Z',
    action: 'generate_summary',
    status: 'success',
    model: 'gpt-4',
    latency_ms: 1200,
    tokens_used: 500,
    error_message: null,
    fallback_reason: null,
    ...overrides,
  };
}

// ── Test suite ─────────────────────────────────────────────

describe('AdminAIHealthPage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1', email: 'admin@test.com' },
      role: 'admin',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Rendering & Loading Tests ────────────────────────

  it('renders without crashing with admin role', async () => {
    mockGetAiScheduleLogs.mockResolvedValue({ items: [] });
    render(<AdminAIHealthPage />);
    await waitFor(() => {
      expect(screen.getByText('AI Health')).toBeInTheDocument();
    });
  });

  it('displays page header with title and subtitle', async () => {
    mockGetAiScheduleLogs.mockResolvedValue({ items: [] });
    render(<AdminAIHealthPage />);
    await waitFor(() => {
      expect(screen.getByText('AI Health')).toBeInTheDocument();
      expect(screen.getByText(/Monitoreo del rendimiento/)).toBeInTheDocument();
    });
  });

  it('shows loading skeleton while fetching logs', async () => {
    mockGetAiScheduleLogs.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ items: [] }), 100))
    );
    render(<AdminAIHealthPage />);
    const skeletons = screen.queryAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // ── Stats Card Tests ───────────────────────────────────

  it('displays all four stat cards when logs are loaded', async () => {
    const logs = [
      createMockLog(),
      createMockLog({ status: 'fallback' }),
      createMockLog({ status: 'error' }),
    ];
    mockGetAiScheduleLogs.mockResolvedValue({ items: logs });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      expect(screen.getByText('Total llamadas')).toBeInTheDocument();
      expect(screen.getByText('Tasa de exito')).toBeInTheDocument();
      expect(screen.getByText('Latencia promedio')).toBeInTheDocument();
      expect(screen.getByText('Tasa de fallback')).toBeInTheDocument();
    });
  });

  it('calculates correct total calls count', async () => {
    const logs = Array.from({ length: 5 }, (_, i) =>
      createMockLog({ id: `log-${i}` })
    );
    mockGetAiScheduleLogs.mockResolvedValue({ items: logs });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      const fiveElements = screen.getAllByText(/^5$/);
      expect(fiveElements.length).toBeGreaterThan(0);
    });
  });

  it('calculates correct success rate percentage', async () => {
    const logs = [
      createMockLog({ status: 'success' }),
      createMockLog({ status: 'success' }),
      createMockLog({ status: 'error' }),
    ];
    mockGetAiScheduleLogs.mockResolvedValue({ items: logs });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      // 2 success out of 3 = 66.7%
      expect(screen.getByText(/66\./)).toBeInTheDocument();
    });
  });

  it('calculates correct average latency', async () => {
    const logs = [
      createMockLog({ latency_ms: 1000 }),
      createMockLog({ latency_ms: 2000 }),
      createMockLog({ latency_ms: 3000 }),
    ];
    mockGetAiScheduleLogs.mockResolvedValue({ items: logs });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      // Average = 2000 ms (will appear in stats card and log table)
      const latencyElements = screen.getAllByText('2,000 ms');
      expect(latencyElements.length).toBeGreaterThan(0);
    });
  });

  it('calculates correct fallback rate percentage', async () => {
    const logs = [
      createMockLog({ status: 'fallback' }),
      createMockLog({ status: 'fallback' }),
      createMockLog({ status: 'success' }),
      createMockLog({ status: 'success' }),
    ];
    mockGetAiScheduleLogs.mockResolvedValue({ items: logs });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      // 2 fallback out of 4 = 50% (will appear in stats card)
      const fallbackRateElements = screen.getAllByText('50.0%');
      expect(fallbackRateElements.length).toBeGreaterThan(0);
    });
  });

  // ── Log Table Tests ────────────────────────────────────

  it('displays log table with headers when logs exist', async () => {
    mockGetAiScheduleLogs.mockResolvedValue({ items: [createMockLog()] });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      expect(screen.getByText('Timestamp')).toBeInTheDocument();
      expect(screen.getByText('Accion')).toBeInTheDocument();
      expect(screen.getByText('Estado')).toBeInTheDocument();
      expect(screen.getByText('Modelo')).toBeInTheDocument();
      expect(screen.getByText('Latencia')).toBeInTheDocument();
      expect(screen.getByText('Tokens')).toBeInTheDocument();
    });
  });

  it('displays log entries with correct data', async () => {
    mockGetAiScheduleLogs.mockResolvedValue({
      items: [createMockLog({ action: 'generate_quiz' })],
    });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      expect(screen.getByText('generate_quiz')).toBeInTheDocument();
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
    });
  });

  it('formats timestamp correctly in table', async () => {
    mockGetAiScheduleLogs.mockResolvedValue({
      items: [createMockLog()],
    });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      // Should show formatted date (locale specific)
      const timestampElements = screen.getAllByText(/0[3456]/);
      expect(timestampElements.length).toBeGreaterThan(0);
    });
  });

  it('displays status badge for each log entry', async () => {
    mockGetAiScheduleLogs.mockResolvedValue({
      items: [
        createMockLog({ status: 'success' }),
        createMockLog({ status: 'fallback' }),
        createMockLog({ status: 'error' }),
      ],
    });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      expect(screen.getByText('Exito')).toBeInTheDocument();
      expect(screen.getByText('Fallback')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  it('shows latency value in log table', async () => {
    mockGetAiScheduleLogs.mockResolvedValue({
      items: [createMockLog({ latency_ms: 1500 })],
    });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      const latencyElements = screen.getAllByText('1,500 ms');
      expect(latencyElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows tokens_used value in log table', async () => {
    mockGetAiScheduleLogs.mockResolvedValue({
      items: [createMockLog({ tokens_used: 750 })],
    });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      expect(screen.getByText('750')).toBeInTheDocument();
    });
  });

  // ── Empty State Tests ──────────────────────────────────

  it('displays empty state when no logs exist', async () => {
    mockGetAiScheduleLogs.mockResolvedValue({ items: [] });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      expect(screen.getByText('Sin registros de IA')).toBeInTheDocument();
      expect(
        screen.getByText(/Aun no hay actividad de IA registrada/)
      ).toBeInTheDocument();
    });
  });

  it('shows zero stats when no logs exist', async () => {
    mockGetAiScheduleLogs.mockResolvedValue({ items: [] });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  // ── Error State Tests ──────────────────────────────────

  it('displays error state when API call fails', async () => {
    mockGetAiScheduleLogs.mockRejectedValue(
      new Error('Failed to fetch logs')
    );

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      expect(screen.getByText('Error al cargar')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch logs')).toBeInTheDocument();
    });
  });

  it('shows retry button in error state', async () => {
    mockGetAiScheduleLogs.mockRejectedValue(
      new Error('Connection failed')
    );

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      expect(screen.getByText('Reintentar')).toBeInTheDocument();
    });
  });

  it('calls API again when retry button is clicked', async () => {
    mockGetAiScheduleLogs.mockRejectedValue(
      new Error('First failure')
    );

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      expect(screen.getByText('Reintentar')).toBeInTheDocument();
    });

    mockGetAiScheduleLogs.mockResolvedValue({ items: [] });

    const retryBtn = screen.getByText('Reintentar');
    retryBtn.click();

    await waitFor(() => {
      expect(mockGetAiScheduleLogs).toHaveBeenCalledTimes(2);
    });
  });

  // ── Log Limit Tests ────────────────────────────────────

  it('respects log limit parameter when fetching', async () => {
    mockGetAiScheduleLogs.mockResolvedValue({ items: [] });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      expect(mockGetAiScheduleLogs).toHaveBeenCalledWith({ limit: 50 });
    });
  });

  // ── Edge Cases ─────────────────────────────────────────

  it('handles logs with null latency values', async () => {
    mockGetAiScheduleLogs.mockResolvedValue({
      items: [createMockLog({ latency_ms: null })],
    });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      const dashes = screen.getAllByText('--');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  it('handles logs with null tokens values', async () => {
    mockGetAiScheduleLogs.mockResolvedValue({
      items: [createMockLog({ tokens_used: null })],
    });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      const dashes = screen.getAllByText('--');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  it('displays error message from logs when present', async () => {
    mockGetAiScheduleLogs.mockResolvedValue({
      items: [
        createMockLog({
          status: 'error',
          error_message: 'Rate limit exceeded',
        }),
      ],
    });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
    });
  });

  it('displays fallback reason when status is fallback', async () => {
    mockGetAiScheduleLogs.mockResolvedValue({
      items: [
        createMockLog({
          status: 'fallback',
          fallback_reason: 'Used cached response',
        }),
      ],
    });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      expect(screen.getByText('Used cached response')).toBeInTheDocument();
    });
  });

  // ── Refresh Button Tests ───────────────────────────────

  it('renders refresh button in header', async () => {
    mockGetAiScheduleLogs.mockResolvedValue({ items: [] });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      expect(screen.getByText('Actualizar')).toBeInTheDocument();
    });
  });

  it('fetches logs again when refresh button is clicked', async () => {
    mockGetAiScheduleLogs.mockResolvedValue({ items: [] });

    render(<AdminAIHealthPage />);
    await waitFor(() => {
      expect(mockGetAiScheduleLogs).toHaveBeenCalledTimes(1);
    });

    const refreshBtn = screen.getByText('Actualizar');
    refreshBtn.click();

    await waitFor(() => {
      expect(mockGetAiScheduleLogs).toHaveBeenCalledTimes(2);
    });
  });
});
