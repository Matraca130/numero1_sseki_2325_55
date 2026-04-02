/**
 * CSS styles for the TipTap editor.
 * Full-page layout, content typography, image handling, keyword highlights.
 */

export const editorStyles = `
  /* ── Full-page editor container ─────────────────── */
  .axon-editor-fullpage {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .axon-editor-scroll {
    flex: 1;
    overflow-y: auto;
    background: #fafafa;
  }

  .axon-editor-content {
    max-width: 780px;
    margin: 0 auto;
    padding: 2rem 2.5rem 4rem;
    min-height: 100%;
  }

  /* ── TipTap content area ─────────────────────────── */
  .axon-editor-content .tiptap {
    outline: none;
    min-height: calc(100vh - 200px);
    color: #1f2937;
    line-height: 1.8;
  }
  .axon-editor-content .tiptap p {
    margin-bottom: 0.75rem;
  }
  .axon-editor-content .tiptap h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
    margin-top: 1.25rem;
    color: #111827;
  }
  .axon-editor-content .tiptap h2 {
    font-size: 1.375rem;
    font-weight: 600;
    margin-bottom: 0.625rem;
    margin-top: 1rem;
    color: #1f2937;
  }
  .axon-editor-content .tiptap h3 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    margin-top: 0.875rem;
    color: #374151;
  }
  .axon-editor-content .tiptap ul {
    list-style-type: disc;
    padding-left: 1.5rem;
    margin-bottom: 0.75rem;
  }
  .axon-editor-content .tiptap ol {
    list-style-type: decimal;
    padding-left: 1.5rem;
    margin-bottom: 0.75rem;
  }
  .axon-editor-content .tiptap li {
    margin-bottom: 0.25rem;
  }
  .axon-editor-content .tiptap blockquote {
    border-left: 3px solid #e5e7eb;
    padding-left: 1rem;
    color: #6b7280;
    margin-bottom: 0.75rem;
  }
  .axon-editor-content .tiptap hr {
    border-color: #e5e7eb;
    margin: 1.5rem 0;
  }
  .axon-editor-content .tiptap code {
    background: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
  }
  .axon-editor-content .tiptap pre {
    background: #1f2937;
    color: #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 0.75rem;
    overflow-x: auto;
  }
  .axon-editor-content .tiptap pre code {
    background: none;
    padding: 0;
    color: inherit;
  }

  /* ── Image styles ────────────────────────────────── */
  .axon-editor-content .tiptap img {
    border-radius: 0.5rem;
    cursor: grab;
    transition: box-shadow 0.15s ease, opacity 0.15s ease;
  }
  .axon-editor-content .tiptap img:hover {
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.25);
  }
  .axon-editor-content .tiptap img:active {
    cursor: grabbing;
    opacity: 0.7;
  }
  .axon-editor-content .tiptap img.ProseMirror-selectednode {
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.6);
  }

  /* ── Drag handle indicator ── */
  .axon-editor-content .tiptap [data-drag-handle] {
    cursor: grab;
  }

  /* ── Placeholder ─────────────────────────────────── */
  .axon-editor-content .tiptap p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: #9ca3af;
    pointer-events: none;
    height: 0;
    font-style: italic;
  }

  /* ── Clearfix for floated images ─────────────────── */
  .axon-editor-content .tiptap::after {
    content: '';
    display: table;
    clear: both;
  }

  /* ── Dropcursor (violet line when dragging) ───────── */
  .ProseMirror-dropcursor {
    border-color: #8b5cf6 !important;
    border-width: 2px !important;
  }

  /* ── Keyword highlight decorations ────────────────── */
  .axon-keyword-highlight {
    background: linear-gradient(to bottom, rgba(139, 92, 246, 0.08), rgba(139, 92, 246, 0.15));
    border-bottom: 2px solid rgba(139, 92, 246, 0.5);
    border-radius: 2px;
    padding: 0 1px;
    transition: background 0.15s ease, border-color 0.15s ease;
    cursor: pointer;
  }
  .axon-keyword-highlight:hover {
    background: rgba(139, 92, 246, 0.22);
    border-bottom-color: rgba(139, 92, 246, 0.8);
  }
`;
