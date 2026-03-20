// ============================================================
// Axon — ProgressTrendChart Tests
//
// Validates:
//   - Empty/insufficient data renders <div class="mb-4" /> (NOT null)
//   - Chart renders for 2+ valid sessions
//   - Trend text (alza / baja / estable) based on score progression
//   - ChartErrorBoundary catches recharts errors
// ============================================================

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ── Mock recharts (jsdom cannot render SVG-based charts) ──────

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children }: any) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  ReferenceLine: () => null,
}));

// ── Import component under test ──────────────────────────────

import { ProgressTrendChart } from '@/app/components/student/ProgressTrendChart';
import { ChartErrorBoundary } from '@/app/components/shared/ChartErrorBoundary';

// ── Session shape matching StudySessionRecord from studySessionApi ──

interface TestSession {
  id: string;
  student_id?: string;
  session_type: 'flashcard' | 'quiz' | 'reading' | 'mixed';
  course_id?: string;
  started_at: string;
  completed_at?: string | null;
  total_reviews?: number;
  correct_reviews?: number;
  created_at: string;
  updated_at?: string;
}

let counter = 0;
function makeSession(overrides: Partial<TestSession> = {}): TestSession {
  counter += 1;
  const date = new Date(2025, 0, counter);
  return {
    id: `session-${counter}`,
    session_type: 'quiz',
    started_at: date.toISOString(),
    created_at: date.toISOString(),
    completed_at: date.toISOString(),
    total_reviews: 10,
    correct_reviews: 7,
    ...overrides,
  };
}

// ── Suppress console.error from ErrorBoundary ────────────────

const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (
      msg.includes('[ErrorBoundary]') ||
      msg.includes('The above error') ||
      msg.includes('Error: Uncaught')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});
afterAll(() => {
  console.error = originalConsoleError;
});

// ── Tests ────────────────────────────────────────────────────

