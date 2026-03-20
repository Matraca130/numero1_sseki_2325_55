// ============================================================
// ChartErrorBoundary — Test Suite
//
// Verifies error-catching behavior, fallback rendering,
// and height-prop handling for the chart-specific wrapper
// around the generic ErrorBoundary.
// ============================================================
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach, type MockInstance } from 'vitest';
import { ChartErrorBoundary } from '../ChartErrorBoundary';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Component that throws on every render. */
function ThrowError({ message = 'test crash' }: { message?: string }) {
  throw new Error(message);
}

/** Innocent child for the happy path. */
function GoodChild() {
  return <div data-testid="good-child">Chart content</div>;
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  // Suppress React's own error-boundary console noise + our ErrorBoundary logs.
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChartErrorBoundary', () => {
  // 1. Happy path --------------------------------------------------------
  it('renders children when no error occurs', () => {
    render(
      <ChartErrorBoundary>
        <GoodChild />
      </ChartErrorBoundary>,
    );

    expect(screen.getByTestId('good-child')).toBeInTheDocument();
    expect(screen.getByText('Chart content')).toBeInTheDocument();
    // Fallback text must NOT be present
    expect(screen.queryByText('Grafico no disponible')).not.toBeInTheDocument();
  });

  // 2. Shows fallback when child throws ----------------------------------
  it('shows fallback UI when a child throws', () => {
    render(
      <ChartErrorBoundary>
        <ThrowError />
      </ChartErrorBoundary>,
    );

    // Fallback text is visible
    expect(screen.getByText('Grafico no disponible')).toBeInTheDocument();
    // The throwing child is gone
    expect(screen.queryByTestId('good-child')).not.toBeInTheDocument();
  });

  // 3. Height prop — number ----------------------------------------------
  it('applies numeric height as pixels on fallback', () => {
    const { container } = render(
      <ChartErrorBoundary height={200}>
        <ThrowError />
      </ChartErrorBoundary>,
    );

    const fallbackDiv = container.firstElementChild as HTMLElement;
    expect(fallbackDiv.style.height).toBe('200px');
  });

  // 4. Height prop — string ----------------------------------------------
  it('applies string height directly on fallback', () => {
    const { container } = render(
      <ChartErrorBoundary height="100%">
        <ThrowError />
      </ChartErrorBoundary>,
    );

    const fallbackDiv = container.firstElementChild as HTMLElement;
    expect(fallbackDiv.style.height).toBe('100%');
  });

  // 5. Default height (140px) --------------------------------------------
  it('uses 140px as default fallback height', () => {
    const { container } = render(
      <ChartErrorBoundary>
        <ThrowError />
      </ChartErrorBoundary>,
    );

    const fallbackDiv = container.firstElementChild as HTMLElement;
    expect(fallbackDiv.style.height).toBe('140px');
  });

  // 6. console.error is called -------------------------------------------
  it('calls console.error when a child throws', () => {
    render(
      <ChartErrorBoundary>
        <ThrowError message="kaboom" />
      </ChartErrorBoundary>,
    );

    // ErrorBoundary.componentDidCatch logs via console.error
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  // 7. Multiple children — one throws ------------------------------------
  it('catches error when one of multiple children throws', () => {
    render(
      <ChartErrorBoundary>
        <GoodChild />
        <ThrowError />
      </ChartErrorBoundary>,
    );

    // Fallback should replace ALL children
    expect(screen.getByText('Grafico no disponible')).toBeInTheDocument();
    expect(screen.queryByTestId('good-child')).not.toBeInTheDocument();
  });

  // 8. Fallback itself does not throw ------------------------------------
  it('renders the fallback UI without errors', () => {
    // Render the boundary in error state and verify no secondary crash
    const { container } = render(
      <ChartErrorBoundary height={300}>
        <ThrowError />
      </ChartErrorBoundary>,
    );

    const fallbackDiv = container.firstElementChild as HTMLElement;
    // The fallback div exists and has expected classes
    expect(fallbackDiv).toBeInTheDocument();
    expect(fallbackDiv.className).toContain('flex');
    expect(fallbackDiv.className).toContain('items-center');
    // The BarChart3 icon renders as an SVG
    const svg = fallbackDiv.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // Text is present
    expect(screen.getByText('Grafico no disponible')).toBeInTheDocument();
  });
});
