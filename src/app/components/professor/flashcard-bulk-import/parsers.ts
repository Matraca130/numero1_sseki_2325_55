/**
 * Flashcard bulk import parsers.
 * Handles text, CSV, and JSON parsing into BulkRow format.
 */

import type { Keyword } from '@/app/types/platform';
import type { BulkRow } from '../BulkPreviewTable';

let _tempId = 0;
export function tempId(): string {
  return `bulk_${Date.now()}_${++_tempId}`;
}

export type SepType = '|' | '\t' | ';';

export function detectSeparator(text: string): SepType {
  const lines = text.trim().split('\n').slice(0, 5); // sample first 5 lines
  const counts = { '|': 0, '\t': 0, ';': 0 };
  for (const line of lines) {
    if (line.includes('|')) counts['|']++;
    if (line.includes('\t')) counts['\t']++;
    if (line.includes(';')) counts[';']++;
  }
  if (counts['\t'] >= counts['|'] && counts['\t'] >= counts[';'] && counts['\t'] > 0) return '\t';
  if (counts[';'] > counts['|'] && counts[';'] > 0) return ';';
  return '|';
}

function matchKeyword(hint: string, keywords: Keyword[]): string {
  if (!hint) return '';
  const lower = hint.toLowerCase();
  const match = keywords.find(
    k => k.term.toLowerCase() === lower ||
         k.term.toLowerCase().includes(lower) ||
         lower.includes(k.term.toLowerCase())
  );
  return match?.id || '';
}

function buildRow(front: string, back: string, keywordId: string): BulkRow {
  const hasContent = front.length > 0 && back.length > 0;
  return {
    id: tempId(),
    front,
    back,
    keywordId,
    subtopicId: '',
    selected: false,
    status: !hasContent ? 'error' as const : !keywordId ? 'no_keyword' as const : 'ok' as const,
    error: !hasContent ? 'Frente y reverso requeridos' : undefined,
  };
}

export function parseText(text: string, sep: SepType, keywords: Keyword[]): BulkRow[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  return lines.map(line => {
    const parts = line.split(sep).map(s => s.trim());
    return buildRow(parts[0] || '', parts[1] || '', matchKeyword(parts[2] || '', keywords));
  });
}

export function parseCsv(content: string, keywords: Keyword[]): BulkRow[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const sep = headerLine.includes('\t') ? '\t' : headerLine.includes(';') ? ';' : ',';
  const headers = headerLine.split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

  const frontIdx = headers.findIndex(h => h === 'front' || h === 'frente' || h === 'pregunta');
  const backIdx = headers.findIndex(h => h === 'back' || h === 'reverso' || h === 'respuesta');
  const kwIdx = headers.findIndex(h => h === 'keyword' || h === 'keyword_name' || h === 'palabra_clave');

  if (frontIdx === -1 || backIdx === -1) return [];

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const parts = line.split(sep).map(s => s.trim().replace(/^["']|["']$/g, ''));
    return buildRow(
      parts[frontIdx] || '',
      parts[backIdx] || '',
      matchKeyword(kwIdx >= 0 ? (parts[kwIdx] || '') : '', keywords),
    );
  });
}

export function parseJson(content: string, keywords: Keyword[]): BulkRow[] {
  try {
    const data = JSON.parse(content);
    const items = Array.isArray(data) ? data : data.flashcards || data.cards || data.items || [];
    return items.map((item: any) => {
      const front = String(item.front || item.frente || item.question || item.pregunta || '');
      const back = String(item.back || item.reverso || item.answer || item.respuesta || '');
      const keywordHint = String(item.keyword || item.keyword_name || item.palabra_clave || '');
      return buildRow(front, back, matchKeyword(keywordHint, keywords));
    });
  } catch {
    return [];
  }
}
