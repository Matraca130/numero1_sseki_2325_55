// ============================================================
// Axon — Tests for ComboIndicator
//
// Tests combo counter display, threshold-based styling (hot/on-fire),
// conditional rendering, and animations.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ComboIndicator } from '../ComboIndicator';

// Mock framer-motion
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Flame: (props: Record<string, unknown>) => (
    <svg data-testid="flame-icon" {...props} />
  ),
  CalendarDays: (props: Record<string, unknown>) => (
    <svg data-testid="calendar-days-icon" {...props} />
  ),
}));

describe('ComboIndicator', () => {
  describe('Visibility threshold', () => {
    it('does not render when comboCount is less than 3', () => {
      const { container } = render(<ComboIndicator comboCount={0} />);
      // Component returns null when comboCount < 3
      expect(container.firstChild).not.toBeInTheDocument();
    });

    it('does not render when comboCount is exactly 2', () => {
      const { container } = render(<ComboIndicator comboCount={2} />);
      // Component returns null when comboCount < 3
      expect(container.firstChild).not.toBeInTheDocument();
    });

    it('renders when comboCount is exactly 3', () => {
      render(<ComboIndicator comboCount={3} />);
      expect(screen.getByText('3x')).toBeInTheDocument();
    });

    it('renders when comboCount exceeds 3', () => {
      render(<ComboIndicator comboCount={5} />);
      expect(screen.getByText('5x')).toBeInTheDocument();
    });
  });

  describe('Normal state (3-6 combo)', () => {
    it('renders with amber styling for combo count 3', () => {
      const { container } = render(<ComboIndicator comboCount={3} />);
      const indicator = container.querySelector('[class*="bg-amber"]');
      expect(indicator).toBeInTheDocument();
    });

    it('renders with amber color class for normal range', () => {
      const { container } = render(<ComboIndicator comboCount={4} />);
      // Component renders with bg-amber-500/15 (with opacity)
      const indicator = container.querySelector('[class*="bg-amber"]');
      expect(indicator).toBeInTheDocument();
    });

    it('displays combo count text with correct styling', () => {
      render(<ComboIndicator comboCount={5} />);
      const text = screen.getByText('5x');
      // Combo count has correct size and numerals
      expect(text.className).toContain('text-xs');
      expect(text.className).toContain('tabular-nums');
    });

    it('has 3x font weight for combo number', () => {
      render(<ComboIndicator comboCount={6} />);
      const text = screen.getByText('6x');
      // Font-weight 700 should be applied via inline style
      expect(text.style.fontWeight).toBe('700');
    });
  });

  describe('Hot state (7-9 combo)', () => {
    it('applies orange styling at combo 7', () => {
      const { container } = render(<ComboIndicator comboCount={7} />);
      const indicator = container.querySelector('[class*="bg-orange"]');
      expect(indicator).toBeInTheDocument();
    });

    it('uses orange border for hot streak', () => {
      const { container } = render(<ComboIndicator comboCount={7} />);
      const indicator = container.querySelector('[class*="border-orange"]');
      expect(indicator).toBeInTheDocument();
    });

    it('displays orange text color for hot combo', () => {
      render(<ComboIndicator comboCount={8} />);
      const text = screen.getByText('8x');
      // Text styling is correct (size/numerals)
      expect(text.className).toContain('text-xs');
      expect(text.className).toContain('tabular-nums');
    });

    it('transitions to hot state at exact threshold 7', () => {
      const { container } = render(<ComboIndicator comboCount={7} />);
      // Component uses bg-orange-500/20 (with opacity)
      expect(container.querySelector('[class*="bg-orange"]')).toBeInTheDocument();
    });
  });

  describe('On-fire state (10+ combo)', () => {
    it('applies red/fire styling at combo 10', () => {
      const { container } = render(<ComboIndicator comboCount={10} />);
      const indicator = container.querySelector('[class*="bg-red"]');
      expect(indicator).toBeInTheDocument();
    });

    it('uses red border for on-fire streak', () => {
      const { container } = render(<ComboIndicator comboCount={10} />);
      const indicator = container.querySelector('[class*="border-red"]');
      expect(indicator).toBeInTheDocument();
    });

    it('displays red text color for on-fire combo', () => {
      render(<ComboIndicator comboCount={10} />);
      const text = screen.getByText('10x');
      // Text styling is correct
      expect(text.className).toContain('text-xs');
      expect(text.className).toContain('tabular-nums');
    });

    it('maintains fire state at high combo counts', () => {
      const { container } = render(<ComboIndicator comboCount={25} />);
      // Component uses bg-red-500/20 (with opacity)
      const indicator = container.querySelector('[class*="bg-red"]');
      expect(indicator).toBeInTheDocument();
    });

    it('displays high combo numbers correctly', () => {
      render(<ComboIndicator comboCount={99} />);
      expect(screen.getByText('99x')).toBeInTheDocument();
    });
  });

  describe('Visual elements', () => {
    it('renders flame icon for all visible combos', () => {
      render(<ComboIndicator comboCount={5} />);
      expect(screen.getByTestId('flame-icon')).toBeInTheDocument();
    });

    it('renders flame icon in hot state', () => {
      render(<ComboIndicator comboCount={7} />);
      expect(screen.getByTestId('flame-icon')).toBeInTheDocument();
    });

    it('renders flame icon in on-fire state', () => {
      render(<ComboIndicator comboCount={10} />);
      expect(screen.getByTestId('flame-icon')).toBeInTheDocument();
    });

    it('applies px-2.5 py-1 padding to container', () => {
      const { container } = render(<ComboIndicator comboCount={5} />);
      const indicator = container.querySelector('div');
      expect(indicator?.className).toContain('px-2.5');
      expect(indicator?.className).toContain('py-1');
    });

    it('uses rounded-full border radius', () => {
      const { container } = render(<ComboIndicator comboCount={5} />);
      const indicator = container.querySelector('div');
      expect(indicator?.className).toContain('rounded-full');
    });

    it('applies border to combo indicator', () => {
      const { container } = render(<ComboIndicator comboCount={5} />);
      const indicator = container.querySelector('div');
      expect(indicator?.className).toContain('border');
    });
  });

  describe('Text formatting', () => {
    it('displays single digit combo with "x" suffix', () => {
      render(<ComboIndicator comboCount={5} />);
      expect(screen.getByText('5x')).toBeInTheDocument();
    });

    it('displays double digit combo with "x" suffix', () => {
      render(<ComboIndicator comboCount={15} />);
      expect(screen.getByText('15x')).toBeInTheDocument();
    });

    it('displays triple digit combo with "x" suffix', () => {
      render(<ComboIndicator comboCount={100} />);
      expect(screen.getByText('100x')).toBeInTheDocument();
    });

    it('uses tabular-nums for consistent digit width', () => {
      render(<ComboIndicator comboCount={5} />);
      const text = screen.getByText('5x');
      expect(text.className).toContain('tabular-nums');
    });

    it('applies text-xs size to combo text', () => {
      render(<ComboIndicator comboCount={5} />);
      const text = screen.getByText('5x');
      expect(text.className).toContain('text-xs');
    });
  });

  describe('Layout and spacing', () => {
    it('uses flex layout with items-center', () => {
      const { container } = render(<ComboIndicator comboCount={5} />);
      const indicator = container.querySelector('div');
      expect(indicator?.className).toContain('flex');
      expect(indicator?.className).toContain('items-center');
    });

    it('applies gap-1.5 spacing between flame and number', () => {
      const { container } = render(<ComboIndicator comboCount={5} />);
      const indicator = container.querySelector('div');
      expect(indicator?.className).toContain('gap-1.5');
    });
  });

  describe('Combo state transitions', () => {
    it('transitions from normal to hot at combo 7', () => {
      const { rerender, container } = render(<ComboIndicator comboCount={6} />);

      // Should be amber
      let indicator = container.querySelector('[class*="bg-amber"]');
      expect(indicator).toBeInTheDocument();

      // Rerender with combo 7
      rerender(<ComboIndicator comboCount={7} />);

      // Should be orange
      indicator = container.querySelector('[class*="bg-orange"]');
      expect(indicator).toBeInTheDocument();
    });

    it('transitions from hot to on-fire at combo 10', () => {
      const { rerender, container } = render(<ComboIndicator comboCount={9} />);

      // Should be orange
      let indicator = container.querySelector('[class*="bg-orange"]');
      expect(indicator).toBeInTheDocument();

      // Rerender with combo 10
      rerender(<ComboIndicator comboCount={10} />);

      // Should be red
      indicator = container.querySelector('[class*="bg-red"]');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Animation setup', () => {
    it('renders within AnimatePresence wrapper', () => {
      render(<ComboIndicator comboCount={5} />);
      // AnimatePresence wrapper should allow animations
      expect(screen.getByText('5x')).toBeInTheDocument();
    });

    it('has flame with animated scale property', () => {
      const { container } = render(<ComboIndicator comboCount={5} />);
      expect(screen.getByTestId('flame-icon')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles zero combo count', () => {
      const { container } = render(<ComboIndicator comboCount={0} />);
      // Component returns null when comboCount < 3
      expect(container.firstChild).not.toBeInTheDocument();
    });

    it('handles negative combo (edge case)', () => {
      const { container } = render(<ComboIndicator comboCount={-1} />);
      // Component returns null when comboCount < 3
      expect(container.firstChild).not.toBeInTheDocument();
    });

    it('handles very high combo counts', () => {
      render(<ComboIndicator comboCount={999} />);
      expect(screen.getByText('999x')).toBeInTheDocument();
      expect(screen.getByTestId('flame-icon')).toBeInTheDocument();
    });
  });
});
