import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import KeyPointBlock from '../KeyPointBlock';
import { makeBlock, FIXTURES } from './test-utils';

describe('KeyPointBlock', () => {
  it('renders with dark background always', () => {
    const block = makeBlock(FIXTURES.key_point);
    const { container } = render(<KeyPointBlock block={block} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/bg-axon-dark/);
  });

  it('shows CRÍTICO badge for critical importance', () => {
    const block = makeBlock(FIXTURES.key_point);
    render(<KeyPointBlock block={block} />);
    expect(screen.getByText(/CRÍTICO/i)).toBeInTheDocument();
  });

  it('does not show badge for high importance', () => {
    const block = makeBlock(FIXTURES.key_point_high);
    render(<KeyPointBlock block={block} />);
    expect(screen.queryByText(/CRÍTICO/i)).not.toBeInTheDocument();
  });

  it('handles empty content gracefully', () => {
    const block = makeBlock({ type: 'key_point', content: {} });
    const { container } = render(<KeyPointBlock block={block} />);
    expect(container).toBeTruthy();
  });
});
