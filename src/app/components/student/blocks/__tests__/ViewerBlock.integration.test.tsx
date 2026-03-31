// ============================================================
// Axon — ViewerBlock Integration Test (blocks/__tests__)
//
// Verifies that each edu block type routes to the correct
// renderer component and unknown types degrade gracefully.
// ============================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ViewerBlock } from '../../ViewerBlock';
import { makeBlock, FIXTURES } from './test-utils';

const EDU_BLOCK_TYPES = [
  { name: 'key_point', fixture: FIXTURES.key_point, expectedText: 'Concepto Central' },
  { name: 'callout', fixture: FIXTURES.callout_tip, expectedText: 'Dato' },
  { name: 'comparison', fixture: FIXTURES.comparison, expectedText: 'Estable vs Vulnerable' },
  { name: 'grid', fixture: FIXTURES.grid, expectedText: 'Mediadores' },
  { name: 'list_detail', fixture: FIXTURES.list_detail, expectedText: 'Factores de Riesgo' },
  { name: 'stages', fixture: FIXTURES.stages, expectedText: 'Progresión' },
  { name: 'two_column', fixture: FIXTURES.two_column, expectedText: 'Protectores' },
  { name: 'prose', fixture: FIXTURES.prose, expectedText: 'Introducción a la Aterosclerosis' },
  { name: 'section_divider', fixture: FIXTURES.section_divider, expectedText: 'Fisiopatología' },
  { name: 'image_reference', fixture: FIXTURES.image_reference, expectedText: 'Figura 1' },
] as const;

describe('ViewerBlock — edu block type routing', () => {
  EDU_BLOCK_TYPES.forEach(({ name, fixture, expectedText }) => {
    it(`routes "${name}" to its renderer and shows expected content`, () => {
      const block = makeBlock(fixture);
      const { container } = render(
        <ViewerBlock block={block} isMobile={false} />,
      );
      // Must NOT show the fallback
      expect(container.textContent).not.toContain('Bloque no soportado');
      // Must render content from the fixture
      expect(container.textContent).toContain(expectedText);
    });
  });

  it('renders callout variants (warning, clinical, mnemonic, exam) without fallback', () => {
    const variants = [
      FIXTURES.callout_warning,
      FIXTURES.callout_clinical,
      FIXTURES.callout_mnemonic,
      FIXTURES.callout_exam,
    ];
    variants.forEach((fixture) => {
      const block = makeBlock(fixture);
      const { container } = render(
        <ViewerBlock block={block} isMobile={false} />,
      );
      expect(container.textContent).not.toContain('Bloque no soportado');
    });
  });
});

describe('ViewerBlock — unknown/legacy block types', () => {
  it('renders fallback for unknown block type without crashing', () => {
    const block = makeBlock({
      type: 'totally_unknown_type' as any,
      content: { text: 'should not matter' },
    });
    const { container } = render(
      <ViewerBlock block={block} isMobile={false} />,
    );
    expect(container.textContent).toContain('Bloque no soportado');
    expect(container.textContent).toContain('totally_unknown_type');
  });

  it('renders legacy text block correctly', () => {
    const block = makeBlock({
      type: 'text' as any,
      content: { text: 'Some legacy text' },
    });
    const { container } = render(
      <ViewerBlock block={block} isMobile={false} />,
    );
    expect(container.textContent).toContain('Some legacy text');
    expect(container.textContent).not.toContain('Bloque no soportado');
  });

  it('renders legacy heading block correctly', () => {
    const block = makeBlock({
      type: 'heading' as any,
      content: { text: 'Section Title', level: 2 },
    });
    render(<ViewerBlock block={block} isMobile={false} />);
    expect(screen.getByText('Section Title')).toBeInTheDocument();
  });

  it('does not crash when content is empty', () => {
    const block = makeBlock({
      type: 'prose',
      content: {},
    });
    const { container } = render(
      <ViewerBlock block={block} isMobile={false} />,
    );
    expect(container).toBeTruthy();
  });
});
