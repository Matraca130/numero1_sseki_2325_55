// ============================================================
// CalendarSkeleton — Component Tests
// ============================================================

import { render, screen } from '@testing-library/react';
import { CalendarSkeleton } from '../CalendarSkeleton';

// ── Mock useMediaQuery (default: desktop) ───────────────────

vi.mock('@/app/hooks/useMediaQuery', () => ({
  useMediaQuery: () => true,
}));

// ── Tests ───────────────────────────────────────────────────

describe('CalendarSkeleton', () => {
  it('renders without crash', () => {
    render(<CalendarSkeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-label="Cargando calendario"', () => {
    render(<CalendarSkeleton />);
    expect(screen.getByLabelText('Cargando calendario')).toBeInTheDocument();
  });

  it('renders 7 day-of-week columns in the header grid', () => {
    const { container } = render(<CalendarSkeleton />);
    // The day labels grid has 7 children (one per weekday)
    const dayLabelGrid = container.querySelector('.grid.grid-cols-7.gap-1.mb-2');
    expect(dayLabelGrid).toBeInTheDocument();
    expect(dayLabelGrid!.children).toHaveLength(7);
  });

  it('renders 35 skeleton cells (5 rows x 7 columns)', () => {
    const { container } = render(<CalendarSkeleton />);
    const cells = container.querySelectorAll('.animate-pulse.rounded-lg');
    expect(cells).toHaveLength(35);
  });

  it('has animate-pulse class on skeleton cells', () => {
    const { container } = render(<CalendarSkeleton />);
    const pulsingElements = container.querySelectorAll('.animate-pulse');
    expect(pulsingElements.length).toBeGreaterThan(0);
  });

  it('has screen reader text', () => {
    render(<CalendarSkeleton />);
    expect(screen.getByText('Cargando calendario...')).toBeInTheDocument();
  });
});
