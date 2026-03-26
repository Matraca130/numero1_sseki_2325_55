import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import renderTextWithKeywords from '../renderTextWithKeywords';
import type { SummaryKeyword } from '@/app/services/summariesApi';

function makeKeyword(overrides: Partial<SummaryKeyword> = {}): SummaryKeyword {
  return {
    id: 'kw-1',
    summary_id: 'sum-1',
    name: 'aterosclerosis',
    definition: 'Enfermedad inflamatoria crónica.',
    priority: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/** Helper to render the ReactNode returned by renderTextWithKeywords */
function renderResult(text: string | undefined, keywords: SummaryKeyword[] = []) {
  const result = renderTextWithKeywords(text, keywords);
  return render(<div data-testid="wrapper">{result}</div>);
}

describe('renderTextWithKeywords', () => {
  it('renders plain text when there are no keyword markers', () => {
    renderResult('Texto sin keywords.');
    expect(screen.getByTestId('wrapper')).toHaveTextContent('Texto sin keywords.');
  });

  it('returns null for undefined input', () => {
    const result = renderTextWithKeywords(undefined);
    expect(result).toBeNull();
  });

  it('returns null for empty string input', () => {
    const result = renderTextWithKeywords('');
    expect(result).toBeNull();
  });

  it('parses {{keyword}} and renders KeywordChip when keyword exists', () => {
    const kw = makeKeyword({ name: 'aterosclerosis' });
    renderResult('La {{aterosclerosis}} es grave.', [kw]);
    // The KeywordChip renders the keyword name as chip text
    expect(screen.getByText('aterosclerosis')).toBeInTheDocument();
    // Surrounding text is also present
    expect(screen.getByTestId('wrapper')).toHaveTextContent('La');
    expect(screen.getByTestId('wrapper')).toHaveTextContent('es grave.');
  });

  it('renders keyword name as plain span fallback when keyword not in list', () => {
    renderResult('La {{desconocido}} es rara.', []);
    // Falls back to plain span with keyword name
    expect(screen.getByText('desconocido')).toBeInTheDocument();
    expect(screen.getByTestId('wrapper')).toHaveTextContent('La desconocido es rara.');
  });

  it('handles multiple keywords in one string', () => {
    const kw1 = makeKeyword({ id: 'k1', name: 'endotelio' });
    const kw2 = makeKeyword({ id: 'k2', name: 'macrofagos' });
    renderResult(
      'El {{endotelio}} y los {{macrofagos}} participan.',
      [kw1, kw2],
    );
    expect(screen.getByText('endotelio')).toBeInTheDocument();
    expect(screen.getByText('macrofagos')).toBeInTheDocument();
  });

  it('handles adjacent keywords {{one}}{{two}}', () => {
    const kw1 = makeKeyword({ id: 'k1', name: 'alfa' });
    const kw2 = makeKeyword({ id: 'k2', name: 'beta' });
    renderResult('{{alfa}}{{beta}}', [kw1, kw2]);
    expect(screen.getByText('alfa')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
  });

  it('is case-insensitive when matching keyword names', () => {
    const kw = makeKeyword({ name: 'Endotelio' });
    renderResult('El {{endotelio}} regula el tono.', [kw]);
    // Should match despite case difference
    expect(screen.getByText('Endotelio')).toBeInTheDocument();
  });

  it('skips inactive keywords (is_active = false)', () => {
    const kw = makeKeyword({ name: 'inactivo', is_active: false });
    renderResult('El {{inactivo}} no aparece.', [kw]);
    // Falls back to plain span since keyword is inactive
    const span = screen.getByText('inactivo');
    // Should NOT be a KeywordChip (no role="button")
    expect(span.closest('[role="button"]')).toBeNull();
  });

  it('preserves paragraph breaks (double newlines)', () => {
    const { container } = renderResult('Párrafo uno.\n\nPárrafo dos.');
    const brs = container.querySelectorAll('br');
    expect(brs.length).toBeGreaterThanOrEqual(2);
  });
});
