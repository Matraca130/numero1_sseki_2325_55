import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ListDetailBlock from '../ListDetailBlock';
import { makeBlock, FIXTURES } from './test-utils';

describe('ListDetailBlock', () => {
  it('renders item labels', () => {
    const block = makeBlock(FIXTURES.list_detail);
    render(<ListDetailBlock block={block} />);
    expect(screen.getByText('Hipertensión')).toBeInTheDocument();
    expect(screen.getByText('Dislipidemia')).toBeInTheDocument();
  });

  it('renders item details', () => {
    const block = makeBlock(FIXTURES.list_detail);
    render(<ListDetailBlock block={block} />);
    expect(screen.getByText('Daño mecánico al endotelio')).toBeInTheDocument();
  });

  it('renders intro text', () => {
    const block = makeBlock(FIXTURES.list_detail);
    render(<ListDetailBlock block={block} />);
    expect(screen.getByText('Principales factores.')).toBeInTheDocument();
  });

  it('handles empty items gracefully', () => {
    const block = makeBlock({ type: 'list_detail', content: { title: 'Test', items: [] } });
    render(<ListDetailBlock block={block} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
