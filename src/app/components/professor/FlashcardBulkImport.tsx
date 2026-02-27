// ============================================================
// Axon — FlashcardBulkImport (Professor Bulk Import Modal)
//
// 3 tabs: Paste Text | Upload CSV/JSON | Download Templates
// Uses BulkPreviewTable for editable preview.
// Imports by POSTing each flashcard individually (no /bulk endpoint).
//
// Backend: POST /flashcards { summary_id, keyword_id, front, back, source }
// ============================================================
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiCall, ensureGeneralKeyword } from '@/app/lib/api';
import * as flashcardApi from '@/app/services/flashcardApi';
import type { Keyword } from '@/app/types/platform';
import { BulkPreviewTable } from './BulkPreviewTable';
import type { BulkRow } from './BulkPreviewTable';
import {
  X, Upload, FileText, Download, ClipboardPaste,
  AlertCircle, Loader2, Check, ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Subtopic type ─────────────────────────────────────────

interface Subtopic {
  id: string;
  keyword_id: string;
  name: string;
  order_index: number;
  is_active?: boolean;
  deleted_at?: string | null;
}

// ── Props ─────────────────────────────────────────────────

interface FlashcardBulkImportProps {
  isOpen: boolean;
  summaryId: string;
  keywords: Keyword[];
  subtopicsMap: Map<string, Subtopic[]>;
  loadSubtopicsForKeyword: (keywordId: string) => Promise<void>;
  onClose: () => void;
  onImported: () => void;
}

// ── Helpers ───────────────────────────────────────────────

let _tempId = 0;
function tempId(): string {
  return `bulk_${Date.now()}_${++_tempId}`;
}

type SepType = '|' | '\t' | ';';

function detectSeparator(text: string): SepType {
  const lines = text.trim().split('\n').slice(0, 5); // sample first 5 lines
  const counts = { '|': 0, '\t': 0, ';': 0 };
  for (const line of lines) {
    if (line.includes('|')) counts['|']++;
    if (line.includes('\t')) counts['\t']++;
    if (line.includes(';')) counts[';']++;
  }
  if (counts['\t'] >= counts['|'] && counts['\t'] >= counts[';'] && counts['\t'] > 0) return '\t';
  if (counts[';'] > counts['|'] && counts[';'] > 0) return ';';
  return '|';
}

function parseText(text: string, sep: SepType, keywords: Keyword[]): BulkRow[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  return lines.map(line => {
    const parts = line.split(sep).map(s => s.trim());
    const front = parts[0] || '';
    const back = parts[1] || '';
    const keywordHint = parts[2] || '';

    // Try to match keyword by name (fuzzy)
    let keywordId = '';
    if (keywordHint) {
      const lower = keywordHint.toLowerCase();
      const match = keywords.find(
        k => k.term.toLowerCase() === lower ||
             k.term.toLowerCase().includes(lower) ||
             lower.includes(k.term.toLowerCase())
      );
      if (match) keywordId = match.id;
    }

    const hasContent = front.length > 0 && back.length > 0;
    return {
      id: tempId(),
      front,
      back,
      keywordId,
      subtopicId: '',
      selected: false,
      status: !hasContent ? 'error' as const : !keywordId ? 'no_keyword' as const : 'ok' as const,
      error: !hasContent ? 'Frente y reverso requeridos' : undefined,
    };
  });
}

function parseCsv(content: string, keywords: Keyword[]): BulkRow[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header
  const headerLine = lines[0];
  const sep = headerLine.includes('\t') ? '\t' : headerLine.includes(';') ? ';' : ',';
  const headers = headerLine.split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

  const frontIdx = headers.findIndex(h => h === 'front' || h === 'frente' || h === 'pregunta');
  const backIdx = headers.findIndex(h => h === 'back' || h === 'reverso' || h === 'respuesta');
  const kwIdx = headers.findIndex(h => h === 'keyword' || h === 'keyword_name' || h === 'palabra_clave');

  if (frontIdx === -1 || backIdx === -1) return [];

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const parts = line.split(sep).map(s => s.trim().replace(/^["']|["']$/g, ''));
    const front = parts[frontIdx] || '';
    const back = parts[backIdx] || '';
    const keywordHint = kwIdx >= 0 ? (parts[kwIdx] || '') : '';

    let keywordId = '';
    if (keywordHint) {
      const lower = keywordHint.toLowerCase();
      const match = keywords.find(
        k => k.term.toLowerCase() === lower ||
             k.term.toLowerCase().includes(lower)
      );
      if (match) keywordId = match.id;
    }

    const hasContent = front.length > 0 && back.length > 0;
    return {
      id: tempId(),
      front,
      back,
      keywordId,
      subtopicId: '',
      selected: false,
      status: !hasContent ? 'error' as const : !keywordId ? 'no_keyword' as const : 'ok' as const,
      error: !hasContent ? 'Frente y reverso requeridos' : undefined,
    };
  });
}

function parseJson(content: string, keywords: Keyword[]): BulkRow[] {
  try {
    const data = JSON.parse(content);
    const items = Array.isArray(data) ? data : data.flashcards || data.cards || data.items || [];
    return items.map((item: any) => {
      const front = String(item.front || item.frente || item.question || item.pregunta || '');
      const back = String(item.back || item.reverso || item.answer || item.respuesta || '');
      const keywordHint = String(item.keyword || item.keyword_name || item.palabra_clave || '');

      let keywordId = '';
      if (keywordHint) {
        const lower = keywordHint.toLowerCase();
        const match = keywords.find(
          k => k.term.toLowerCase() === lower ||
               k.term.toLowerCase().includes(lower)
        );
        if (match) keywordId = match.id;
      }

      const hasContent = front.length > 0 && back.length > 0;
      return {
        id: tempId(),
        front,
        back,
        keywordId,
        subtopicId: '',
        selected: false,
        status: !hasContent ? 'error' as const : !keywordId ? 'no_keyword' as const : 'ok' as const,
        error: !hasContent ? 'Frente y reverso requeridos' : undefined,
      };
    });
  } catch {
    return [];
  }
}

// ── Template Generators ───────────────────────────────────

function downloadCsvTemplate() {
  const csv = `front,back,keyword_name\n"Que es la mitocondria?","Organelo que produce energia (ATP) mediante respiracion celular","Mitocondria"\n"Que es un ribosoma?","Estructura que sintetiza proteinas a partir del ARN mensajero","Ribosoma"\n"Funcion del nucleo","Contiene el ADN y controla las funciones celulares","Nucleo"`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flashcards_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJsonTemplate() {
  const data = [
    { front: "Que es la mitocondria?", back: "Organelo que produce energia (ATP) mediante respiracion celular", keyword_name: "Mitocondria" },
    { front: "Que es un ribosoma?", back: "Estructura que sintetiza proteinas a partir del ARN mensajero", keyword_name: "Ribosoma" },
    { front: "Funcion del nucleo", back: "Contiene el ADN y controla las funciones celulares", keyword_name: "Nucleo" },
  ];
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flashcards_template.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ────────────────────────────────────────

export function FlashcardBulkImport({
  isOpen,
  summaryId,
  keywords,
  subtopicsMap,
  loadSubtopicsForKeyword,
  onClose,
  onImported,
}: FlashcardBulkImportProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'template'>('paste');

  // Paste state
  const [pasteText, setPasteText] = useState('');
  const [separator, setSeparator] = useState<SepType>('|');
  const [autoDetected, setAutoDetected] = useState(false);

  // Preview state
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Auto-detect separator on paste ──────────────────────
  const handlePasteChange = useCallback((text: string) => {
    setPasteText(text);
    if (text.length > 10 && !autoDetected) {
      const detected = detectSeparator(text);
      setSeparator(detected);
      setAutoDetected(true);
    }
  }, [autoDetected]);

  // Reset auto-detection when clearing
  useEffect(() => {
    if (!pasteText) setAutoDetected(false);
  }, [pasteText]);

  // ── Live card count from paste ──────────────────────────
  const pasteLineCount = useMemo(() => {
    if (!pasteText.trim()) return 0;
    return pasteText.trim().split('\n').filter(l => l.trim()).length;
  }, [pasteText]);

  // ── Parse paste text into preview ───────────────────────
  const handlePreviewPaste = useCallback(() => {
    const parsed = parseText(pasteText, separator, keywords);
    setRows(parsed);
    setShowPreview(true);
  }, [pasteText, separator, keywords]);

  // ── Handle file upload ──────────────────────────────────
  const handleFileUpload = useCallback(async (file: File) => {
    const text = await file.text();
    const ext = file.name.split('.').pop()?.toLowerCase();

    let parsed: BulkRow[] = [];
    if (ext === 'json') {
      parsed = parseJson(text, keywords);
    } else {
      // CSV or TSV
      parsed = parseCsv(text, keywords);
    }

    if (parsed.length === 0) {
      toast.error('No se pudieron parsear flashcards del archivo. Verifica el formato.');
      return;
    }

    setRows(parsed);
    setShowPreview(true);
    toast.success(`${parsed.length} flashcard${parsed.length !== 1 ? 's' : ''} detectada${parsed.length !== 1 ? 's' : ''}`);
  }, [keywords]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleFileUpload]);

  // ── Row management ──────────────────────────────────────
  const updateRow = useCallback((id: string, updates: Partial<BulkRow>) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...updates };
      // Recalculate status
      if (!updated.front || !updated.back) {
        updated.status = 'error';
        updated.error = 'Frente y reverso requeridos';
      } else if (!updated.keywordId) {
        updated.status = 'no_keyword';
        updated.error = undefined;
      } else {
        updated.status = 'ok';
        updated.error = undefined;
      }
      return updated;
    }));
  }, []);

  const deleteRow = useCallback((id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
  }, []);

  const selectAll = useCallback(() => {
    setRows(prev => prev.map(r => ({ ...r, selected: true })));
  }, []);

  const deselectAll = useCallback(() => {
    setRows(prev => prev.map(r => ({ ...r, selected: false })));
  }, []);

  const bulkSetKeyword = useCallback((keywordId: string) => {
    setRows(prev => prev.map(r => {
      if (!r.selected) return r;
      const updated = { ...r, keywordId, subtopicId: '' };
      updated.status = (updated.front && updated.back) ? 'ok' : 'error';
      return updated;
    }));
    if (keywordId) loadSubtopicsForKeyword(keywordId);
  }, [loadSubtopicsForKeyword]);

  const bulkSetSubtopic = useCallback((subtopicId: string) => {
    setRows(prev => prev.map(r => r.selected ? { ...r, subtopicId } : r));
  }, []);

  // ── Import logic ────────────────────────────────────────
  const importableRows = useMemo(() => rows.filter(r => r.status === 'ok'), [rows]);
  const canImport = importableRows.length > 0;

  const handleImport = useCallback(async () => {
    if (!canImport || importing) return;

    const toImport = importableRows;
    setImporting(true);
    setImportProgress(0);
    setImportTotal(toImport.length);
    setImportErrors([]);

    if (toImport.length > 50) {
      // Show warning but proceed
    }

    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < toImport.length; i++) {
      const row = toImport[i];
      try {
        await flashcardApi.createFlashcard({
          summary_id: summaryId,
          keyword_id: row.keywordId,
          subtopic_id: row.subtopicId || null,
          front: row.front,
          back: row.back,
          source: 'manual',
        });
        successCount++;
      } catch (err: any) {
        errors.push(`#${i + 1}: ${err.message || 'Error desconocido'}`);
        // Mark row as error
        setRows(prev => prev.map(r =>
          r.id === row.id ? { ...r, status: 'error' as const, error: err.message } : r
        ));
      }
      setImportProgress(i + 1);
    }

    setImporting(false);
    setImportErrors(errors);

    if (errors.length === 0) {
      toast.success(`${successCount} flashcard${successCount !== 1 ? 's' : ''} creada${successCount !== 1 ? 's' : ''}`);
      onImported();
      onClose();
    } else {
      toast.error(`${errors.length} error${errors.length !== 1 ? 'es' : ''} al importar. ${successCount} exitosa${successCount !== 1 ? 's' : ''}.`);
    }
  }, [canImport, importing, importableRows, summaryId, onImported, onClose]);

  // ── Reset on close ──────────────────────────────────────
  const handleClose = useCallback(() => {
    if (importing) return;
    setPasteText('');
    setRows([]);
    setShowPreview(false);
    setImportErrors([]);
    setAutoDetected(false);
    onClose();
  }, [importing, onClose]);

  if (!isOpen) return null;

  // ── Tab content ─────────────────────────────────────────

  const tabs = [
    { id: 'paste' as const, label: 'Pegar texto', icon: ClipboardPaste },
    { id: 'upload' as const, label: 'Subir archivo', icon: Upload },
    { id: 'template' as const, label: 'Templates', icon: Download },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget && !importing) handleClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col"
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                <Upload size={16} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Importar en lote</h3>
                <p className="text-xs text-gray-400">Agrega multiples flashcards de una vez</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={importing}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-all disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Tabs ── */}
          {!showPreview && (
            <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {/* PREVIEW MODE */}
            {showPreview ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium transition-colors"
                  >
                    ← Volver a importar
                  </button>
                  <h4 className="text-sm font-bold text-gray-700">Vista previa</h4>
                  <div className="w-20" />
                </div>

                {rows.length > 50 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                    <AlertTriangle size={14} />
                    {rows.length} flashcards — la importacion puede tardar unos segundos
                  </div>
                )}

                <BulkPreviewTable
                  rows={rows}
                  keywords={keywords}
                  subtopicsMap={subtopicsMap}
                  onUpdateRow={updateRow}
                  onDeleteRow={deleteRow}
                  onToggleSelect={toggleSelect}
                  onSelectAll={selectAll}
                  onDeselectAll={deselectAll}
                  onBulkKeyword={bulkSetKeyword}
                  onBulkSubtopic={bulkSetSubtopic}
                  loadSubtopicsForKeyword={loadSubtopicsForKeyword}
                />

                {/* Import errors */}
                {importErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-red-700 mb-1">Errores de importacion:</p>
                    <ul className="space-y-0.5">
                      {importErrors.map((err, i) => (
                        <li key={i} className="text-xs text-red-600">{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* TAB 1: PASTE */}
                {activeTab === 'paste' && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          Pega tus flashcards
                        </label>
                        {pasteLineCount > 0 && (
                          <span className="text-xs text-purple-600 font-medium">
                            {pasteLineCount} card{pasteLineCount !== 1 ? 's' : ''} detectada{pasteLineCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <textarea
                        value={pasteText}
                        onChange={(e) => handlePasteChange(e.target.value)}
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
                            onClick={() => { setSeparator(s.v); setAutoDetected(true); }}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                              separator === s.v
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
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
                      onClick={handlePreviewPaste}
                      disabled={pasteLineCount === 0}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition-all self-end"
                    >
                      Previsualizar
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}

                {/* TAB 2: UPLOAD */}
                {activeTab === 'upload' && (
                  <div className="flex flex-col gap-4">
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:border-purple-300 hover:bg-purple-50/30 transition-all cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                        <FileText size={24} className="text-purple-400" />
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
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
                      <p className="font-medium text-gray-700">Formato esperado:</p>
                      <p><span className="font-mono text-purple-600">CSV:</span> Headers: front, back, keyword_name (opcional)</p>
                      <p><span className="font-mono text-purple-600">JSON:</span> Array de objetos con front, back, keyword_name (opcional)</p>
                    </div>
                  </div>
                )}

                {/* TAB 3: TEMPLATES */}
                {activeTab === 'template' && (
                  <div className="flex flex-col gap-4">
                    <p className="text-sm text-gray-600">
                      Descarga un template, llenalo con tus flashcards, y luego subelo en la pestana "Subir archivo".
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* CSV template */}
                      <button
                        onClick={downloadCsvTemplate}
                        className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-purple-200 hover:bg-purple-50/30 transition-all text-left group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                          <FileText size={18} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800 group-hover:text-purple-700 transition-colors">Template CSV</p>
                          <p className="text-xs text-gray-400">Excel, Google Sheets compatible</p>
                        </div>
                        <Download size={14} className="text-gray-300 group-hover:text-purple-400 ml-auto transition-colors" />
                      </button>

                      {/* JSON template */}
                      <button
                        onClick={downloadJsonTemplate}
                        className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-purple-200 hover:bg-purple-50/30 transition-all text-left group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <FileText size={18} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800 group-hover:text-purple-700 transition-colors">Template JSON</p>
                          <p className="text-xs text-gray-400">Para desarrolladores y scripts</p>
                        </div>
                        <Download size={14} className="text-gray-300 group-hover:text-purple-400 ml-auto transition-colors" />
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-2">
                      <p className="font-medium text-gray-700">Columnas:</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li><span className="font-mono text-purple-600">front</span> — La pregunta o concepto (requerido)</li>
                        <li><span className="font-mono text-purple-600">back</span> — La respuesta o explicacion (requerido)</li>
                        <li><span className="font-mono text-purple-600">keyword_name</span> — Nombre del keyword para asociar (opcional, se matchea automaticamente)</li>
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Footer (import button) ── */}
          {showPreview && (
            <div className="shrink-0 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {rows.filter(r => r.status === 'no_keyword').length > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle size={12} />
                    Asigna keyword a todas las flashcards para importar
                  </span>
                )}
              </div>

              {importing ? (
                <div className="flex items-center gap-3">
                  <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all duration-300"
                      style={{ width: `${(importProgress / importTotal) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {importProgress}/{importTotal}
                  </span>
                  <Loader2 size={14} className="animate-spin text-purple-500" />
                </div>
              ) : (
                <button
                  onClick={handleImport}
                  disabled={!canImport}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition-all shadow-sm shadow-purple-200"
                >
                  <Check size={14} />
                  Importar {importableRows.length} flashcard{importableRows.length !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default FlashcardBulkImport;
