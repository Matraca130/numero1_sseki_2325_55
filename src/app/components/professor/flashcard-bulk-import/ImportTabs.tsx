/**
 * Tab content components for FlashcardBulkImport.
 * PasteTab, UploadTab, and TemplateTab.
 */

import React from 'react';
import {
  Upload, FileText, Download, ClipboardPaste,
  ChevronRight,
} from 'lucide-react';
import type { SepType } from './parsers';
import { downloadCsvTemplate, downloadJsonTemplate } from './templates';

// ── Paste Tab ────────────────────────────────────────────

interface PasteTabProps {
  pasteText: string;
  separator: SepType;
  autoDetected: boolean;
  pasteLineCount: number;
  onPasteChange: (text: string) => void;
  onSeparatorChange: (sep: SepType) => void;
  onPreview: () => void;
}

export function PasteTab({
  pasteText, separator, autoDetected, pasteLineCount,
  onPasteChange, onSeparatorChange, onPreview,
}: PasteTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Pega tus flashcards
          </label>
          {pasteLineCount > 0 && (
            <span className="text-xs text-teal-600 font-medium">
              {pasteLineCount} card{pasteLineCount !== 1 ? 's' : ''} detectada{pasteLineCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <textarea
          value={pasteText}
          onChange={(e) => onPasteChange(e.target.value)}
          placeholder={`Mitocondria | Organelo que produce energia (ATP)\nRibosoma | Estructura que sintetiza proteinas\nNucleo | Contiene el ADN y controla funciones celulares\n\nFormato: Frente ${separator} Reverso ${separator} Keyword (opcional)`}
          rows={10}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all resize-none font-mono text-gray-700 placeholder:text-gray-300"
        />
      </div>

      {/* Separator selector */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
          Separador:
        </span>
        <div className="flex gap-1.5">
          {([
            { v: '|' as SepType, label: '| Pipe' },
            { v: '\t' as SepType, label: 'Tab' },
            { v: ';' as SepType, label: '; Semicolon' },
          ]).map(s => (
            <button
              key={s.v}
              onClick={() => onSeparatorChange(s.v)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                separator === s.v
                  ? 'bg-teal-100 text-teal-700 border border-teal-200'
                  : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {autoDetected && (
          <span className="text-[10px] text-emerald-500 font-medium">Auto-detectado</span>
        )}
      </div>

      <button
        onClick={onPreview}
        disabled={pasteLineCount === 0}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2a8c7a] text-white text-sm font-semibold hover:bg-[#244e47] disabled:opacity-50 transition-all self-end"
      >
        Previsualizar
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

// ── Upload Tab ───────────────────────────────────────────

interface UploadTabProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UploadTab({ fileInputRef, onDrop, onFileSelect }: UploadTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:border-teal-300 hover:bg-teal-50/30 transition-all cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
          <FileText size={24} className="text-teal-400" />
        </div>
        <p className="text-sm text-gray-700 font-medium mb-1">
          Arrastra un archivo aqui o haz click para seleccionar
        </p>
        <p className="text-xs text-gray-400">
          Formatos soportados: CSV, JSON
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json,.tsv"
        onChange={onFileSelect}
        className="hidden"
      />

      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
        <p className="font-medium text-gray-700">Formato esperado:</p>
        <p><span className="font-mono text-teal-600">CSV:</span> Headers: front, back, keyword_name (opcional)</p>
        <p><span className="font-mono text-teal-600">JSON:</span> Array de objetos con front, back, keyword_name (opcional)</p>
      </div>
    </div>
  );
}

// ── Template Tab ─────────────────────────────────────────

export function TemplateTab() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        Descarga un template, llenalo con tus flashcards, y luego subelo en la pestana "Subir archivo".
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={downloadCsvTemplate}
          className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-teal-200 hover:bg-teal-50/30 transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <FileText size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 group-hover:text-teal-700 transition-colors">Template CSV</p>
            <p className="text-xs text-gray-400">Excel, Google Sheets compatible</p>
          </div>
          <Download size={14} className="text-gray-300 group-hover:text-teal-400 ml-auto transition-colors" />
        </button>

        <button
          onClick={downloadJsonTemplate}
          className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-teal-200 hover:bg-teal-50/30 transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
            <FileText size={18} className="text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 group-hover:text-teal-700 transition-colors">Template JSON</p>
            <p className="text-xs text-gray-400">Para desarrolladores y scripts</p>
          </div>
          <Download size={14} className="text-gray-300 group-hover:text-teal-400 ml-auto transition-colors" />
        </button>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-2">
        <p className="font-medium text-gray-700">Columnas:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li><span className="font-mono text-teal-600">front</span> — La pregunta o concepto (requerido)</li>
          <li><span className="font-mono text-teal-600">back</span> — La respuesta o explicacion (requerido)</li>
          <li><span className="font-mono text-teal-600">keyword_name</span> — Nombre del keyword para asociar (opcional, se matchea automaticamente)</li>
        </ul>
      </div>
    </div>
  );
}
