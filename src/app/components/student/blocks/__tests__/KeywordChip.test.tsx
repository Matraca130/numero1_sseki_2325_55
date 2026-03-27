import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import KeywordChip from '../KeywordChip';
import type { SummaryKeyword } from '@/app/services/summariesApi';

function makeKeyword(overrides: Partial<SummaryKeyword> = {}): SummaryKeyword {
  return {
    id: 'kw-1',
    summary_id: 'sum-1',
    name: 'Aterosclerosis',
    definition: 'Enfermedad inflamatoria crónica de las arterias.',
    priority: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('KeywordChip', () => {
  it('renders chip with keyword text', () => {
    render(<KeywordChip keyword={makeKeyword()} />);
    expect(screen.getByText('Aterosclerosis')).toBeInTheDocument();
  });

  it('renders with role="button" and is focusable', () => {
    render(<KeywordChip keyword={makeKeyword()} />);
    const chip = screen.getByRole('button');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveAttribute('tabindex', '0');
  });

  it('shows popover with definition on focus', () => {
    const kw = makeKeyword();
    render(<KeywordChip keyword={kw} />);

    // No tooltip initially
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // Focus triggers popover
    fireEvent.focus(screen.getByRole('button'));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent(kw.definition!);
    expect(tooltip).toHaveTextContent(kw.name);
  });

  it('hides popover on blur', () => {
    render(<KeywordChip keyword={makeKeyword()} />);
    const chip = screen.getByRole('button');

    fireEvent.focus(chip);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.blur(chip);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows popover on mouseEnter after delay', () => {
    vi.useFakeTimers();
    render(<KeywordChip keyword={makeKeyword()} />);
    const chip = screen.getByRole('button');

    fireEvent.mouseEnter(chip);
    // Not shown immediately
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // Advance past the 150ms delay
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('hides popover on mouseLeave and clears timer', () => {
    vi.useFakeTimers();
    render(<KeywordChip keyword={makeKeyword()} />);
    const chip = screen.getByRole('button');

    fireEvent.mouseEnter(chip);
    // Leave before delay fires
    fireEvent.mouseLeave(chip);
    act(() => { vi.advanceTimersByTime(200); });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('handles missing definition gracefully — no popover shown', () => {
    const kw = makeKeyword({ definition: null });
    render(<KeywordChip keyword={kw} />);

    // Even on focus, no tooltip because definition is null
    fireEvent.focus(screen.getByRole('button'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    // Keyword name still renders as chip text
    expect(screen.getByText('Aterosclerosis')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(<KeywordChip keyword={makeKeyword()} />);
    const chip = screen.getByRole('button');
    // The chip uses inline bg/border colors for light mode
    expect(chip.className).toContain('bg-[#e8f5f1]');
    expect(chip.className).toContain('text-[#1B3B36]');
    expect(chip.className).toContain('border-[#d1f0e7]');
    expect(chip.className).toContain('rounded-full');
  });

  it('calls onClick with keyword id when clicked', () => {
    const handleClick = vi.fn();
    const kw = makeKeyword({ id: 'kw-42' });
    render(<KeywordChip keyword={kw} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledWith('kw-42');
  });

  it('calls onClick on Enter key press', () => {
    const handleClick = vi.fn();
    const kw = makeKeyword({ id: 'kw-99' });
    render(<KeywordChip keyword={kw} onClick={handleClick} />);

    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledWith('kw-99');
  });
});
