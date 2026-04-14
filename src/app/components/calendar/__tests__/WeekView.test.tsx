// ============================================================
// WeekView — Component Tests
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { WeekView } from '../WeekView';
import type { WeekViewProps } from '../WeekView';
import type { CalendarEvent } from '@/app/types/calendar';

// ── Helpers ─────────────────────────────────────────────────

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt-1',
    student_id: 'stu-1',
    course_id: 'crs-1',
    institution_id: 'inst-1',
    title: 'Parcial Algebra',
    date: '2026-03-16', // Monday
    time: '10:00:00',
    location: null,
    is_final: false,
    exam_type: 'exam',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function defaultProps(overrides: Partial<WeekViewProps> = {}): WeekViewProps {
  return {
    events: [],
    selectedDate: new Date(2026, 2, 18), // Wednesday March 18, 2026
    onDaySelect: vi.fn(),
    onEventClick: vi.fn(),
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────

describe('WeekView', () => {
  it('renders without crash', () => {
    render(<WeekView {...defaultProps()} />);
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('renders 7 day columns', () => {
    render(<WeekView {...defaultProps()} />);
    const gridcells = screen.getAllByRole('gridcell');
    expect(gridcells).toHaveLength(7);
  });

  it('has aria-label on the grid', () => {
    render(<WeekView {...defaultProps()} />);
    expect(screen.getByLabelText('Vista semanal del calendario')).toBeInTheDocument();
  });

  it('event buttons are clickable (button elements)', () => {
    // March 16, 2026 is a Monday — week starts on Monday
    const selectedDate = new Date(2026, 2, 16);
    const events = [makeEvent({ date: '2026-03-16', title: 'Parcial Fisica' })];
    render(<WeekView {...defaultProps({ selectedDate, events })} />);
    // The event inside the day column should be a button
    const eventButton = screen.getByLabelText('Parcial Fisica');
    expect(eventButton.tagName).toBe('BUTTON');
  });

  it('calls onEventClick when event is clicked', () => {
    const onEventClick = vi.fn();
    const selectedDate = new Date(2026, 2, 16);
    const events = [makeEvent({ id: 'evt-click', date: '2026-03-16', title: 'Parcial Fisica' })];
    render(
      <WeekView {...defaultProps({ selectedDate, events, onEventClick })} />,
    );
    fireEvent.click(screen.getByLabelText('Parcial Fisica'));
    expect(onEventClick).toHaveBeenCalledWith('evt-click');
  });

  it('calls onDaySelect when a day column is clicked', () => {
    const onDaySelect = vi.fn();
    render(<WeekView {...defaultProps({ onDaySelect })} />);
    const gridcells = screen.getAllByRole('gridcell');
    fireEvent.click(gridcells[0]);
    expect(onDaySelect).toHaveBeenCalledTimes(1);
  });

  it('marks selected date with aria-selected', () => {
    const selectedDate = new Date(2026, 2, 18);
    render(<WeekView {...defaultProps({ selectedDate })} />);
    const gridcells = screen.getAllByRole('gridcell');
    const selectedCell = gridcells.find(
      (cell) => cell.getAttribute('aria-selected') === 'true',
    );
    expect(selectedCell).toBeTruthy();
  });

  it('shows event time when available', () => {
    const selectedDate = new Date(2026, 2, 16);
    const events = [makeEvent({ date: '2026-03-16', time: '14:30:00', title: 'Oral Quimica' })];
    render(<WeekView {...defaultProps({ selectedDate, events })} />);
    expect(screen.getByText('14:30')).toBeInTheDocument();
  });
});
