import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CalloutBlock from '../CalloutBlock';
import { makeBlock, FIXTURES } from './test-utils';

describe('CalloutBlock', () => {
  it('renders tip variant', () => {
    const block = makeBlock(FIXTURES.callout_tip);
    render(<CalloutBlock block={block} />);
    expect(screen.getByText('Dato')).toBeInTheDocument();
    expect(screen.getByText('El ejercicio aumenta HDL.')).toBeInTheDocument();
  });

  it('renders warning variant', () => {
    const block = makeBlock(FIXTURES.callout_warning);
    render(<CalloutBlock block={block} />);
    // Title "Atención" matches variant label too — use getAllByText
    expect(screen.getAllByText('Atención').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Síntomas silenciosos.')).toBeInTheDocument();
  });

  it('renders clinical variant', () => {
    const block = makeBlock(FIXTURES.callout_clinical);
    render(<CalloutBlock block={block} />);
    expect(screen.getByText('Caso Clínico')).toBeInTheDocument();
  });

  it('renders mnemonic variant', () => {
    const block = makeBlock(FIXTURES.callout_mnemonic);
    render(<CalloutBlock block={block} />);
    // Title "Mnemotecnia" matches variant label too — use getAllByText
    expect(screen.getAllByText('Mnemotecnia').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('ABCDE cardiovascular.')).toBeInTheDocument();
  });

  it('renders exam variant', () => {
    const block = makeBlock(FIXTURES.callout_exam);
    render(<CalloutBlock block={block} />);
    expect(screen.getByText('Para el Examen')).toBeInTheDocument();
  });

  it('defaults gracefully with unknown variant', () => {
    const block = makeBlock({ type: 'callout', content: { variant: 'unknown', title: 'Test', content: 'Body' } });
    render(<CalloutBlock block={block} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
