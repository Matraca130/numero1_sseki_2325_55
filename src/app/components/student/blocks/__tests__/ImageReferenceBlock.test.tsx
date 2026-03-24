import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ImageReferenceBlock from '../ImageReferenceBlock';
import { makeBlock, FIXTURES } from './test-utils';

describe('ImageReferenceBlock', () => {
  it('renders image with src', () => {
    const block = makeBlock(FIXTURES.image_reference);
    render(<ImageReferenceBlock block={block} />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/placa.png');
  });

  it('renders caption', () => {
    const block = makeBlock(FIXTURES.image_reference);
    render(<ImageReferenceBlock block={block} />);
    expect(screen.getByText('Figura 1')).toBeInTheDocument();
  });

  it('renders placeholder without image', () => {
    const block = makeBlock(FIXTURES.image_reference_empty);
    render(<ImageReferenceBlock block={block} />);
    expect(screen.getByText('Sin imagen')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('handles completely empty content', () => {
    const block = makeBlock({ type: 'image_reference', content: {} });
    const { container } = render(<ImageReferenceBlock block={block} />);
    expect(container).toBeTruthy();
  });
});
