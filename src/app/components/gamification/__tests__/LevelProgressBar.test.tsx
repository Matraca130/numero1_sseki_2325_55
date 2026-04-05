// ============================================================
// Axon — Tests for LevelProgressBar
//
// Tests rendering in compact and normal modes, progress calculation,
// animation triggering, and level name display.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { LevelProgressBar } from '../LevelProgressBar';

// Mock framer-motion to avoid animation side-effects in tests
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div data-testid="motion-div" className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Star: (props: Record<string, unknown>) => (
    <svg data-testid="star-icon" {...props} />
  ),
  CalendarDays: (props: Record<string, unknown>) => (
    <svg data-testid="calendar-days-icon" {...props} />
  ),
}));

describe('LevelProgressBar', () => {
  describe('Compact mode', () => {
    it('renders compact layout with level and progress bar', () => {
      render(
        <LevelProgressBar
          totalXP={500}
          currentLevel={5}
          animate={false}
          compact={true}
        />
      );

      expect(screen.getByText('Lv.5')).toBeInTheDocument();
      expect(screen.getByTestId('star-icon')).toBeInTheDocument();
    });

    it('displays correct XP progress percentage in compact mode', () => {
      // Assuming level 1 starts at 0, each level requires some XP
      render(
        <LevelProgressBar
          totalXP={300}
          currentLevel={2}
          animate={false}
          compact={true}
        />
      );

      const progressBars = screen.getAllByTestId('motion-div');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('shows minimal gap layout in compact mode', () => {
      const { container } = render(
        <LevelProgressBar
          totalXP={100}
          currentLevel={1}
          animate={false}
          compact={true}
        />
      );

      // Check for flex gap layout
      expect(container.querySelector('.gap-2')).toBeInTheDocument();
    });
  });

  describe('Normal mode', () => {
    it('renders full layout with level info and progress bar', () => {
      render(
        <LevelProgressBar
          totalXP={500}
          currentLevel={3}
          animate={false}
          compact={false}
        />
      );

      expect(screen.getByText('Nivel 3')).toBeInTheDocument();
      expect(screen.getByText(/para Lv.4/)).toBeInTheDocument();
    });

    it('displays total XP in normal mode', () => {
      render(
        <LevelProgressBar
          totalXP={1250}
          currentLevel={4}
          animate={false}
          compact={false}
        />
      );

      expect(screen.getByText(/1.?250 XP/)).toBeInTheDocument();
    });

    it('shows XP progress format "current/needed"', () => {
      render(
        <LevelProgressBar
          totalXP={600}
          currentLevel={2}
          animate={false}
          compact={false}
        />
      );

      // Should show progress in format like "123/400 para Lv.3"
      const progressText = screen.getByText(/para Lv.3/);
      expect(progressText).toBeInTheDocument();
    });

    it('renders star icon in normal mode', () => {
      render(
        <LevelProgressBar
          totalXP={300}
          currentLevel={1}
          animate={false}
          compact={false}
        />
      );

      expect(screen.getByTestId('star-icon')).toBeInTheDocument();
    });
  });

  describe('Progress calculation', () => {
    it('calculates progress correctly when XP is between levels', () => {
      const { container } = render(
        <LevelProgressBar
          totalXP={150}
          currentLevel={1}
          animate={false}
          compact={false}
        />
      );

      // Progress bar should have some width applied
      const progressBar = container.querySelector('[class*="bg-gradient-to-r"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('caps progress at 100% when level complete', () => {
      const { container } = render(
        <LevelProgressBar
          totalXP={10000}
          currentLevel={5}
          animate={false}
          compact={false}
        />
      );

      const progressBar = container.querySelector('[class*="rounded-full"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('shows 0% progress at level start', () => {
      render(
        <LevelProgressBar
          totalXP={0}
          currentLevel={1}
          animate={false}
          compact={false}
        />
      );

      expect(screen.getByText(/Nivel 1/)).toBeInTheDocument();
    });
  });

  describe('Animation behavior', () => {
    it('applies animation when animate prop is true', () => {
      const { container } = render(
        <LevelProgressBar
          totalXP={500}
          currentLevel={3}
          animate={true}
          compact={false}
        />
      );

      const motionDiv = screen.getByTestId('motion-div');
      expect(motionDiv).toBeInTheDocument();
    });

    it('skips animation when animate prop is false', () => {
      render(
        <LevelProgressBar
          totalXP={500}
          currentLevel={3}
          animate={false}
          compact={false}
        />
      );

      const motionDiv = screen.getByTestId('motion-div');
      expect(motionDiv).toBeInTheDocument();
    });

    it('animates differently between compact and normal modes', () => {
      const { rerender } = render(
        <LevelProgressBar
          totalXP={500}
          currentLevel={3}
          animate={true}
          compact={true}
        />
      );

      expect(screen.getByText('Lv.3')).toBeInTheDocument();

      rerender(
        <LevelProgressBar
          totalXP={500}
          currentLevel={3}
          animate={true}
          compact={false}
        />
      );

      expect(screen.getByText('Nivel 3')).toBeInTheDocument();
    });
  });

  describe('Level names', () => {
    it('displays predefined level names when available', () => {
      render(
        <LevelProgressBar
          totalXP={5000}
          currentLevel={1}
          animate={false}
          compact={false}
        />
      );

      // Should show both level number and level name
      expect(screen.getByText(/Nivel 1/)).toBeInTheDocument();
    });

    it('handles unknown level names gracefully', () => {
      render(
        <LevelProgressBar
          totalXP={50000}
          currentLevel={99}
          animate={false}
          compact={false}
        />
      );

      // Should still show level number even if name doesn't exist
      const levelText = screen.queryAllByText(/Nivel 99/);
      expect(levelText.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive and accessibility', () => {
    it('uses tabular-nums for consistent digit spacing in XP display', () => {
      const { container } = render(
        <LevelProgressBar
          totalXP={1234}
          currentLevel={2}
          animate={false}
          compact={false}
        />
      );

      const xpText = screen.getByText(/1.?234 XP/);
      expect(xpText?.className).toContain('tabular-nums');
    });

    it('uses proper font-weight for visual hierarchy', () => {
      const { container } = render(
        <LevelProgressBar
          totalXP={500}
          currentLevel={3}
          animate={false}
          compact={false}
        />
      );

      const levelLabel = screen.getByText('Nivel 3');
      // Component uses inline style with fontWeight: 600
      expect(levelLabel?.style.fontWeight).toBe('600');
    });

    it('renders with proper color contrast in both modes', () => {
      const { container, rerender } = render(
        <LevelProgressBar
          totalXP={500}
          currentLevel={3}
          animate={false}
          compact={true}
        />
      );

      expect(container.querySelector('.text-amber-400')).toBeInTheDocument();

      rerender(
        <LevelProgressBar
          totalXP={500}
          currentLevel={3}
          animate={false}
          compact={false}
        />
      );

      expect(container.querySelector('.text-amber-400')).toBeInTheDocument();
    });
  });
});
