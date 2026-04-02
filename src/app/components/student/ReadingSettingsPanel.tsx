/**
 * ReadingSettingsPanel — Dropdown panel for reading configuration
 * (font size, line spacing, font family).
 *
 * Persists settings globally to localStorage via useReadingSettings hook.
 *
 * @owner SM-01 (summaries-frontend-v2)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';

// ── Types & defaults ────────────────────────────────

export interface ReadingSettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  focusMode: boolean;
}

export const DEFAULT_READING_SETTINGS: ReadingSettings = {
  fontSize: 16,
  lineHeight: 1.6,
  fontFamily: 'Inter, sans-serif',
  focusMode: false,
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

export function useReadingSettings(_summaryId?: string) {
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
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
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
      aria-label="Configuración de lectura"
      className="absolute top-full right-0 w-[260px] bg-white rounded-xl shadow-lg border border-gray-200 z-50 p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          Configuración de lectura
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </div>

      {/* Font size */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 font-semibold uppercase" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.6875rem)' }}>
            Tamaño de fuente
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
        <span className="text-gray-400 font-semibold uppercase block" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.6875rem)' }}>
          Espaciado
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
        <span className="text-gray-400 font-semibold uppercase block" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.6875rem)' }}>
          Fuente
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

      {/* Divider */}
      <div className="h-px bg-gray-100" />

      {/* Focus mode */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {settings.focusMode ? (
            <EyeOff size={14} className="text-teal-500" />
          ) : (
            <Eye size={14} className="text-gray-400" />
          )}
          <span className="text-gray-400 font-semibold uppercase" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.6875rem)' }}>
            Modo enfocado
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.focusMode}
          onClick={() => onChange({ ...settings, focusMode: !settings.focusMode })}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            settings.focusMode ? 'bg-teal-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              settings.focusMode ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
