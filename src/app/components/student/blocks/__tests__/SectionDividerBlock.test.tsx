import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectionDividerBlock from '../SectionDividerBlock';
import { makeBlock, FIXTURES } from './test-utils';

describe('SectionDividerBlock', () => {
  it('renders label text', () => {
    const block = makeBlock(FIXTURES.section_divider);
    render(<SectionDividerBlock block={block} />);
    expect(screen.getByText('Fisiopatología')).toBeInTheDocument();
  });

  it('renders separator line', () => {
    const block = makeBlock(FIXTURES.section_divider);
    const { container } = render(<SectionDividerBlock block={block} />);
    expect(container.querySelector('hr') || container.querySelector('[role="separator"]')).toBeTruthy();
  });

  it('renders just a line with no label', () => {
    const block = makeBlock(FIXTURES.section_divider_empty);
    const { container } = render(<SectionDividerBlock block={block} />);
    expect(container.querySelector('hr') || container.querySelector('[role="separator"]')).toBeTruthy();
    expect(screen.queryByText('Fisiopatología')).not.toBeInTheDocument();
  });

  it('handles missing content gracefully', () => {
    const block = makeBlock({ type: 'section_divider', content: {} });
    const { container } = render(<SectionDividerBlock block={block} />);
    expect(container).toBeTruthy();
  });
});
