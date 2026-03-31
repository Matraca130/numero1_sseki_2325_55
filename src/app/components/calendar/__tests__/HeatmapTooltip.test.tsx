// ============================================================
// HeatmapTooltip — Component Tests
// ============================================================

import { render, screen } from '@testing-library/react';
import { HeatmapTooltip } from '../HeatmapTooltip';
import type { HeatmapLevel } from '@/app/lib/calendar-constants';

// ── Mock useMediaQuery — force mobile to test MobileTooltip ─
// Mobile path renders the sr-only span with text label directly
// (no hover needed), making it easier to assert WCAG 1.4.1.

vi.mock('@/app/hooks/useMediaQuery', () => ({
  useMediaQuery: () => false,
}));

// ── Mock Radix tooltip (not needed for mobile path) ─────────

vi.mock('@/app/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ── Tests ───────────────────────────────────────────────────

describe('HeatmapTooltip', () => {
  const baseProps = {
    date: '2026-03-15',
    totalMinutes: 45,
    children: <div data-testid="child">Day Cell</div>,
  };

  it('renders children', () => {
    render(<HeatmapTooltip level={2} {...baseProps} />);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows descriptive text, not just color (WCAG 1.4.1)', () => {
    render(<HeatmapTooltip level={2} {...baseProps} />);
    // The sr-only span should be present for screen readers
    expect(screen.getByText('Carga: media')).toBeInTheDocument();
  });

  it.each([
    [0, 'Sin actividad'],
    [1, 'Carga: baja'],
    [2, 'Carga: media'],
    [3, 'Carga: alta'],
    [4, 'Carga: maxima'],
  ] as [HeatmapLevel, string][])(
    'renders level label "%s" for level %i',
    (level, expectedLabel) => {
      render(<HeatmapTooltip level={level} {...baseProps} />);
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    },
  );

  it('sr-only label is present for accessibility', () => {
    const { container } = render(<HeatmapTooltip level={3} {...baseProps} />);
    const srOnly = container.querySelector('.sr-only');
    expect(srOnly).toBeInTheDocument();
    expect(srOnly!.textContent).toBe('Carga: alta');
  });
});
