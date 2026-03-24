import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StagesBlock from '../StagesBlock';
import { makeBlock, FIXTURES } from './test-utils';

describe('StagesBlock', () => {
  it('renders all stages', () => {
    const block = makeBlock(FIXTURES.stages);
    render(<StagesBlock block={block} />);
    expect(screen.getByText('Disfunción Endotelial')).toBeInTheDocument();
    expect(screen.getByText('Estría Grasa')).toBeInTheDocument();
    expect(screen.getByText('Placa Vulnerable')).toBeInTheDocument();
  });

  it('shows stage numbers', () => {
    const block = makeBlock(FIXTURES.stages);
    render(<StagesBlock block={block} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('handles empty items gracefully', () => {
    const block = makeBlock({ type: 'stages', content: { title: 'Test', items: [] } });
    render(<StagesBlock block={block} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('preserves keyword markers in content', () => {
    const block = makeBlock(FIXTURES.stages);
    render(<StagesBlock block={block} />);
    expect(screen.getByText(/\{\{macrofagos\}\}/)).toBeInTheDocument();
  });
});
