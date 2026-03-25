import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProseBlock from '../ProseBlock';
import { makeBlock, FIXTURES } from './test-utils';

describe('ProseBlock', () => {
  it('renders title', () => {
    const block = makeBlock(FIXTURES.prose);
    render(<ProseBlock block={block} />);
    expect(screen.getByText('Introducción a la Aterosclerosis')).toBeInTheDocument();
  });

  it('renders content text', () => {
    const block = makeBlock(FIXTURES.prose);
    render(<ProseBlock block={block} />);
    expect(screen.getByText(/enfermedad inflamatoria crónica/)).toBeInTheDocument();
  });

  it('renders keyword name as fallback when no keywords provided', () => {
    const block = makeBlock(FIXTURES.prose);
    render(<ProseBlock block={block} />);
    // Without keywords prop, {{aterosclerosis}} renders as plain "aterosclerosis"
    expect(screen.getByText('aterosclerosis')).toBeInTheDocument();
  });

  it('handles empty content gracefully', () => {
    const block = makeBlock({ type: 'prose', content: {} });
    const { container } = render(<ProseBlock block={block} />);
    expect(container).toBeTruthy();
  });
});
