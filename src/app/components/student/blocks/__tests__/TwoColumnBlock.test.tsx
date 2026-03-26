import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TwoColumnBlock from '../TwoColumnBlock';
import { makeBlock, FIXTURES } from './test-utils';

describe('TwoColumnBlock', () => {
  it('renders both column titles', () => {
    const block = makeBlock(FIXTURES.two_column);
    render(<TwoColumnBlock block={block} />);
    expect(screen.getByText('Protectores')).toBeInTheDocument();
    expect(screen.getByText('Riesgo')).toBeInTheDocument();
  });

  it('renders column items', () => {
    const block = makeBlock(FIXTURES.two_column);
    render(<TwoColumnBlock block={block} />);
    expect(screen.getByText('HDL')).toBeInTheDocument();
    expect(screen.getByText('LDL oxidado')).toBeInTheDocument();
  });

  it('handles single column gracefully', () => {
    const block = makeBlock({
      type: 'two_column',
      content: {
        columns: [{ title: 'Solo', items: [{ label: 'Item', detail: 'Detail' }] }],
      },
    });
    render(<TwoColumnBlock block={block} />);
    expect(screen.getByText('Solo')).toBeInTheDocument();
  });

  it('handles empty columns gracefully', () => {
    const block = makeBlock({ type: 'two_column', content: { columns: [] } });
    const { container } = render(<TwoColumnBlock block={block} />);
    expect(container).toBeTruthy();
  });
});
