/**
 * sanitize.ts — HTML sanitization wrapper for dangerouslySetInnerHTML
 *
 * Security: All HTML rendered via dangerouslySetInnerHTML MUST pass through
 * sanitizeHtml() first. This prevents stored XSS from backend content.
 *
 * FE-001 FIX: Security audit 2026-03-18
 */

import DOMPurify from 'dompurify';

// Security: enforce rel="noopener noreferrer" on all anchor tags that open
// in a new tab to prevent reverse tab-nabbing attacks. Merge with any
// pre-existing rel tokens (e.g., nofollow) instead of overwriting them.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    const existing = (node.getAttribute('rel') ?? '').split(/\s+/).filter(Boolean);
    const required = ['noopener', 'noreferrer'];
    const merged = Array.from(new Set([...existing, ...required])).join(' ');
    node.setAttribute('rel', merged);
  }
});

/**
 * Sanitize HTML for safe rendering via dangerouslySetInnerHTML.
 * Allows common formatting tags + images but strips scripts, event handlers,
 * iframes, forms, and other dangerous elements.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'sub', 'sup', 'mark',
      'small', 'abbr', 'code', 'pre', 'blockquote', 'q', 'cite',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
      'img', 'figure', 'figcaption', 'picture', 'source',
      'div', 'span', 'section', 'article', 'aside', 'details', 'summary',
      'a',
      'hr', 'dl', 'dt', 'dd',
    ],
    ALLOWED_ATTR: [
      'class', 'id', 'src', 'alt', 'title', 'width', 'height',
      'loading', 'href', 'target', 'rel', 'colspan', 'rowspan', 'scope',
    ],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  });
}
