// ============================================================
// Axon — StickyNotes · Picker grid (2x2)
//
// Renders the four note slots as an editable grid. Each slot shows a title
// input (in-place rename) and a preview button that opens the slot in the
// editor. Purely presentational — all state lives in the parent panel.
// ============================================================
import { Pencil } from 'lucide-react';
import {
  DEFAULT_SLOT_LABELS,
  MAX_TITLE_LENGTH,
  displayTitle,
  slotPreview,
  type Slots,
} from './slots';

export interface StickyNotesPickerProps {
  slots: Slots;
  onTitleChange: (index: number, rawTitle: string) => void;
  onOpenSlot: (index: number) => void;
}

export function StickyNotesPicker({
  slots,
  onTitleChange,
  onOpenSlot,
}: StickyNotesPickerProps) {
  return (
    <div
      className="grid grid-cols-2 gap-2 p-3"
      style={{ minHeight: 220 }}
      role="list"
      aria-label="Elegir nota"
    >
      {slots.map((slot, i) => {
        const preview = slotPreview(slot.content);
        const label = displayTitle(slot, i);
        return (
          <div
            key={i}
            className="group relative flex flex-col items-stretch gap-1 rounded-xl border border-amber-200/80 bg-amber-100/40 px-3 py-2 transition hover:bg-amber-100 hover:shadow-sm focus-within:ring-2 focus-within:ring-amber-400/60"
            style={{ minHeight: 96 }}
            role="listitem"
          >
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={slot.title}
                onChange={(e) => onTitleChange(i, e.target.value)}
                placeholder={DEFAULT_SLOT_LABELS[i]}
                maxLength={MAX_TITLE_LENGTH}
                aria-label={`Nombre de ${DEFAULT_SLOT_LABELS[i]}`}
                title="Cambiar nombre"
                className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold text-amber-800 placeholder:text-amber-700/50 focus:outline-none focus:ring-1 focus:ring-amber-400/60 rounded px-1 -mx-1"
                style={{ fontFamily: 'Georgia, serif' }}
              />
              <Pencil
                size={10}
                className="text-amber-700/40 group-hover:text-amber-700/80 shrink-0"
                aria-hidden
              />
            </div>
            <button
              type="button"
              onClick={() => onOpenSlot(i)}
              className="flex-1 text-left focus:outline-none"
              aria-label={`Abrir ${label}${preview ? `: ${preview}` : ' (vacía)'}`}
            >
              <span
                className="line-clamp-3 text-[11px] leading-snug text-amber-900/80"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {preview || (
                  <span className="italic text-amber-700/50">
                    Vacía — tocá para escribir
                  </span>
                )}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
