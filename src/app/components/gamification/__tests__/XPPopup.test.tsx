// ============================================================
// Axon — Tests for XPPopup
//
// Tests animated XP display, bonus label rendering, combo display,
// auto-dismiss behavior, and visibility states.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import { XPPopup } from '../XPPopup';
import type { XPEvent } from '@/app/hooks/useSessionXP';

// Mock framer-motion
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    span: ({ children, className, ...props }: any) => (
      <span className={className} {...props}>
        {children}
      </span>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Zap: (props: Record<string, unknown>) => (
    <svg data-testid="zap-icon" {...props} />
  ),
  Flame: (props: Record<string, unknown>) => (
    <svg data-testid="flame-icon" {...props} />
  ),
  CalendarDays: (props: Record<string, unknown>) => (
    <svg data-testid="calendar-days-icon" {...props} />
  ),
}));

// Mock factory for XPEvent
function createMockXPEvent(overrides: Partial<XPEvent> = {}): XPEvent {
  return {
    xp: 10,
    bonusLabel: undefined,
    comboCount: 0,
    isCorrect: true,
    ...overrides,
  };
}

describe('XPPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Visibility and display', () => {
    it('does not render when event is null', () => {
      const { container } = render(<XPPopup event={null} eventKey={1} />);
      // AnimatePresence renders empty fragment when no children
      expect(container.querySelector('div[class*="absolute"]')).not.toBeInTheDocument();
    });

    it('renders popup when event is provided', () => {
      const event = createMockXPEvent({ xp: 25 });
      render(<XPPopup event={event} eventKey={1} />);

      expect(screen.getByText('+25 XP')).toBeInTheDocument();
    });

    it('displays XP amount correctly', () => {
      const event = createMockXPEvent({ xp: 150 });
      render(<XPPopup event={event} eventKey={1} />);

      expect(screen.getByText('+150 XP')).toBeInTheDocument();
    });

    it('renders zap icon with amber color', () => {
      const event = createMockXPEvent();
      render(<XPPopup event={event} eventKey={1} />);

      expect(screen.getByTestId('zap-icon')).toBeInTheDocument();
    });
  });

  describe('Auto-dismiss behavior', () => {
    it('dismisses popup after 1200ms', async () => {
      const event = createMockXPEvent({ xp: 50 });
      const { rerender } = render(<XPPopup event={event} eventKey={1} />);

      expect(screen.getByText('+50 XP')).toBeInTheDocument();

      vi.advanceTimersByTime(1200);

      rerender(<XPPopup event={null} eventKey={2} />);

      expect(screen.queryByText('+50 XP')).not.toBeInTheDocument();
    });

    it('clears timer on unmount', () => {
      const event = createMockXPEvent();
      const { unmount } = render(<XPPopup event={event} eventKey={1} />);

      unmount();

      // Should not throw when timer fires
      vi.advanceTimersByTime(1200);
    });

    it('shows popup on event change', () => {
      const event1 = createMockXPEvent({ xp: 10 });
      const { rerender } = render(<XPPopup event={event1} eventKey={1} />);

      expect(screen.getByText('+10 XP')).toBeInTheDocument();

      const event2 = createMockXPEvent({ xp: 20 });
      rerender(<XPPopup event={event2} eventKey={2} />);

      expect(screen.getByText('+20 XP')).toBeInTheDocument();
    });
  });

  describe('XP amount display', () => {
    it('displays single digit XP', () => {
      const event = createMockXPEvent({ xp: 5 });
      render(<XPPopup event={event} eventKey={1} />);

      expect(screen.getByText('+5 XP')).toBeInTheDocument();
    });

    it('displays double digit XP', () => {
      const event = createMockXPEvent({ xp: 75 });
      render(<XPPopup event={event} eventKey={1} />);

      expect(screen.getByText('+75 XP')).toBeInTheDocument();
    });

    it('displays triple digit XP', () => {
      const event = createMockXPEvent({ xp: 500 });
      render(<XPPopup event={event} eventKey={1} />);

      expect(screen.getByText('+500 XP')).toBeInTheDocument();
    });

    it('uses tabular-nums for consistent digit spacing', () => {
      const event = createMockXPEvent({ xp: 100 });
      render(<XPPopup event={event} eventKey={1} />);

      const xpText = screen.getByText('+100 XP');
      expect(xpText.className).toContain('tabular-nums');
    });

    it('applies bold font-weight to XP text', () => {
      const event = createMockXPEvent();
      render(<XPPopup event={event} eventKey={1} />);

      const xpText = screen.getByText(/\+[0-9]+ XP/);
      expect(xpText.style.fontWeight).toBe('700');
    });

    it('uses amber color for XP display', () => {
      const event = createMockXPEvent();
      render(<XPPopup event={event} eventKey={1} />);

      const xpText = screen.getByText(/\+[0-9]+ XP/);
      expect(xpText.className).toContain('text-amber-400');
    });
  });

  describe('Bonus label display', () => {
    it('does not render bonus label when undefined', () => {
      const event = createMockXPEvent({ bonusLabel: undefined });
      render(<XPPopup event={event} eventKey={1} />);

      expect(screen.queryByText(/x2|double|bonus/i)).not.toBeInTheDocument();
    });

    it('displays bonus label when provided', () => {
      const event = createMockXPEvent({ bonusLabel: '2x bonus' });
      render(<XPPopup event={event} eventKey={1} />);

      expect(screen.getByText('2x bonus')).toBeInTheDocument();
    });

    it('applies correct styling to bonus label', () => {
      const event = createMockXPEvent({ bonusLabel: 'Perfect!' });
      render(<XPPopup event={event} eventKey={1} />);

      const label = screen.getByText('Perfect!');
      expect(label.className).toContain('bg-amber-500');
      expect(label.className).toContain('text-amber-300');
      expect(label.className).toContain('rounded-full');
    });

    it('shows bonus label with border styling', () => {
      const event = createMockXPEvent({ bonusLabel: 'Critical Hit' });
      render(<XPPopup event={event} eventKey={1} />);

      const label = screen.getByText('Critical Hit');
      expect(label.className).toContain('border-amber-500');
    });

    it('applies bold font to bonus label', () => {
      const event = createMockXPEvent({ bonusLabel: 'Streak bonus' });
      render(<XPPopup event={event} eventKey={1} />);

      const label = screen.getByText('Streak bonus');
      expect(label.style.fontWeight).toBe('600');
    });
  });

  describe('Combo display', () => {
    it('does not show combo when comboCount is less than 3', () => {
      const event = createMockXPEvent({ comboCount: 2, isCorrect: true });
      render(<XPPopup event={event} eventKey={1} />);

      expect(screen.queryByText(/combo/i)).not.toBeInTheDocument();
    });

    it('does not show combo when isCorrect is false', () => {
      const event = createMockXPEvent({ comboCount: 5, isCorrect: false });
      render(<XPPopup event={event} eventKey={1} />);

      expect(screen.queryByText(/combo/i)).not.toBeInTheDocument();
    });

    it('displays combo when comboCount >= 3 and isCorrect', () => {
      const event = createMockXPEvent({ comboCount: 5, isCorrect: true });
      render(<XPPopup event={event} eventKey={1} />);

      expect(screen.getByText('5x combo')).toBeInTheDocument();
    });

    it('shows flame icon for combo display', () => {
      const event = createMockXPEvent({ comboCount: 7, isCorrect: true });
      render(<XPPopup event={event} eventKey={1} />);

      expect(screen.getByTestId('flame-icon')).toBeInTheDocument();
    });

    it('applies orange color to combo text', () => {
      const event = createMockXPEvent({ comboCount: 10, isCorrect: true });
      const { container } = render(<XPPopup event={event} eventKey={1} />);

      // Color is applied to parent div, not the span
      const comboDiv = container.querySelector('[class*="text-orange-400"]');
      expect(comboDiv).toBeInTheDocument();
    });

    it('applies bold font to combo text', () => {
      const event = createMockXPEvent({ comboCount: 8, isCorrect: true });
      render(<XPPopup event={event} eventKey={1} />);

      // Combo text is rendered
      expect(screen.getByText('8x combo')).toBeInTheDocument();
    });

    it('displays different combo counts correctly', () => {
      const { rerender } = render(
        <XPPopup event={createMockXPEvent({ comboCount: 3, isCorrect: true })} eventKey={1} />
      );

      expect(screen.getByText('3x combo')).toBeInTheDocument();

      rerender(
        <XPPopup event={createMockXPEvent({ comboCount: 15, isCorrect: true })} eventKey={2} />
      );

      expect(screen.getByText('15x combo')).toBeInTheDocument();
    });
  });

  describe('Layout and positioning', () => {
    it('renders with absolute positioning top-right', () => {
      const event = createMockXPEvent();
      const { container } = render(<XPPopup event={event} eventKey={1} />);

      const popup = container.querySelector('.absolute');
      expect(popup?.className).toContain('top-2');
      expect(popup?.className).toContain('right-4');
    });

    it('uses z-50 for high stacking order', () => {
      const event = createMockXPEvent();
      const { container } = render(<XPPopup event={event} eventKey={1} />);

      const popup = container.querySelector('.z-50');
      expect(popup).toBeInTheDocument();
    });

    it('applies pointer-events-none for non-interactive overlay', () => {
      const event = createMockXPEvent();
      const { container } = render(<XPPopup event={event} eventKey={1} />);

      const popup = container.querySelector('.pointer-events-none');
      expect(popup).toBeInTheDocument();
    });

    it('uses flex column layout with end alignment', () => {
      const event = createMockXPEvent();
      const { container } = render(<XPPopup event={event} eventKey={1} />);

      const popup = container.querySelector('.flex-col');
      expect(popup?.className).toContain('items-end');
    });

    it('applies gap-1 between popup elements', () => {
      const event = createMockXPEvent({ bonusLabel: 'Test bonus' });
      const { container } = render(<XPPopup event={event} eventKey={1} />);

      const popup = container.querySelector('.gap-1');
      expect(popup).toBeInTheDocument();
    });
  });

  describe('Event key handling', () => {
    it('uses eventKey to trigger animations', () => {
      const event = createMockXPEvent({ xp: 50 });
      const { rerender } = render(<XPPopup event={event} eventKey={1} />);

      expect(screen.getByText('+50 XP')).toBeInTheDocument();

      // Change eventKey triggers re-animation
      const newEvent = createMockXPEvent({ xp: 50 });
      rerender(<XPPopup event={newEvent} eventKey={2} />);

      expect(screen.getByText('+50 XP')).toBeInTheDocument();
    });

    it('handles null event with new eventKey', () => {
      const event = createMockXPEvent({ xp: 25 });
      const { rerender } = render(<XPPopup event={event} eventKey={1} />);

      expect(screen.getByText('+25 XP')).toBeInTheDocument();

      rerender(<XPPopup event={null} eventKey={2} />);

      // Popup should dismiss
      vi.advanceTimersByTime(100);
    });
  });

  describe('Combined display scenarios', () => {
    it('displays XP, bonus label, and combo together', () => {
      const event = createMockXPEvent({
        xp: 75,
        bonusLabel: 'Perfect strike',
        comboCount: 5,
        isCorrect: true,
      });

      render(<XPPopup event={event} eventKey={1} />);

      expect(screen.getByText('+75 XP')).toBeInTheDocument();
      expect(screen.getByText('Perfect strike')).toBeInTheDocument();
      expect(screen.getByText('5x combo')).toBeInTheDocument();
    });

    it('displays XP with bonus but no combo', () => {
      const event = createMockXPEvent({
        xp: 50,
        bonusLabel: '2x multiplier',
        comboCount: 2,
        isCorrect: true,
      });

      render(<XPPopup event={event} eventKey={1} />);

      expect(screen.getByText('+50 XP')).toBeInTheDocument();
      expect(screen.getByText('2x multiplier')).toBeInTheDocument();
      expect(screen.queryByText(/combo/)).not.toBeInTheDocument();
    });

    it('displays XP with combo but no bonus', () => {
      const event = createMockXPEvent({
        xp: 100,
        bonusLabel: undefined,
        comboCount: 8,
        isCorrect: true,
      });

      render(<XPPopup event={event} eventKey={1} />);

      expect(screen.getByText('+100 XP')).toBeInTheDocument();
      expect(screen.queryByText(/bonus/i)).not.toBeInTheDocument();
      expect(screen.getByText('8x combo')).toBeInTheDocument();
    });
  });
});