describe('ProgressTrendChart', () => {
  // -----------------------------------------------------------
  // 1. Empty sessions -> renders empty div (NOT null)
  // -----------------------------------------------------------
  it('renders an empty div with class mb-4 when sessions is empty', () => {
    const { container } = render(
      <ProgressTrendChart sessions={[] as any} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toBeInTheDocument();
    expect(root.tagName).toBe('DIV');
    expect(root.className).toBe('mb-4');
    // Should have no visible text content
    expect(root.textContent).toBe('');
  });

  // -----------------------------------------------------------
  // 2. Single session -> renders empty div (< 2 data points)
  // -----------------------------------------------------------
  it('renders empty div when only 1 session is provided', () => {
    const sessions = [makeSession()];
    const { container } = render(
      <ProgressTrendChart sessions={sessions as any} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toBeInTheDocument();
    expect(root.className).toBe('mb-4');
    expect(root.textContent).toBe('');
  });

  // -----------------------------------------------------------
  // 3. Sessions with no completed reviews -> renders empty div
  // -----------------------------------------------------------
  it('renders empty div when sessions have no completed reviews', () => {
    const sessions = [
      makeSession({ completed_at: null, total_reviews: 0 }),
      makeSession({ completed_at: null, total_reviews: 0 }),
      makeSession({ completed_at: undefined, total_reviews: undefined }),
    ];
    const { container } = render(
      <ProgressTrendChart sessions={sessions as any} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toBeInTheDocument();
    expect(root.className).toBe('mb-4');
    expect(root.textContent).toBe('');
  });

  it('renders empty div when sessions have total_reviews=0', () => {
    const sessions = [
      makeSession({ completed_at: new Date().toISOString(), total_reviews: 0 }),
      makeSession({ completed_at: new Date().toISOString(), total_reviews: 0 }),
    ];
    const { container } = render(
      <ProgressTrendChart sessions={sessions as any} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toBe('mb-4');
    expect(root.textContent).toBe('');
  });

  // -----------------------------------------------------------
  // 4. Two+ valid sessions -> renders chart
  // -----------------------------------------------------------
  it('renders the chart container when 2+ valid sessions are provided', () => {
    const sessions = [
      makeSession({ created_at: '2025-01-10T00:00:00Z', total_reviews: 10, correct_reviews: 7 }),
      makeSession({ created_at: '2025-01-11T00:00:00Z', total_reviews: 10, correct_reviews: 8 }),
    ];
    const { container } = render(
      <ProgressTrendChart sessions={sessions as any} />,
    );

    // Chart container with bg-white rounded-xl
    const chartContainer = container.querySelector('.bg-white.rounded-xl');
    expect(chartContainer).toBeInTheDocument();

    // "Tendencia" text appears
    expect(screen.getByText(/Tendencia/)).toBeInTheDocument();

    // "Promedio:" label appears
    expect(screen.getByText(/Promedio:/)).toBeInTheDocument();
  });

  // -----------------------------------------------------------
  // 5. Trend calculation: up
  // -----------------------------------------------------------
  it('shows "Tendencia al alza" when recent scores > early scores by >5%', () => {
    // Early sessions: ~30%, Recent sessions: ~90%
    const sessions = [
      makeSession({ created_at: '2025-01-01T00:00:00Z', total_reviews: 10, correct_reviews: 3 }),
      makeSession({ created_at: '2025-01-02T00:00:00Z', total_reviews: 10, correct_reviews: 3 }),
      makeSession({ created_at: '2025-01-03T00:00:00Z', total_reviews: 10, correct_reviews: 3 }),
      makeSession({ created_at: '2025-01-10T00:00:00Z', total_reviews: 10, correct_reviews: 9 }),
      makeSession({ created_at: '2025-01-11T00:00:00Z', total_reviews: 10, correct_reviews: 9 }),
      makeSession({ created_at: '2025-01-12T00:00:00Z', total_reviews: 10, correct_reviews: 9 }),
    ];
    render(<ProgressTrendChart sessions={sessions as any} />);
    expect(screen.getByText(/Tendencia al alza/)).toBeInTheDocument();
  });

  // -----------------------------------------------------------
  // 6. Trend calculation: down
  // -----------------------------------------------------------
  it('shows "Tendencia a la baja" when recent scores < early scores by >5%', () => {
    // Early sessions: ~90%, Recent sessions: ~30%
    const sessions = [
      makeSession({ created_at: '2025-01-01T00:00:00Z', total_reviews: 10, correct_reviews: 9 }),
      makeSession({ created_at: '2025-01-02T00:00:00Z', total_reviews: 10, correct_reviews: 9 }),
      makeSession({ created_at: '2025-01-03T00:00:00Z', total_reviews: 10, correct_reviews: 9 }),
      makeSession({ created_at: '2025-01-10T00:00:00Z', total_reviews: 10, correct_reviews: 3 }),
      makeSession({ created_at: '2025-01-11T00:00:00Z', total_reviews: 10, correct_reviews: 3 }),
      makeSession({ created_at: '2025-01-12T00:00:00Z', total_reviews: 10, correct_reviews: 3 }),
    ];
    render(<ProgressTrendChart sessions={sessions as any} />);
    expect(screen.getByText(/Tendencia a la baja/)).toBeInTheDocument();
  });

  // -----------------------------------------------------------
  // 7. Trend calculation: neutral
  // -----------------------------------------------------------
  it('shows "Tendencia estable" when scores are within 5% of each other', () => {
    // All sessions: ~70%
    const sessions = [
      makeSession({ created_at: '2025-01-01T00:00:00Z', total_reviews: 10, correct_reviews: 7 }),
      makeSession({ created_at: '2025-01-02T00:00:00Z', total_reviews: 10, correct_reviews: 7 }),
      makeSession({ created_at: '2025-01-03T00:00:00Z', total_reviews: 10, correct_reviews: 7 }),
      makeSession({ created_at: '2025-01-10T00:00:00Z', total_reviews: 10, correct_reviews: 7 }),
      makeSession({ created_at: '2025-01-11T00:00:00Z', total_reviews: 10, correct_reviews: 7 }),
      makeSession({ created_at: '2025-01-12T00:00:00Z', total_reviews: 10, correct_reviews: 7 }),
    ];
    render(<ProgressTrendChart sessions={sessions as any} />);
    expect(screen.getByText(/Tendencia estable/)).toBeInTheDocument();
  });

  // -----------------------------------------------------------
  // 8. ChartErrorBoundary catches recharts errors
  // -----------------------------------------------------------
  it('does not crash when a child of ChartErrorBoundary throws', () => {
    // Component that throws during render, simulating a recharts crash
    const BrokenChart = (): React.ReactElement => {
      throw new Error('recharts insertBefore crash');
    };

    const { container } = render(
      <ChartErrorBoundary height={140}>
        <BrokenChart />
      </ChartErrorBoundary>,
    );

    // The fallback shows "Grafico no disponible"
    expect(screen.getByText(/Grafico no disponible/)).toBeInTheDocument();

    // The component tree did not crash -- container has content
    expect(container.firstElementChild).toBeInTheDocument();
  });

  // -----------------------------------------------------------
  // 9. Average color coding: >= 70 gets emerald
  // -----------------------------------------------------------
  it('applies emerald color class when average >= 70%', () => {
    const sessions = [
      makeSession({ created_at: '2025-01-01T00:00:00Z', total_reviews: 10, correct_reviews: 8 }),
      makeSession({ created_at: '2025-01-02T00:00:00Z', total_reviews: 10, correct_reviews: 8 }),
    ];
    const { container } = render(
      <ProgressTrendChart sessions={sessions as any} />,
    );
    const avgSpan = container.querySelector('.text-emerald-600');
    expect(avgSpan).toBeInTheDocument();
    expect(avgSpan?.textContent).toBe('80%');
  });

  // -----------------------------------------------------------
  // 10. Average color coding: 40-69 gets amber
  // -----------------------------------------------------------
  it('applies amber color class when average is between 40-69%', () => {
    const sessions = [
      makeSession({ created_at: '2025-01-01T00:00:00Z', total_reviews: 10, correct_reviews: 5 }),
      makeSession({ created_at: '2025-01-02T00:00:00Z', total_reviews: 10, correct_reviews: 5 }),
    ];
    const { container } = render(
      <ProgressTrendChart sessions={sessions as any} />,
    );
    const avgSpan = container.querySelector('.text-amber-600');
    expect(avgSpan).toBeInTheDocument();
    expect(avgSpan?.textContent).toBe('50%');
  });

  // -----------------------------------------------------------
  // 11. Average color coding: < 40 gets rose
  // -----------------------------------------------------------
  it('applies rose color class when average < 40%', () => {
    const sessions = [
      makeSession({ created_at: '2025-01-01T00:00:00Z', total_reviews: 10, correct_reviews: 2 }),
      makeSession({ created_at: '2025-01-02T00:00:00Z', total_reviews: 10, correct_reviews: 2 }),
    ];
    const { container } = render(
      <ProgressTrendChart sessions={sessions as any} />,
    );
    const avgSpan = container.querySelector('.text-rose-500');
    expect(avgSpan).toBeInTheDocument();
    expect(avgSpan?.textContent).toBe('20%');
  });
});
