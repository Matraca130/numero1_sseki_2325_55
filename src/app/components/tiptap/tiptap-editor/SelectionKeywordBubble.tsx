/**
 * SelectionKeywordBubble — Floating bubble on text selection.
 * Shows "Keyword" button or "Ya es keyword" indicator.
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { Tag, Check } from 'lucide-react';

interface SelectionKeywordBubbleProps {
  editor: Editor;
  scrollContainer: HTMLDivElement | null;
  onCreateKeyword: (text: string, rect: DOMRect) => void;
  existingKeywordNames?: string[];
}

export function SelectionKeywordBubble({
  editor, scrollContainer, onCreateKeyword, existingKeywordNames,
}: SelectionKeywordBubbleProps) {
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');

  const updateBubble = useCallback(() => {
    const { from, to } = editor.state.selection;
    if (from === to) {
      setBubblePos(null);
      setSelectedText('');
      return;
    }
    const text = editor.state.doc.textBetween(from, to, ' ').trim();
    if (!text || text.length < 2 || text.length > 100) {
      setBubblePos(null);
      setSelectedText('');
      return;
    }

    const domSel = window.getSelection();
    if (!domSel || domSel.isCollapsed) {
      setBubblePos(null);
      return;
    }

    const contentEl = document.querySelector('.axon-editor-content');
    if (!contentEl) return;

    const range = domSel.getRangeAt(0);
    const rangeRect = range.getBoundingClientRect();
    const contentRect = contentEl.getBoundingClientRect();

    setSelectedText(text);
    setBubblePos({
      top: rangeRect.top - contentRect.top - 36,
      left: rangeRect.left - contentRect.left + rangeRect.width / 2,
    });
  }, [editor, existingKeywordNames]);

  useEffect(() => {
    let blurTimer: ReturnType<typeof setTimeout> | null = null;

    const handleBlur = () => {
      blurTimer = setTimeout(() => {
        if (!editor.isFocused) {
          setBubblePos(null);
          setSelectedText('');
        }
      }, 200);
    };

    editor.on('selectionUpdate', updateBubble);
    editor.on('blur', handleBlur);
    return () => {
      editor.off('selectionUpdate', updateBubble);
      editor.off('blur', handleBlur);
      if (blurTimer) clearTimeout(blurTimer);
    };
  }, [editor, updateBubble]);

  useEffect(() => {
    if (!scrollContainer || !bubblePos) return;
    const handler = () => updateBubble();
    scrollContainer.addEventListener('scroll', handler, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handler);
  }, [scrollContainer, bubblePos, updateBubble]);

  if (!bubblePos || !selectedText) return null;

  const isExisting = !!(existingKeywordNames && existingKeywordNames.some(
    kn => kn.toLowerCase() === selectedText.toLowerCase()
  ));

  return (
    <div
      className="absolute z-30 -translate-x-1/2"
      style={{ top: Math.max(4, bubblePos.top), left: bubblePos.left }}
    >
      {isExisting ? (
        <div
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 text-[11px] whitespace-nowrap cursor-default"
          style={{ fontWeight: 600 }}
          title="Esta palabra ya es keyword"
        >
          <Check size={11} />
          Ya es keyword
        </div>
      ) : (
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            const domSel = window.getSelection();
            if (domSel && !domSel.isCollapsed) {
              const range = domSel.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              onCreateKeyword(selectedText, rect);
            }
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2a8c7a] text-white shadow-lg shadow-[#2a8c7a]/25 text-[11px] hover:bg-[#244e47] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          style={{ fontWeight: 600 }}
          title="Crear keyword desde seleccion"
        >
          <Tag size={11} />
          Keyword
        </button>
      )}
    </div>
  );
}
