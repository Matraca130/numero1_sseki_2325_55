/**
 * FlashcardBulkImport — Main component.
 * 3 tabs: Paste Text | Upload CSV/JSON | Download Templates.
 * Uses BulkPreviewTable for editable preview.
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as flashcardApi from '@/app/services/flashcardApi';
import type { Keyword } from '@/app/types/platform';
import { BulkPreviewTable } from '../BulkPreviewTable';
import type { BulkRow } from '../BulkPreviewTable';
import {
  X, Upload,
  AlertTriangle, Loader2, Check, ClipboardPaste,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Subtopic } from '@/app/types/flashcard-manager';
import { type SepType, detectSeparator, parseText, parseCsv, parseJson } from './parsers';
import { PasteTab, UploadTab, TemplateTab } from './ImportTabs';
import { Download } from 'lucide-react';

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

export function FlashcardBulkImport({
  isOpen, summaryId, keywords, subtopicsMap,
  loadSubtopicsForKeyword, onClose, onImported,
}: FlashcardBulkImportProps) {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'template'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [separator, setSeparator] = useState<SepType>('|');
  const [autoDetected, setAutoDetected] = useState(false);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Auto-detect separator on paste ──────────────────────
  const handlePasteChange = useCallback((text: string) => {
    setPasteText(text);
    if (text.length > 10 && !autoDetected) {
      setSeparator(detectSeparator(text));
      setAutoDetected(true);
    }
  }, [autoDetected]);

  useEffect(() => {
    if (!pasteText) setAutoDetected(false);
  }, [pasteText]);

  const pasteLineCount = useMemo(() => {
    if (!pasteText.trim()) return 0;
    return pasteText.trim().split('\n').filter(l => l.trim()).length;
  }, [pasteText]);

  const handlePreviewPaste = useCallback(() => {
    setRows(parseText(pasteText, separator, keywords));
    setShowPreview(true);
  }, [pasteText, separator, keywords]);

  // ── Handle file upload ──────────────────────────────────
  const handleFileUpload = useCallback(async (file: File) => {
    const text = await file.text();
    const ext = file.name.split('.').pop()?.toLowerCase();
    const parsed = ext === 'json' ? parseJson(text, keywords) : parseCsv(text, keywords);

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
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleFileUpload]);

  // ── Row management ──────────────────────────────────────
  const updateRow = useCallback((id: string, updates: Partial<BulkRow>) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...updates };
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
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                <Upload size={16} className="text-teal-600" />
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

          {/* Tabs */}
          {!showPreview && (
            <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-teal-100 text-teal-700 border border-teal-200'
                      : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {showPreview ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <button onClick={() => setShowPreview(false)} className="text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors">
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
                  rows={rows} keywords={keywords} subtopicsMap={subtopicsMap}
                  onUpdateRow={updateRow} onDeleteRow={deleteRow}
                  onToggleSelect={toggleSelect} onSelectAll={selectAll}
                  onDeselectAll={deselectAll} onBulkKeyword={bulkSetKeyword}
                  onBulkSubtopic={bulkSetSubtopic}
                  loadSubtopicsForKeyword={loadSubtopicsForKeyword}
                />

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
                {activeTab === 'paste' && (
                  <PasteTab
                    pasteText={pasteText} separator={separator}
                    autoDetected={autoDetected} pasteLineCount={pasteLineCount}
                    onPasteChange={handlePasteChange}
                    onSeparatorChange={(sep) => { setSeparator(sep); setAutoDetected(true); }}
                    onPreview={handlePreviewPaste}
                  />
                )}
                {activeTab === 'upload' && (
                  <UploadTab fileInputRef={fileInputRef} onDrop={handleDrop} onFileSelect={handleFileSelect} />
                )}
                {activeTab === 'template' && <TemplateTab />}
              </>
            )}
          </div>

          {/* Footer */}
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
                      className="h-full bg-teal-500 rounded-full transition-all duration-300"
                      style={{ width: `${(importProgress / importTotal) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{importProgress}/{importTotal}</span>
                  <Loader2 size={14} className="animate-spin text-purple-500" />
                </div>
              ) : (
                <button
                  onClick={handleImport}
                  disabled={!canImport}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2a8c7a] text-white text-sm font-semibold hover:bg-[#244e47] disabled:opacity-50 transition-all shadow-sm shadow-teal-200"
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
