// ============================================================
// Axon — StickyNotes · Slot model + persistence
//
// Storage:
//   - Backend `content` field stores a JSON-serialized array of 4
//     `{ title, content }` objects. Legacy formats (plain text or a
//     4-string array) are migrated automatically on first load.
//   - localStorage mirrors the same JSON for instant reads and
//     offline fallback.
//   - The last-opened slot is persisted per summary under
//     `axon:sticky-notes:active:<summaryId>`.
// ============================================================
import { ensureHtml, isHtmlContent, htmlToPlainText, sanitizeNoteHtml } from './noteHtml';

export const STORAGE_PREFIX = 'axon:sticky-notes:';
export const ACTIVE_SLOT_PREFIX = 'axon:sticky-notes:active:';
export const POSITION_STORAGE_KEY = 'axon:sticky-notes:position';
export const OPEN_STORAGE_KEY = 'axon:sticky-notes:open';
export const SLOT_COUNT = 4;
export const DEFAULT_SLOT_LABELS = ['Nota 1', 'Nota 2', 'Nota 3', 'Nota 4'];
export const MAX_TITLE_LENGTH = 40;

export interface Slot {
  title: string;
  content: string;
}

export type Slots = [Slot, Slot, Slot, Slot];
export type SyncStatus = 'idle' | 'saving' | 'saved' | 'offline';

export function emptySlot(): Slot {
  return { title: '', content: '' };
}

export function emptySlots(): Slots {
  return [emptySlot(), emptySlot(), emptySlot(), emptySlot()];
}

export function displayTitle(slot: Slot, index: number): string {
  return slot.title.trim() || DEFAULT_SLOT_LABELS[index];
}

// First non-empty line of a note body, used as preview text in the picker.
export function slotPreview(text: string): string {
  const plain = isHtmlContent(text) ? htmlToPlainText(text) : text;
  const firstLine = plain.split('\n').find((l) => l.trim().length > 0) ?? '';
  return firstLine.trim();
}

/**
 * Parse a persisted content string into a 4-slot tuple.
 * Back-compat:
 *   - Plain-text legacy notes → placed into slot 0 content.
 *   - Array of strings (previous format) → wrapped with empty titles.
 *   - Array of `{title, content}` (current format) → used directly.
 */
export function parseSlots(raw: string | null | undefined): Slots {
  if (!raw) return emptySlots();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const out = emptySlots();
      for (let i = 0; i < SLOT_COUNT; i++) {
        const item = parsed[i];
        if (typeof item === 'string') {
          out[i] = { title: '', content: ensureHtml(item) };
        } else if (item && typeof item === 'object') {
          const rawContent =
            typeof item.content === 'string' ? item.content : '';
          out[i] = {
            title: typeof item.title === 'string' ? item.title : '',
            content: ensureHtml(rawContent),
          };
        }
      }
      return out;
    }
  } catch {
    /* legacy plain text */
  }
  const out = emptySlots();
  out[0] = { title: '', content: ensureHtml(String(raw)) };
  return out;
}

export function serializeSlots(slots: Slots): string {
  // If every slot is entirely empty (no title, no content) we persist an
  // empty string so the clear/delete semantics keep working with the backend.
  if (slots.every((s) => !s.title && !s.content)) return '';
  // Defense in depth: sanitize note bodies before persistence so anything
  // the contentEditable produced (browser-injected wrappers, paste leftovers)
  // is reduced to the allowed <u>/<br> subset.
  const cleaned = slots.map((s) => ({
    title: s.title,
    content: sanitizeNoteHtml(s.content),
  }));
  return JSON.stringify(cleaned);
}

export function readLocalSlots(summaryId: string): Slots {
  try {
    return parseSlots(localStorage.getItem(STORAGE_PREFIX + summaryId));
  } catch {
    return emptySlots();
  }
}

export function writeLocalSlots(summaryId: string, slots: Slots): void {
  try {
    const serialized = serializeSlots(slots);
    if (serialized) {
      localStorage.setItem(STORAGE_PREFIX + summaryId, serialized);
    } else {
      localStorage.removeItem(STORAGE_PREFIX + summaryId);
    }
  } catch {
    /* localStorage not available */
  }
}

export function readActiveSlot(summaryId: string): number | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SLOT_PREFIX + summaryId);
    if (raw === null) return null;
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 0 && n < SLOT_COUNT) return n;
    return null;
  } catch {
    return null;
  }
}

export function writeActiveSlot(summaryId: string, slot: number | null): void {
  try {
    if (slot === null) {
      localStorage.removeItem(ACTIVE_SLOT_PREFIX + summaryId);
    } else {
      localStorage.setItem(ACTIVE_SLOT_PREFIX + summaryId, String(slot));
    }
  } catch {
    /* ignore */
  }
}
