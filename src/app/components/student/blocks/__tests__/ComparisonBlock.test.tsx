import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ComparisonBlock from '../ComparisonBlock';
import { makeBlock, FIXTURES } from './test-utils';

describe('ComparisonBlock', () => {
  it('renders semantic table elements', () => {
    const block = makeBlock(FIXTURES.comparison);
    const { container } = render(<ComparisonBlock block={block} />);
    expect(container.querySelector('table')).toBeInTheDocument();
    expect(container.querySelector('thead')).toBeInTheDocument();
    expect(container.querySelector('tbody')).toBeInTheDocument();
  });

  it('renders all headers', () => {
    const block = makeBlock(FIXTURES.comparison);
    render(<ComparisonBlock block={block} />);
    expect(screen.getByText('Característica')).toBeInTheDocument();
    expect(screen.getByText('Estable')).toBeInTheDocument();
    expect(screen.getByText('Vulnerable')).toBeInTheDocument();
  });

  it('renders all row data', () => {
    const block = makeBlock(FIXTURES.comparison);
    render(<ComparisonBlock block={block} />);
    expect(screen.getByText('Capa fibrosa')).toBeInTheDocument();
    expect(screen.getByText('Gruesa')).toBeInTheDocument();
    expect(screen.getByText('Delgada')).toBeInTheDocument();
  });

  it('handles empty rows gracefully', () => {
    const block = makeBlock({
      type: 'comparison',
      content: { title: 'Test', headers: ['A', 'B'], rows: [] },
    });
    render(<ComparisonBlock block={block} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
