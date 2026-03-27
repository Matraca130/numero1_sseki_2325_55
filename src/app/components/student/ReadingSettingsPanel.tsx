/**
 * ReadingSettingsPanel — Dropdown panel for reading configuration
 * (font size, line spacing, font family).
 *
 * Persists settings to localStorage per summary via useReadingSettings hook.
 *
 * @owner SM-01 (summaries-frontend-v2)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';

// ── Types & defaults ────────────────────────────────

export interface ReadingSettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
}

export const DEFAULT_READING_SETTINGS: ReadingSettings = {
  fontSize: 16,
  lineHeight: 1.6,
  fontFamily: 'Inter, sans-serif',
};

// ── Persistence hook ────────────────────────────────

const STORAGE_KEY = 'axon-reading-settings';

function loadSettings(): ReadingSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_READING_SETTINGS, ...parsed };
    }
  } catch {
    // ignore corrupt data
  }
  return { ...DEFAULT_READING_SETTINGS };
}

export function useReadingSettings(_summaryId: string) {
  const [settings, setSettings] = useState<ReadingSettings>(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // quota exceeded — silently ignore
    }
  }, [settings]);

  const update = useCallback((next: ReadingSettings) => {
    setSettings(next);
  }, []);

  return { settings, update };
}

// ── Constants ───────────────────────────────────────

const LINE_HEIGHTS = [1.4, 1.6, 1.8, 2.0] as const;

const FONT_FAMILIES = [
  { label: 'Sans', value: 'Inter, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Mono', value: 'JetBrains Mono, monospace' },
] as const;

// ── Component ───────────────────────────────────────

interface ReadingSettingsPanelProps {
  settings: ReadingSettings;
  onChange: (s: ReadingSettings) => void;
  onClose: () => void;
}

export default function ReadingSettingsPanel({
  settings,
  onChange,
  onClose,
}: ReadingSettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Configuração de leitura"
      className="absolute top-full right-0 w-[260px] bg-white rounded-xl shadow-lg border border-gray-200 z-50 p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          Configuração de leitura
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
      </div>

      {/* Font size */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-400 font-semibold uppercase">
            Tamanho da fonte
          </span>
          <span className="text-xs text-gray-500 tabular-nums">
            {settings.fontSize}px
          </span>
        </div>
        <input
          type="range"
          min={13}
          max={22}
          step={1}
          value={settings.fontSize}
          onChange={(e) =>
            onChange({ ...settings, fontSize: Number(e.target.value) })
          }
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: '#14b8a6' }}
        />
      </div>

      {/* Line spacing */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-gray-400 font-semibold uppercase block">
          Espaçamento
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {LINE_HEIGHTS.map((lh) => {
            const active = settings.lineHeight === lh;
            return (
              <button
                key={lh}
                type="button"
                onClick={() => onChange({ ...settings, lineHeight: lh })}
                className={`py-1 rounded-md text-xs font-medium border transition-colors ${
                  active
                    ? 'border-teal-500 bg-teal-50 text-teal-600'
                    : 'border-gray-200 bg-transparent text-gray-500 hover:border-gray-300'
                }`}
              >
                {lh.toFixed(1)}x
              </button>
            );
          })}
        </div>
      </div>

      {/* Font family */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-gray-400 font-semibold uppercase block">
          Fonte
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {FONT_FAMILIES.map((ff) => {
            const active = settings.fontFamily === ff.value;
            return (
              <button
                key={ff.value}
                type="button"
                onClick={() => onChange({ ...settings, fontFamily: ff.value })}
                className={`py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  active
                    ? 'border-teal-500 bg-teal-50 text-teal-600'
                    : 'border-gray-200 bg-transparent text-gray-500 hover:border-gray-300'
                }`}
                style={{ fontFamily: ff.value }}
              >
                {ff.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
