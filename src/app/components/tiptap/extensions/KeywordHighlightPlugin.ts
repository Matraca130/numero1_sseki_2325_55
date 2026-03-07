// ============================================================
// Axon — KeywordHighlightPlugin (TipTap Extension)
//
// ProseMirror plugin that adds decorations (visual-only, no doc
// mutation) to highlight text that matches existing keywords.
// Uses case-insensitive matching.
//
// Keywords are stored in a module-level mutable ref so the
// plugin always reads the latest list, regardless of TipTap's
// internal extension lifecycle.
// ============================================================
import { Extension } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const keywordPluginKey = new PluginKey('keywordHighlight');

// ── Module-level mutable store ────────────────────────────
let _currentKeywords: string[] = [];

/** Call this to update the keywords list, then dispatch a refresh. */
export function setKeywordList(keywords: string[]) {
  _currentKeywords = keywords;
}

// ── Decoration builder (compat — no lookbehind) ───────────
function buildDecorations(doc: any): DecorationSet {
  const keywords = _currentKeywords;
  if (!keywords.length) return DecorationSet.empty;

  // Sort by length descending so longer keywords match first
  const sorted = [...keywords].sort((a, b) => b.length - a.length);
  const decorations: Decoration[] = [];

  doc.descendants((node: any, pos: number) => {
    if (!node.isText || !node.text) return;

    const text = node.text;
    const textLower = text.toLowerCase();

    for (const kw of sorted) {
      const kwLower = kw.toLowerCase();
      let startIdx = 0;

      while (true) {
        const idx = textLower.indexOf(kwLower, startIdx);
        if (idx === -1) break;

        const endIdx = idx + kwLower.length;

        // Word-boundary check
        const charBefore = idx > 0 ? text[idx - 1] : '';
        const charAfter = endIdx < text.length ? text[endIdx] : '';
        const boundaryChars = /[\s.,;:!?"""''()[\]{}\/\-—–]/;
        const okBefore = idx === 0 || boundaryChars.test(charBefore);
        const okAfter = endIdx === text.length || boundaryChars.test(charAfter);

        if (okBefore && okAfter) {
          decorations.push(
            Decoration.inline(pos + idx, pos + endIdx, {
              class: 'axon-keyword-highlight',
              'data-keyword': kwLower,
            }),
          );
        }

        startIdx = endIdx;
      }
    }
  });

  return DecorationSet.create(doc, decorations);
}

// ── TipTap Extension ──────────────────────────────────────
export const KeywordHighlightPlugin = Extension.create({
  name: 'keywordHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: keywordPluginKey,
        state: {
          init(_, { doc }) {
            return buildDecorations(doc);
          },
          apply(tr, oldDecoSet) {
            // Rebuild on doc change OR when we signal via meta
            if (tr.docChanged || tr.getMeta(keywordPluginKey)) {
              return buildDecorations(tr.doc);
            }
            return oldDecoSet.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return keywordPluginKey.getState(state);
          },
        },
      }),
    ];
  },
});

// ── Helper: force refresh decorations ─────────────────────
export function refreshKeywordDecorations(editor: any) {
  if (!editor || editor.isDestroyed) return;
  const { tr } = editor.state;
  tr.setMeta(keywordPluginKey, true);
  editor.view.dispatch(tr);
}
