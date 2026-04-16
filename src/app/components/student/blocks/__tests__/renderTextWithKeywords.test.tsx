import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import renderTextWithKeywords, { replaceKeywordPlaceholders } from '../renderTextWithKeywords';
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

  it('renders keyword name as styled span fallback when keyword not in list', () => {
    renderResult('La {{desconocido}} es rara.', []);
    // Falls back to styled span with keyword name (without braces in text content)
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

  // --- Inline markdown tests ---

  it('renders **bold** as <strong>', () => {
    const { container } = renderResult('Texto **importante** aquí.');
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong!.textContent).toBe('importante');
  });

  it('renders *italic* as <em>', () => {
    const { container } = renderResult('Texto *cursiva* aquí.');
    const em = container.querySelector('em');
    expect(em).not.toBeNull();
    expect(em!.textContent).toBe('cursiva');
  });

  it('renders `code` as <code>', () => {
    const { container } = renderResult('Usa `console.log` para depurar.');
    const code = container.querySelector('code');
    expect(code).not.toBeNull();
    expect(code!.textContent).toBe('console.log');
  });

  it('renders --- as <hr>', () => {
    const { container } = renderResult('Antes\n\n---\n\nDespués');
    const hr = container.querySelector('hr');
    expect(hr).not.toBeNull();
  });

  it('renders [Imagen: foto del corazón] as styled placeholder', () => {
    const { container } = renderResult('Ver [Imagen: foto del corazón] aquí.');
    const span = container.querySelector('span.text-xs.italic');
    expect(span).not.toBeNull();
    expect(span!.textContent).toBe('[Imagen: foto del corazón]');
  });

  it('does NOT parse markdown inside keyword markers', () => {
    // {{**keyword**}} should look for a keyword named "**keyword**", not parse bold
    renderResult('La {{**keyword**}} es especial.', []);
    // Falls back to plain span with the raw name including asterisks
    expect(screen.getByText('**keyword**')).toBeInTheDocument();
  });

  it('renders mixed bold + keyword chip + text correctly', () => {
    const kw = makeKeyword({ name: 'aterosclerosis' });
    const { container } = renderResult(
      'La **aterosclerosis** es {{aterosclerosis}} crónica.',
      [kw],
    );
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong!.textContent).toBe('aterosclerosis');
    // Both bold text and keyword chip contain "aterosclerosis"
    const matches = screen.getAllByText('aterosclerosis');
    expect(matches.length).toBe(2);
    expect(screen.getByTestId('wrapper')).toHaveTextContent('crónica.');
  });

  it('code protects content from bold parsing', () => {
    const { container } = renderResult('Esto es `**not bold**` texto.');
    const code = container.querySelector('code');
    expect(code).not.toBeNull();
    expect(code!.textContent).toBe('**not bold**');
    // No <strong> should exist
    expect(container.querySelector('strong')).toBeNull();
  });

  it('renders bold and italic in same text', () => {
    const { container } = renderResult('**bold** and *italic* together.');
    expect(container.querySelector('strong')!.textContent).toBe('bold');
    expect(container.querySelector('em')!.textContent).toBe('italic');
  });

  it('matches keyword by UUID (id) when content uses {{uuid}} placeholders', () => {
    const kw = makeKeyword({ id: 'd70d2417-ceea-4cb7-b533-5b6859c7f63b', name: 'Síncope' });
    renderResult('El {{d70d2417-ceea-4cb7-b533-5b6859c7f63b}} cardíaco es grave.', [kw]);
    expect(screen.getByText('Síncope')).toBeInTheDocument();
    expect(screen.getByTestId('wrapper')).toHaveTextContent('cardíaco es grave.');
  });

  it('matches keyword by UUID even with multiple UUID placeholders', () => {
    const kw1 = makeKeyword({ id: 'aaa-111', name: 'Disnea' });
    const kw2 = makeKeyword({ id: 'bbb-222', name: 'Edema' });
    renderResult('{{aaa-111}} y {{bbb-222}} son síntomas.', [kw1, kw2]);
    expect(screen.getByText('Disnea')).toBeInTheDocument();
    expect(screen.getByText('Edema')).toBeInTheDocument();
  });

  it('handles ***text*** gracefully (bold wrapping italic)', () => {
    const { container } = renderResult('Esto es ***texto*** especial.');
    // Should render as <strong><em>texto</em></strong> or at least not crash
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(container.textContent).toContain('texto');
  });

  it('styles unresolved placeholder span with subtle classes', () => {
    const { container } = renderResult('Ver {{abc-uuid-123}} aquí.', []);
    const span = container.querySelector('span.text-xs.italic.text-slate-400');
    expect(span).not.toBeNull();
    expect(span!.textContent).toBe('abc-uuid-123');
  });

  it('resolves bare UUID (without {{}}) when it matches a keyword ID', () => {
    const kw = makeKeyword({ id: 'd70d2417-ceea-4cb7-b533-5b6859c7f63b', name: 'Síncope' });
    renderResult('palpitaciones, d70d2417-ceea-4cb7-b533-5b6859c7f63b, edema y cianosis', [kw]);
    expect(screen.getByText('Síncope')).toBeInTheDocument();
    expect(screen.getByTestId('wrapper')).toHaveTextContent('palpitaciones,');
    expect(screen.getByTestId('wrapper')).toHaveTextContent(', edema y cianosis');
  });

  it('does NOT wrap bare UUIDs that do not match any keyword ID', () => {
    renderResult('ID: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee desconocido.', []);
    expect(screen.getByTestId('wrapper')).toHaveTextContent('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });

  it('resolves multiple bare UUIDs in same text', () => {
    const kw1 = makeKeyword({ id: '4f60d12f-b9a3-44b2-b051-06d5469f3cdc', name: 'Ortopnea' });
    const kw2 = makeKeyword({ id: '63e643c7-7193-4566-8282-bbb4ca44c6dd', name: 'DPN' });
    renderResult(
      'Cuando progresa a 4f60d12f-b9a3-44b2-b051-06d5469f3cdc o a 63e643c7-7193-4566-8282-bbb4ca44c6dd',
      [kw1, kw2],
    );
    expect(screen.getByText('Ortopnea')).toBeInTheDocument();
    expect(screen.getByText('DPN')).toBeInTheDocument();
  });

  it('does not double-wrap UUIDs already in {{}}', () => {
    const kw = makeKeyword({ id: 'd70d2417-ceea-4cb7-b533-5b6859c7f63b', name: 'Síncope' });
    renderResult('{{d70d2417-ceea-4cb7-b533-5b6859c7f63b}} es importante.', [kw]);
    expect(screen.getByText('Síncope')).toBeInTheDocument();
  });
});

describe('replaceKeywordPlaceholders', () => {
  it('preserves {{braces}} for unresolved placeholders instead of returning raw UUID', () => {
    const result = replaceKeywordPlaceholders('Ver {{abc-uuid-123}} aquí.', []);
    expect(result).toBe('Ver {{abc-uuid-123}} aquí.');
  });

  it('replaces resolved placeholders with keyword name', () => {
    const kw = makeKeyword({ id: 'abc-uuid-123', name: 'Síncope' });
    const result = replaceKeywordPlaceholders('Ver {{abc-uuid-123}} aquí.', [kw]);
    expect(result).toBe('Ver Síncope aquí.');
  });

  it('resolves bare UUID to keyword name in plain string', () => {
    const kw = makeKeyword({ id: 'd70d2417-ceea-4cb7-b533-5b6859c7f63b', name: 'Síncope' });
    const result = replaceKeywordPlaceholders(
      'palpitaciones, d70d2417-ceea-4cb7-b533-5b6859c7f63b, edema',
      [kw],
    );
    expect(result).toBe('palpitaciones, Síncope, edema');
  });

  it('does NOT escape HTML in keyword names by default (plain-text mode)', () => {
    const kw = makeKeyword({ id: 'abc-uuid-123', name: '<script>alert(1)</script>' });
    const result = replaceKeywordPlaceholders('Ver {{abc-uuid-123}} aquí.', [kw]);
    expect(result).toBe('Ver <script>alert(1)</script> aquí.');
  });

  it('escapes HTML in keyword names when escapeHtml option is set (XSS defense)', () => {
    const kw = makeKeyword({ id: 'abc-uuid-123', name: '<img src=x onerror=alert(1)>' });
    const result = replaceKeywordPlaceholders(
      'Ver {{abc-uuid-123}} aquí.',
      [kw],
      { escapeHtml: true },
    );
    // Raw tag must not appear — angle brackets must be escaped
    expect(result).not.toContain('<img');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    // Entities must be present
    expect(result).toBe('Ver &lt;img src=x onerror=alert(1)&gt; aquí.');
  });

  it('escapes all HTML-significant characters (& < > " \')', () => {
    const kw = makeKeyword({ id: 'k1', name: `A&B<C>D"E'F` });
    const result = replaceKeywordPlaceholders('X {{k1}} Y', [kw], { escapeHtml: true });
    expect(result).toBe('X A&amp;B&lt;C&gt;D&quot;E&#39;F Y');
  });
});
