// ============================================================
// CountdownWidget — Component Tests
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { CountdownWidget } from '../CountdownWidget';
import type { CalendarEvent } from '@/app/hooks/useCalendarEvents';

// ── Helpers ─────────────────────────────────────────────────

/** Create a future date N days from now as ISO string */
function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt-1',
    student_id: 'stu-1',
    course_id: 'crs-1',
    institution_id: 'inst-1',
    title: 'Parcial Algebra',
    date: futureDate(10),
    time: null,
    location: null,
    is_final: false,
    exam_type: 'exam',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────

describe('CountdownWidget', () => {
  it('shows empty state with 0 events', () => {
    render(<CountdownWidget events={[]} />);
    expect(screen.getByText('No hay examenes programados.')).toBeInTheDocument();
  });

  it('shows empty state when all events are in the past', () => {
    const pastEvent = makeEvent({ date: '2020-01-01' });
    render(<CountdownWidget events={[pastEvent]} />);
    expect(screen.getByText('No hay examenes programados.')).toBeInTheDocument();
  });

  it('shows max 5 events by default', () => {
    const events = Array.from({ length: 8 }, (_, i) =>
      makeEvent({ id: `evt-${i}`, date: futureDate(i + 1), title: `Exam ${i}` }),
    );
    render(<CountdownWidget events={events} />);
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(5);
  });

  it('shows "Ver todos" button when more than 5 events', () => {
    const events = Array.from({ length: 8 }, (_, i) =>
      makeEvent({ id: `evt-${i}`, date: futureDate(i + 1), title: `Exam ${i}` }),
    );
    render(<CountdownWidget events={events} />);
    expect(screen.getByText(/Ver todos/)).toBeInTheDocument();
  });

  it('expands to show all events when "Ver todos" is clicked', () => {
    const events = Array.from({ length: 8 }, (_, i) =>
      makeEvent({ id: `evt-${i}`, date: futureDate(i + 1), title: `Exam ${i}` }),
    );
    render(<CountdownWidget events={events} />);
    fireEvent.click(screen.getByText(/Ver todos/));
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(8);
  });

  it('events are sorted by date ASC', () => {
    const events = [
      makeEvent({ id: 'evt-far', date: futureDate(30), title: 'Far Exam' }),
      makeEvent({ id: 'evt-near', date: futureDate(2), title: 'Near Exam' }),
      makeEvent({ id: 'evt-mid', date: futureDate(15), title: 'Mid Exam' }),
    ];
    render(<CountdownWidget events={events} />);
    const buttons = screen.getAllByRole('listitem');
    // First item should be Near Exam (closest date)
    expect(buttons[0]).toHaveTextContent('Near Exam');
    expect(buttons[1]).toHaveTextContent('Mid Exam');
    expect(buttons[2]).toHaveTextContent('Far Exam');
  });

  it('days badge shows green for events >14 days away', () => {
    const events = [makeEvent({ date: futureDate(20), title: 'Lejano' })];
    render(<CountdownWidget events={events} />);
    // The badge should have green classes
    const badge = screen.getByText('20d');
    expect(badge.className).toContain('bg-green-100');
  });

  it('days badge shows red for events <7 days away', () => {
    const events = [makeEvent({ date: futureDate(3), title: 'Urgente' })];
    render(<CountdownWidget events={events} />);
    const badge = screen.getByText('3d');
    expect(badge.className).toContain('bg-red-100');
  });

  it('calls onEventClick when an event is clicked', () => {
    const onEventClick = vi.fn();
    const events = [makeEvent({ id: 'evt-click', date: futureDate(5) })];
    render(<CountdownWidget events={events} onEventClick={onEventClick} />);
    const buttons = screen.getAllByRole('button');
    // Click the first event button (not "Ver todos")
    fireEvent.click(buttons[0]);
    expect(onEventClick).toHaveBeenCalledWith('evt-click');
  });
});
