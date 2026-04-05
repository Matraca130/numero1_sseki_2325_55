// ============================================================
// Tests — HighlightToolbar (floating color picker on selection)
// ============================================================
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HighlightToolbar, HIGHLIGHT_COLORS } from '../HighlightToolbar';

// ── Helpers ──────────────────────────────────────────────────

function renderToolbar(overrides: Partial<React.ComponentProps<typeof HighlightToolbar>> = {}) {
  const props = {
    top: 100,
    left: 200,
    onSelectColor: vi.fn(),
    onAnnotate: vi.fn(),
    ...overrides,
  };
  const result = render(<HighlightToolbar {...props} />);
  return { ...result, props };
}

// ── Tests ────────────────────────────────────────────────────

describe('HighlightToolbar', () => {
  it('renders all 5 color buttons', () => {
    renderToolbar();
    const buttons = screen.getAllByRole('button');
    // 5 colors + 1 "Anotar" button = 6
    expect(buttons).toHaveLength(6);
  });

  it('has correct aria-labels for each color', () => {
    renderToolbar();
    expect(screen.getByLabelText('Subrayar amarillo')).toBeInTheDocument();
    expect(screen.getByLabelText('Subrayar verde')).toBeInTheDocument();
    expect(screen.getByLabelText('Subrayar azul')).toBeInTheDocument();
    expect(screen.getByLabelText('Subrayar rosa')).toBeInTheDocument();
    expect(screen.getByLabelText('Subrayar naranja')).toBeInTheDocument();
  });

  it.each([
    ['yellow', 'Subrayar amarillo'],
    ['green', 'Subrayar verde'],
    ['blue', 'Subrayar azul'],
    ['pink', 'Subrayar rosa'],
    ['orange', 'Subrayar naranja'],
  ] as const)('clicking %s button calls onSelectColor with "%s"', (colorKey, ariaLabel) => {
    const { props } = renderToolbar();
    fireEvent.click(screen.getByLabelText(ariaLabel));
    expect(props.onSelectColor).toHaveBeenCalledTimes(1);
    expect(props.onSelectColor).toHaveBeenCalledWith(colorKey);
  });

  it('clicking "Anotar" button calls onAnnotate', () => {
    const { props } = renderToolbar();
    fireEvent.click(screen.getByLabelText('Subrayar y agregar nota'));
    expect(props.onAnnotate).toHaveBeenCalledTimes(1);
  });

  it('renders the "Anotar" text label', () => {
    renderToolbar();
    expect(screen.getByText('Anotar')).toBeInTheDocument();
  });

  it('has role="toolbar" with correct aria attributes', () => {
    renderToolbar();
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveAttribute('aria-label', 'Opciones de resaltado');
    expect(toolbar).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('positions at the given top/left coordinates', () => {
    renderToolbar({ top: 50, left: 120 });
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar.style.top).toBe('50px');
    expect(toolbar.style.left).toBe('120px');
    expect(toolbar.style.position).toBe('absolute');
  });

  it('HIGHLIGHT_COLORS has exactly 5 entries', () => {
    expect(HIGHLIGHT_COLORS).toHaveLength(5);
    const keys = HIGHLIGHT_COLORS.map(c => c.key);
    expect(keys).toEqual(['yellow', 'green', 'blue', 'pink', 'orange']);
  });

  it('does not call onSelectColor when onAnnotate is clicked', () => {
    const { props } = renderToolbar();
    fireEvent.click(screen.getByLabelText('Subrayar y agregar nota'));
    expect(props.onSelectColor).not.toHaveBeenCalled();
  });

  it('does not call onAnnotate when a color is clicked', () => {
    const { props } = renderToolbar();
    fireEvent.click(screen.getByLabelText('Subrayar amarillo'));
    expect(props.onAnnotate).not.toHaveBeenCalled();
  });
});
