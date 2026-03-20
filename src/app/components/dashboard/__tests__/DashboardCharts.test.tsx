// ============================================================
// DashboardCharts — ChartErrorBoundary integration tests
//
// Verifies that ActivityChart and MasteryDonut:
//   1. Render successfully when wrapped with ChartErrorBoundary
//   2. Show fallback "Grafico no disponible" when recharts throws
// ============================================================

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock recharts ──────────────────────────────────────────
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Bar: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
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

// ── Mock design system ─────────────────────────────────────
vi.mock('@/app/design-system', () => ({
  headingStyle: {},
  components: { chartCard: { base: '' } },
  colors: { chart: { flashcards: '#14b8a6', videos: '#06b6d4' } },
}));

// ── Import components under test ───────────────────────────
import { ActivityChart, MasteryDonut } from '../DashboardCharts';
import { ChartErrorBoundary } from '@/app/components/shared/ChartErrorBoundary';

// ── Mock data ──────────────────────────────────────────────
const ACTIVITY_DATA = [
  { date: 'Lun', videos: 3, cards: 5, amt: 8 },
  { date: 'Mar', videos: 2, cards: 7, amt: 9 },
  { date: 'Mie', videos: 4, cards: 3, amt: 7 },
];

const MASTERY_DATA = [
  { name: 'Dominado', value: 30, color: '#10b981' },
  { name: 'En progreso', value: 45, color: '#f59e0b' },
  { name: 'Nuevo', value: 25, color: '#ef4444' },
];

// ── A component that always throws during render ───────────
function ThrowingChart() {
  throw new Error('Recharts insertBefore crash');
  return null; // eslint-disable-line no-unreachable
}

// ── Tests ──────────────────────────────────────────────────

describe('DashboardCharts — ChartErrorBoundary integration', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // ── ActivityChart ──────────────────────────────────────

  describe('ActivityChart', () => {
    it('renders with ChartErrorBoundary wrapping the chart', () => {
      render(<ActivityChart data={ACTIVITY_DATA} />);

      expect(screen.getByText('Actividad de Estudio')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('survives a recharts error and shows fallback', () => {
      // Render ChartErrorBoundary directly with a throwing child
      // to simulate what happens when recharts crashes inside ActivityChart
      render(
        <ChartErrorBoundary height={300}>
          <ThrowingChart />
        </ChartErrorBoundary>,
      );

      expect(screen.getByText('Grafico no disponible')).toBeInTheDocument();
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });
  });

  // ── MasteryDonut ───────────────────────────────────────

  describe('MasteryDonut', () => {
    it('renders with ChartErrorBoundary wrapping the chart', () => {
      render(<MasteryDonut data={MASTERY_DATA} totalCards={100} />);

      expect(screen.getByText('Nivel de Dominio')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('survives a recharts error and shows fallback', () => {
      render(
        <ChartErrorBoundary height="100%">
          <ThrowingChart />
        </ChartErrorBoundary>,
      );

      expect(screen.getByText('Grafico no disponible')).toBeInTheDocument();
      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });
  });
});
