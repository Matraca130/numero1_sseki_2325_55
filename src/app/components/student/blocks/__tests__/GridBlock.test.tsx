import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GridBlock from '../GridBlock';
import { makeBlock, FIXTURES } from './test-utils';

describe('GridBlock', () => {
  it('renders all items', () => {
    const block = makeBlock(FIXTURES.grid);
    render(<GridBlock block={block} />);
    expect(screen.getByText('TNF-α')).toBeInTheDocument();
    expect(screen.getByText('IL-6')).toBeInTheDocument();
  });

  it('renders item details', () => {
    const block = makeBlock(FIXTURES.grid);
    render(<GridBlock block={block} />);
    expect(screen.getByText('Citoquina proinflamatoria')).toBeInTheDocument();
  });

  it('renders title', () => {
    const block = makeBlock(FIXTURES.grid);
    render(<GridBlock block={block} />);
    expect(screen.getByText('Mediadores')).toBeInTheDocument();
  });

  it('handles empty items gracefully', () => {
    const block = makeBlock({ type: 'grid', content: { title: 'Test', columns: 2, items: [] } });
    render(<GridBlock block={block} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
