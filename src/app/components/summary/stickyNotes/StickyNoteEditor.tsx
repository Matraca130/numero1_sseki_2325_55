// ============================================================
// Axon — StickyNotes · Rich-text editor
//
// A small contentEditable wrapper used as a near-drop-in replacement for the
// previous <textarea>. Supports underline (via Ctrl+U or the toolbar button
// in the parent). Bold/italic shortcuts are intentionally swallowed since
// the panel only exposes the underline action.
//
// React + contentEditable interop: we update the DOM imperatively only when
// the `value` prop changes externally (e.g. when the user switches slots),
// so the user's caret position is preserved while typing.
// ============================================================
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { sanitizeNoteHtml } from './noteHtml';

export interface StickyNoteEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const StickyNoteEditor = forwardRef<HTMLDivElement, StickyNoteEditorProps>(
  function StickyNoteEditor(
    { value, onChange, placeholder, className, style },
    forwardedRef,
  ) {
    const localRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(forwardedRef, () => localRef.current as HTMLDivElement);
    // Tracks the last innerHTML we (or the user) committed. Used to avoid
    // re-setting innerHTML on every render, which would clobber the caret.
    const lastValueRef = useRef<string>(value);

    // Security: sanitize before setting innerHTML to prevent XSS from
    // tampered localStorage or backend content reaching the editor.
    useEffect(() => {
      const el = localRef.current;
      if (!el) return;
      if (value !== lastValueRef.current) {
        el.innerHTML = sanitizeNoteHtml(value);
        lastValueRef.current = value;
      }
    }, [value]);

    const handleInput = useCallback(
      (e: React.FormEvent<HTMLDivElement>) => {
        const html = e.currentTarget.innerHTML;
        lastValueRef.current = html;
        onChange(html);
      },
      [onChange],
    );

    // Block bold/italic shortcuts. Underline (Ctrl+U) is the browser default
    // and continues to work — that's exactly what we want.
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (
          (e.metaKey || e.ctrlKey) &&
          (e.key === 'b' || e.key === 'B' || e.key === 'i' || e.key === 'I')
        ) {
          e.preventDefault();
        }
      },
      [],
    );

    // Plain-text paste only — keeps notes free of foreign formatting and
    // means the sanitizer never has to deal with surprise tags.
    const handlePaste = useCallback(
      (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        if (text) document.execCommand('insertText', false, text);
      },
      [],
    );

    // Security: use DOMParser instead of innerHTML for the emptiness check
    // to avoid triggering inline event handlers on untrusted content.
    const isEmpty = useMemo(() => {
      if (!value) return true;
      if (typeof document === 'undefined') return false;
      const doc = new DOMParser().parseFromString(value, 'text/html');
      return (doc.body.textContent ?? '').trim() === '';
    }, [value]);

    return (
      <div className="relative flex flex-1 flex-col">
        <div
          ref={localRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Contenido de la nota"
          spellCheck
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={className}
          style={style}
        />
        {isEmpty && placeholder && (
          <div
            className="pointer-events-none absolute left-4 top-3 text-sm text-amber-700/40"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {placeholder}
          </div>
        )}
      </div>
    );
  },
);
