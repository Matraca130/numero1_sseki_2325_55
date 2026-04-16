import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChartContainer } from '../chart';

// Single harmless child so ResponsiveContainer has content.
function Noop() {
  return <g />;
}

describe('ChartContainer <style> injection (issue #441)', () => {
  it('emits clean CSS custom property when color value is safe', () => {
    const { container } = render(
      <ChartContainer id="safe" config={{ series1: { color: '#14b8a6' } }}>
        <Noop />
      </ChartContainer>,
    );
    const style = container.querySelector('style');
    expect(style?.innerHTML).toContain('--color-series1: #14b8a6;');
    expect(style?.innerHTML).not.toMatch(/body\s*\{/);
  });

  it('rejects CSS-injection payload and falls back to currentColor', () => {
    const payload = 'red;} body{display:none}/*';
    const { container } = render(
      <ChartContainer id="attack" config={{ series1: { color: payload } }}>
        <Noop />
      </ChartContainer>,
    );
    const style = container.querySelector('style');
    const css = style?.innerHTML ?? '';

    // Fallback was emitted.
    expect(css).toContain('--color-series1: currentColor;');

    // None of the injection characters escaped the --color-series1 rule.
    expect(css).not.toContain(payload);
    expect(css).not.toMatch(/body\s*\{/);
    expect(css).not.toContain('display:none');
  });

  it('permits CSS variable references', () => {
    const { container } = render(
      <ChartContainer id="var" config={{ series1: { color: 'var(--primary)' } }}>
        <Noop />
      </ChartContainer>,
    );
    expect(container.querySelector('style')?.innerHTML).toContain(
      '--color-series1: var(--primary);',
    );
  });

  it('permits functional color notations with commas and percentages', () => {
    const { container } = render(
      <ChartContainer
        id="rgb"
        config={{ series1: { color: 'hsl(180, 50%, 40%)' } }}
      >
        <Noop />
      </ChartContainer>,
    );
    expect(container.querySelector('style')?.innerHTML).toContain(
      '--color-series1: hsl(180, 50%, 40%);',
    );
  });
});
