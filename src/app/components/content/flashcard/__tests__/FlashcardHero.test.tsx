// ============================================================
// FlashcardHero — Unit Tests
//
// Tests the compact hero section: title, due counts, mastery
// progress, CTA button states, and animation behavior.
//
// Mocks: motion/react (plain elements), lucide-react (spans),
//        ProgressBar, constants.
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────

// motion/react — render plain elements, strip animation props
vi.mock('motion/react', () => {
  const motion = new Proxy(
    {},
    {
      get(_target, prop: string) {
        return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
          const {
            initial, animate, transition, whileHover, whileTap,
            exit, layout, ...rest
          } = props;
          return React.createElement(prop as string, { ...rest, ref });
        });
      },
    },
  );
  return {
    motion,
    useReducedMotion: () => false,
  };
});

// lucide-react — render spans with data-testid
vi.mock('lucide-react', () => {
  const iconFactory = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return <span data-testid={`icon-${name}`} {...props} />;
    };
  return {
    Layers: iconFactory('Layers'),
    Clock: iconFactory('Clock'),
    Brain: iconFactory('Brain'),
    ChevronRight: iconFactory('ChevronRight'),
  };
});

// ProgressBar — simple stub
vi.mock('../ProgressBar', () => ({
  ProgressBar: (props: { value: number }) =>
    <div data-testid="progress-bar" data-value={props.value} />,
}));

// constants — focusRing stub
vi.mock('../constants', () => ({
  focusRing: 'focus-ring-stub',
}));

// ── Import SUT ────────────────────────────────────────────────
import { FlashcardHero, type FlashcardHeroProps } from '../FlashcardHero';

// ── Helpers ───────────────────────────────────────────────────

const defaultProps = (): FlashcardHeroProps => ({
  userName: 'Carlos',
  totalDue: 15,
  totalCards: 50,
  totalMastered: 30,
  globalAccuracy: 72,
  longestStreak: 5,
  decksWithDue: 3,
  totalNewCards: 5,
  deckSpine: [
    { id: 'd1', hasDue: true },
    { id: 'd2', hasDue: true },
    { id: 'd3', hasDue: false },
  ],
  onStartReview: vi.fn(),
});

function renderHero(overrides: Partial<FlashcardHeroProps> = {}) {
  const props = { ...defaultProps(), ...overrides };
  return { ...render(<FlashcardHero {...props} />), props };
}

// ── Tests ─────────────────────────────────────────────────────

describe('FlashcardHero', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Renders the hero section with correct title
  it('renders the "Repaso del día" label', () => {
    renderHero();
    expect(screen.getByText('Repaso del día')).toBeInTheDocument();
  });

  it('renders the due count in the heading', () => {
    renderHero({ totalDue: 15 });
    expect(screen.getByText('15 cards pendientes')).toBeInTheDocument();
  });

  it('renders deck and card breakdown', () => {
    renderHero({ decksWithDue: 3, totalNewCards: 5, totalDue: 15 });
    // reviewCards = max(15 - 5, 0) = 10
    expect(screen.getByText(/3 mazos · 5 nuevas \+ 10 repaso/)).toBeInTheDocument();
  });

  it('uses singular "mazo" when decksWithDue is 1', () => {
    renderHero({ decksWithDue: 1 });
    const matches = screen.getAllByText(/1 mazo/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  // 2. Handles empty props gracefully (totalDue=0)
  it('renders "Sin cards pendientes" when totalDue is 0', () => {
    renderHero({ totalDue: 0 });
    expect(screen.getByText('Sin cards pendientes')).toBeInTheDocument();
  });

  it('disables CTA button when totalDue is 0', () => {
    renderHero({ totalDue: 0 });
    const button = screen.getByText('Sin cards pendientes').closest('button');
    expect(button).toBeDisabled();
  });

  it('does not show subtitle text under CTA when totalDue is 0', () => {
    renderHero({ totalDue: 0, decksWithDue: 0 });
    // The CTA subtitle "X cards · Y mazos" should not appear
    expect(screen.queryByText(/cards ·.*mazos/)).toBeNull();
  });

  it('computes mastery as 0% when totalCards is 0', () => {
    renderHero({ totalCards: 0, totalMastered: 0 });
    expect(screen.getByText(/0\/0 · 0%/)).toBeInTheDocument();
  });

  // 3. Mastery progress display
  it('displays mastery fraction and percentage', () => {
    renderHero({ totalMastered: 30, totalCards: 50 });
    expect(screen.getByText('30/50 · 60%')).toBeInTheDocument();
  });

  it('renders the ProgressBar with correct value', () => {
    renderHero({ totalMastered: 25, totalCards: 100 });
    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toHaveAttribute('data-value', '0.25');
  });

  it('passes 0 to ProgressBar when totalCards is 0', () => {
    renderHero({ totalCards: 0, totalMastered: 0 });
    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toHaveAttribute('data-value', '0');
  });

  // 4. CTA button interaction
  it('calls onStartReview when CTA is clicked', () => {
    const { props } = renderHero({ totalDue: 10 });
    const button = screen.getByText('Comenzar repaso').closest('button');
    fireEvent.click(button!);
    expect(props.onStartReview).toHaveBeenCalledTimes(1);
  });

  it('does not call onStartReview when CTA is disabled (totalDue=0)', () => {
    const { props } = renderHero({ totalDue: 0 });
    const button = screen.getByText('Sin cards pendientes').closest('button');
    fireEvent.click(button!);
    expect(props.onStartReview).not.toHaveBeenCalled();
  });

  // 5. Time estimate
  it('shows estimated time based on totalDue', () => {
    renderHero({ totalDue: 15 });
    // Math.max(Math.round(15 * 0.2), 1) = 3
    expect(screen.getByText('~3 min')).toBeInTheDocument();
  });

  it('shows at least 1 min for small totalDue', () => {
    renderHero({ totalDue: 1 });
    // Math.max(Math.round(1 * 0.2), 1) = 1
    expect(screen.getByText('~1 min')).toBeInTheDocument();
  });

  // 6. Animations — reduced motion
  it('renders the glow element when reduced motion is false', () => {
    const { container } = renderHero();
    // The glow div has the blur-3xl class
    const glowDiv = container.querySelector('.blur-3xl');
    expect(glowDiv).toBeTruthy();
  });

  it('hides the glow element when useReducedMotion returns true', async () => {
    // Re-mock useReducedMotion to return true
    const motionMock = await import('motion/react');
    vi.spyOn(motionMock, 'useReducedMotion').mockReturnValue(true);

    const { container } = renderHero();
    const glowDiv = container.querySelector('.blur-3xl');
    expect(glowDiv).toBeNull();

    vi.restoreAllMocks();
  });

  // 7. Icons render
  it('renders the Layers icon in the header', () => {
    renderHero();
    const icons = screen.getAllByTestId('icon-Layers');
    expect(icons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the Brain icon in mastery section', () => {
    renderHero();
    expect(screen.getByTestId('icon-Brain')).toBeInTheDocument();
  });

  it('renders the Clock icon in time estimate', () => {
    renderHero();
    expect(screen.getByTestId('icon-Clock')).toBeInTheDocument();
  });
});
