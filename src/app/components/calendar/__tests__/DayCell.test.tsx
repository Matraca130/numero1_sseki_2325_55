// ============================================================
// DayCell — Component Tests
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { DayCell } from '../DayCell';
import type { DayCellProps } from '../DayCell';
import type { CalendarEvent } from '@/app/hooks/useCalendarEvents';
import { HEATMAP_CLASSES } from '@/app/lib/calendar-constants';
import type { HeatmapLevel } from '@/app/lib/calendar-constants';

// ── Helpers ─────────────────────────────────────────────────

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt-1',
    student_id: 'stu-1',
    course_id: 'crs-1',
    institution_id: 'inst-1',
    title: 'Parcial Algebra',
    date: '2026-03-15',
    time: null,
    location: null,
    is_final: false,
    exam_type: 'exam',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function defaultProps(overrides: Partial<DayCellProps> = {}): DayCellProps {
  return {
    date: new Date(2026, 2, 15), // March 15, 2026
    events: [],
    heatmapLevel: 0 as HeatmapLevel,
    isStreakDay: false,
    isSelected: false,
    onSelect: vi.fn(),
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────

describe('DayCell', () => {
  it('renders without crash', () => {
    render(<DayCell {...defaultProps()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('displays the day number', () => {
    render(<DayCell {...defaultProps()} />);
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('aria-label contains Spanish date format', () => {
    render(<DayCell {...defaultProps()} />);
    const button = screen.getByRole('button');
    const label = button.getAttribute('aria-label')!;
    // Should contain Spanish month name and "sin eventos" for empty events
    expect(label.toLowerCase()).toContain('marzo');
    expect(label).toContain('sin eventos');
  });

  it('aria-label shows event count when events present', () => {
    const props = defaultProps({
      events: [makeEvent(), makeEvent({ id: 'evt-2' })],
    });
    render(<DayCell {...props} />);
    const label = screen.getByRole('button').getAttribute('aria-label')!;
    expect(label).toContain('2 eventos');
  });

  it.each([0, 1, 2, 3, 4] as HeatmapLevel[])(
    'heatmap overlay renders with correct class for level %i',
    (level) => {
      const { container } = render(
        <DayCell {...defaultProps({ heatmapLevel: level })} />,
      );
      const overlay = container.querySelector('[aria-hidden="true"]');
      expect(overlay).toBeInTheDocument();
      expect(overlay!.className).toContain(HEATMAP_CLASSES[level]);
    },
  );

  it('streak dot renders when isStreakDay=true', () => {
    const { container } = render(
      <DayCell {...defaultProps({ isStreakDay: true })} />,
    );
    const dot = container.querySelector('.bg-green-500');
    expect(dot).toBeInTheDocument();
  });

  it('streak dot is hidden when isStreakDay=false', () => {
    const { container } = render(
      <DayCell {...defaultProps({ isStreakDay: false })} />,
    );
    const dot = container.querySelector('.bg-green-500');
    expect(dot).not.toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    const date = new Date(2026, 2, 15);
    render(<DayCell {...defaultProps({ date, onSelect })} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(date);
  });

  it('sets aria-selected when isSelected is true', () => {
    render(<DayCell {...defaultProps({ isSelected: true })} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-selected', 'true');
  });

  it('renders children inside the cell', () => {
    render(
      <DayCell {...defaultProps()}>
        <span data-testid="child">Badge</span>
      </DayCell>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
