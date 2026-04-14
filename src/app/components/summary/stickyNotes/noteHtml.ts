// ============================================================
// Axon — StickyNotes · Rich-text helpers (pure)
//
// Note bodies are stored as HTML so users can underline (<u>) text. We keep
// the allowed-tag set extremely small (<u>, <br>) to avoid XSS surface area
// and to keep notes free of stray formatting from clipboard pastes.
// ============================================================

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Detects whether a stored note is in our HTML format (new) or legacy plain
// text. New notes always contain a <br>, <u>, or </u> tag once edited.
export function isHtmlContent(content: string): boolean {
  return /<br\s*\/?>|<u>|<\/u>/i.test(content);
}

// Convert legacy plain text into our HTML format (escape entities and turn
// newlines into <br> tags) so old notes still render after the textarea →
// contentEditable migration.
export function plainTextToHtml(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, '<br>');
}

// Idempotent migration helper used during parseSlots.
export function ensureHtml(content: string): string {
  if (!content) return '';
  return isHtmlContent(content) ? content : plainTextToHtml(content);
}

// Strip everything except <u> and <br>. Block-ish elements (<div>, <p>) are
// flattened into trailing <br>s so the user's visual line structure is kept
// even when the browser inserts wrapper tags on Enter or paste.
export function sanitizeNoteHtml(html: string): string {
  if (!html) return '';
  if (typeof document === 'undefined') return html;
  const root = document.createElement('div');
  root.innerHTML = html;
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent ?? '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const inner = Array.from(node.childNodes).map(walk).join('');
    if (tag === 'u') return `<u>${inner}</u>`;
    if (tag === 'br') return '<br>';
    if (tag === 'div' || tag === 'p') {
      return inner.length ? `${inner}<br>` : '<br>';
    }
    return inner;
  };
  return Array.from(root.childNodes).map(walk).join('');
}

// Extract plain text from our HTML format for the picker preview.
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  if (typeof document === 'undefined') return html;
  const tmp = document.createElement('div');
  tmp.innerHTML = html.replace(/<br\s*\/?>/gi, '\n');
  return tmp.textContent ?? '';
}
