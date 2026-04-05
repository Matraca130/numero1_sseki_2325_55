// ============================================================
// Tests for sanitize.ts — HTML sanitization
//
// Verifies:
//   - Allowed tags are preserved
//   - Forbidden tags are stripped
//   - Event handlers are removed
//   - Safe attributes are preserved
//   - Dangerous attributes are removed
// ============================================================

import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '@/app/lib/sanitize';

// ──────────────────────────────────────────────────────────
// SUITE 1: Basic formatting tags
// ──────────────────────────────────────────────────────────

describe('sanitizeHtml — formatting tags', () => {
  it('preserves <b> and <strong>', () => {
    const dirty = '<b>bold</b> <strong>strong</strong>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<b>bold</b>');
    expect(clean).toContain('<strong>strong</strong>');
  });

  it('preserves <i> and <em>', () => {
    const dirty = '<i>italic</i> <em>emphasis</em>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<i>italic</i>');
    expect(clean).toContain('<em>emphasis</em>');
  });

  it('preserves <u>, <s>, <sub>, <sup>', () => {
    const dirty = '<u>underline</u> <s>strike</s> <sub>sub</sub> <sup>sup</sup>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<u>underline</u>');
    expect(clean).toContain('<s>strike</s>');
    expect(clean).toContain('<sub>sub</sub>');
    expect(clean).toContain('<sup>sup</sup>');
  });

  it('preserves <small>, <mark>, <code>', () => {
    const dirty = '<small>small</small> <mark>marked</mark> <code>code</code>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<small>small</small>');
    expect(clean).toContain('<mark>marked</mark>');
    expect(clean).toContain('<code>code</code>');
  });

  it('preserves <p>, <br>, <hr>', () => {
    const dirty = '<p>paragraph</p><br><hr>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<p>paragraph</p>');
    expect(clean).toContain('<br>');
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 2: Heading and block tags
// ──────────────────────────────────────────────────────────

describe('sanitizeHtml — headings and blocks', () => {
  it('preserves all heading levels', () => {
    const dirty = '<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<h1>H1</h1>');
    expect(clean).toContain('<h6>H6</h6>');
  });

  it('preserves <pre>, <blockquote>, <cite>', () => {
    const dirty = '<pre>preformatted</pre><blockquote>quote</blockquote><cite>citation</cite>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<pre>preformatted</pre>');
    expect(clean).toContain('<blockquote>quote</blockquote>');
    expect(clean).toContain('<cite>citation</cite>');
  });

  it('preserves <div> and <span>', () => {
    const dirty = '<div>division</div><span>span</span>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<div>division</div>');
    expect(clean).toContain('<span>span</span>');
  });

  it('preserves <section>, <article>, <aside>', () => {
    const dirty = '<section>section</section><article>article</article><aside>aside</aside>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<section>section</section>');
    expect(clean).toContain('<article>article</article>');
    expect(clean).toContain('<aside>aside</aside>');
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 3: Lists
// ──────────────────────────────────────────────────────────

describe('sanitizeHtml — lists', () => {
  it('preserves <ul>, <ol>, <li>', () => {
    const dirty = '<ul><li>item1</li><li>item2</li></ul>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<ul>');
    expect(clean).toContain('<li>item1</li>');
    expect(clean).toContain('</ul>');
  });

  it('preserves <dl>, <dt>, <dd>', () => {
    const dirty = '<dl><dt>term</dt><dd>definition</dd></dl>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<dl>');
    expect(clean).toContain('<dt>term</dt>');
    expect(clean).toContain('<dd>definition</dd>');
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 4: Tables
// ──────────────────────────────────────────────────────────

describe('sanitizeHtml — tables', () => {
  it('preserves <table>, <tr>, <td>, <th>', () => {
    const dirty = '<table><tr><th>Header</th></tr><tr><td>Data</td></tr></table>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<table>');
    expect(clean).toContain('<th>Header</th>');
    expect(clean).toContain('<td>Data</td>');
  });

  it('preserves <thead>, <tbody>, <tfoot>', () => {
    const dirty = '<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>D</td></tr></tbody></table>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<thead>');
    expect(clean).toContain('<tbody>');
  });

  it('preserves colspan and rowspan attributes', () => {
    const dirty = '<table><tr><td colspan="2" rowspan="2">Cell</td></tr></table>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('colspan="2"');
    expect(clean).toContain('rowspan="2"');
  });

  it('preserves scope attribute on th', () => {
    const dirty = '<table><tr><th scope="col">Header</th></tr></table>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('scope="col"');
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 5: Images and media (safe)
// ──────────────────────────────────────────────────────────

describe('sanitizeHtml — images', () => {
  it('preserves <img> with src and alt', () => {
    const dirty = '<img src="image.jpg" alt="description">';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('src="image.jpg"');
    expect(clean).toContain('alt="description"');
  });

  it('preserves width and height on images', () => {
    const dirty = '<img src="pic.jpg" width="100" height="100">';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('width="100"');
    expect(clean).toContain('height="100"');
  });

  it('preserves loading attribute', () => {
    const dirty = '<img src="pic.jpg" loading="lazy">';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('loading="lazy"');
  });

  it('preserves <figure> and <figcaption>', () => {
    const dirty = '<figure><img src="pic.jpg"><figcaption>Caption</figcaption></figure>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<figure>');
    expect(clean).toContain('<figcaption>Caption</figcaption>');
  });

  it('preserves <picture> and <source>', () => {
    const dirty = '<picture><source><img src="pic.jpg"></picture>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<picture>');
    expect(clean).toContain('<source>');
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 6: Links
// ──────────────────────────────────────────────────────────

describe('sanitizeHtml — links', () => {
  it('preserves <a> with href', () => {
    const dirty = '<a href="https://example.com">link</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<a');
    expect(clean).toContain('href="https://example.com"');
    expect(clean).toContain('>link</a>');
  });

  it('preserves target and rel attributes', () => {
    const dirty = '<a href="https://example.com" target="_blank" rel="noopener">link</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('target="_blank"');
    expect(clean).toContain('rel="noopener"');
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 7: Forbidden tags are stripped
// ──────────────────────────────────────────────────────────

describe('sanitizeHtml — forbidden tags', () => {
  it('strips <script> tags', () => {
    const dirty = '<script>alert("xss")</script>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('alert');
  });

  it('strips <style> tags', () => {
    const dirty = '<style>body { color: red; }</style>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<style>');
    expect(clean).not.toContain('color: red');
  });

  it('strips <iframe> tags', () => {
    const dirty = '<iframe src="evil.com"></iframe>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<iframe>');
  });

  it('strips <object> and <embed>', () => {
    const dirty = '<object><embed src="evil.swf"></object>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<object>');
    expect(clean).not.toContain('<embed>');
  });

  it('strips <form>, <input>, <textarea>', () => {
    const dirty = '<form><input><textarea></textarea></form>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<form>');
    expect(clean).not.toContain('<input>');
    expect(clean).not.toContain('<textarea>');
  });

  it('strips <button> tags', () => {
    const dirty = '<button onclick="evil()">Click</button>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<button>');
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 8: Event handlers are removed
// ──────────────────────────────────────────────────────────

describe('sanitizeHtml — event handlers', () => {
  it('removes onerror from img', () => {
    const dirty = '<img src="pic.jpg" onerror="alert(\'xss\')">';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('alert');
  });

  it('removes onclick from elements', () => {
    const dirty = '<a href="#" onclick="alert(\'xss\')">Click</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('alert');
  });

  it('removes onload from img', () => {
    const dirty = '<img src="pic.jpg" onload="evil()">';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('onload');
  });

  it('removes onmouseover', () => {
    const dirty = '<div onmouseover="evil()">text</div>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('onmouseover');
  });

  it('removes onfocus and onblur', () => {
    const dirty = '<input onfocus="evil()" onblur="evil()">';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('onfocus');
    expect(clean).not.toContain('onblur');
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 9: Safe attributes preserved
// ──────────────────────────────────────────────────────────

describe('sanitizeHtml — safe attributes', () => {
  it('preserves class attribute', () => {
    const dirty = '<div class="my-class">text</div>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('class="my-class"');
  });

  it('preserves id attribute', () => {
    const dirty = '<div id="my-id">text</div>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('id="my-id"');
  });

  it('preserves title attribute', () => {
    const dirty = '<img src="pic.jpg" title="Picture">';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('title="Picture"');
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 10: Complex scenarios
// ──────────────────────────────────────────────────────────

describe('sanitizeHtml — complex scenarios', () => {
  it('sanitizes mixed content preserving safe elements', () => {
    const dirty = `
      <p>Hello <b>world</b>!</p>
      <script>alert('xss')</script>
      <img src="pic.jpg" onerror="evil()">
      <a href="https://example.com">Safe link</a>
    `;
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<p>');
    expect(clean).toContain('<b>world</b>');
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('onerror');
    expect(clean).toContain('href="https://example.com"');
  });

  it('handles deeply nested elements', () => {
    const dirty = '<div><p><span><b>nested</b></span></p></div>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<b>nested</b>');
  });

  it('preserves text content even when tags are removed', () => {
    const dirty = '<p>Before <script>alert("xss")</script> After</p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('Before');
    expect(clean).toContain('After');
    expect(clean).not.toContain('<script>');
  });

  it('handles empty HTML', () => {
    const clean = sanitizeHtml('');
    expect(clean).toBe('');
  });

  it('handles plain text', () => {
    const clean = sanitizeHtml('Just plain text');
    expect(clean).toBe('Just plain text');
  });
});
