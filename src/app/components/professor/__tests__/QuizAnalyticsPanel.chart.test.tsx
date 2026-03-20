// ============================================================
// QuizAnalyticsPanel — ChartErrorBoundary integration tests
//
// Verifies that the difficulty and type charts:
//   1. Render when useQuizAnalytics returns data
//   2. Show fallback "Grafico no disponible" when recharts throws
// ============================================================

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock recharts ──────────────────────────────────────────
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

// ── Mock motion/react ──────────────────────────────────────
vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div {...props} ref={ref}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ── Mock clsx (passthrough) ────────────────────────────────
vi.mock('clsx', () => ({
  default: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// ── Mock quiz design tokens ────────────────────────────────
vi.mock('@/app/services/quizDesignTokens', () => ({
  MODAL_OVERLAY: 'modal-overlay',
  MODAL_CARD: 'modal-card',
  MODAL_HEADER: 'modal-header',
  BTN_CLOSE: 'btn-close',
  BANNER_ERROR: 'banner-error',
}));

// ── Mock useQuizAnalytics ──────────────────────────────────
const mockUseQuizAnalytics = vi.fn();
vi.mock('@/app/components/professor/useQuizAnalytics', () => ({
  useQuizAnalytics: (...args: any[]) => mockUseQuizAnalytics(...args),
}));

// ── Import components under test ───────────────────────────
import { QuizAnalyticsPanel } from '../QuizAnalyticsPanel';
import { ChartErrorBoundary } from '@/app/components/shared/ChartErrorBoundary';

// ── Mock data matching useQuizAnalytics return shape ────────
const MOCK_DIFF_DATA = [
  { name: 'Facil', value: 3, fill: '#10b981' },
  { name: 'Media', value: 5, fill: '#f59e0b' },
  { name: 'Dificil', value: 2, fill: '#ef4444' },
];

const MOCK_TYPE_DATA = [
  { name: 'Opcion multiple', value: 6, fill: '#6366f1' },
  { name: 'V/F', value: 4, fill: '#8b5cf6' },
];

const LOADED_STATE = {
  loading: false,
  error: null,
  diffData: MOCK_DIFF_DATA,
  typeData: MOCK_TYPE_DATA,
  questionStats: [],
  globalStats: {
    totalQuestions: 10,
    totalAttempts: 25,
    globalSuccessRate: 72,
    avgTimeSec: '15.3',
  },
};

// ── A component that always throws during render ───────────
function ThrowingChart() {
  throw new Error('Recharts insertBefore crash');
  return null; // eslint-disable-line no-unreachable
}

// ── Tests ──────────────────────────────────────────────────

describe('QuizAnalyticsPanel — ChartErrorBoundary integration', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUseQuizAnalytics.mockReset();
  });

  it('renders both charts when data is loaded', () => {
    mockUseQuizAnalytics.mockReturnValue(LOADED_STATE);

    render(
      <QuizAnalyticsPanel
        quizId="q1"
        quizTitle="Test Quiz"
        summaryId="s1"
        onClose={() => {}}
      />,
    );

    // Both chart containers should render
    const containers = screen.getAllByTestId('responsive-container');
    expect(containers).toHaveLength(2);

    const barCharts = screen.getAllByTestId('bar-chart');
    expect(barCharts).toHaveLength(2);

    // Labels for chart sections should be present
    expect(screen.getByText('Por dificultad')).toBeInTheDocument();
    expect(screen.getByText('Por tipo')).toBeInTheDocument();
  });

  it('shows fallback when a chart child throws (ChartErrorBoundary catches)', () => {
    // Test ChartErrorBoundary directly with the same height used in QuizAnalyticsPanel
    render(
      <ChartErrorBoundary height={120}>
        <ThrowingChart />
      </ChartErrorBoundary>,
    );

    expect(screen.getByText('Grafico no disponible')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('shows loading state when data is being fetched', () => {
    mockUseQuizAnalytics.mockReturnValue({
      ...LOADED_STATE,
      loading: true,
    });

    render(
      <QuizAnalyticsPanel
        quizId="q1"
        quizTitle="Test Quiz"
        summaryId="s1"
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('Cargando analytics...')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('shows error state when hook returns an error', () => {
    mockUseQuizAnalytics.mockReturnValue({
      ...LOADED_STATE,
      loading: false,
      error: 'Network error',
    });

    render(
      <QuizAnalyticsPanel
        quizId="q1"
        quizTitle="Test Quiz"
        summaryId="s1"
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });
});
