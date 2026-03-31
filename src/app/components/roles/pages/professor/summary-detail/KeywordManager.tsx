/**
 * KeywordManager — Keywords sheet content for SummaryDetailView.
 * Handles keyword list display, create/edit forms, and subtopic expansion.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Edit3, Trash2, Save, X, Loader2,
  RotateCcw, ChevronDown, ChevronUp, Tag,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/app/components/ui/sheet';
import type { SummaryKeyword, Subtopic } from '@/app/services/summariesApi';
import { KW_PRIORITY_CONFIG, PRIORITY_OPTIONS } from './constants';
import { SubtopicManager } from './SubtopicManager';

interface KeywordManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allKeywords: SummaryKeyword[];
  activeKeywords: SummaryKeyword[];
  keywordsLoading: boolean;
  createMutation: any;
  updateMutation: any;
  deleteMutation: any;
  restoreMutation: any;
  // Subtopics
  expandedKeyword: string | null;
  onToggleKeywordExpand: (keywordId: string) => void;
  currentSubtopics: Subtopic[];
  subtopicsLoading: boolean;
  newSubtopicName: string;
  onNewSubtopicNameChange: (name: string) => void;
  onCreateSubtopic: (keywordId: string) => void;
  onDeleteSubtopic: (subtopicId: string, keywordId: string) => void;
  createSubtopicPending: boolean;
  // Delete confirm
  onSetDeletingKeywordId: (id: string | null) => void;
}

export function KeywordManager({
  open, onOpenChange, allKeywords, activeKeywords, keywordsLoading,
  createMutation, updateMutation, deleteMutation, restoreMutation,
  expandedKeyword, onToggleKeywordExpand, currentSubtopics, subtopicsLoading,
  newSubtopicName, onNewSubtopicNameChange, onCreateSubtopic, onDeleteSubtopic,
  createSubtopicPending, onSetDeletingKeywordId,
}: KeywordManagerProps) {
  // Local form state
  const [showNewKeyword, setShowNewKeyword] = useState(false);
  const [newKeywordName, setNewKeywordName] = useState('');
  const [newKeywordDef, setNewKeywordDef] = useState('');
  const [newKeywordPriority, setNewKeywordPriority] = useState<number>(0);
  const [editingKeywordId, setEditingKeywordId] = useState<string | null>(null);
  const [editKwName, setEditKwName] = useState('');
  const [editKwDef, setEditKwDef] = useState('');
  const [editKwPriority, setEditKwPriority] = useState<number>(0);

  const handleCreateKeyword = () => {
    if (!newKeywordName.trim()) return;
    const isDuplicate = activeKeywords.some(
      k => k.name.toLowerCase() === newKeywordName.trim().toLowerCase()
    );
    if (isDuplicate) return;
    createMutation.mutate(
      { name: newKeywordName.trim(), definition: newKeywordDef.trim() || undefined, priority: newKeywordPriority },
      { onSuccess: () => { setNewKeywordName(''); setNewKeywordDef(''); setNewKeywordPriority(0); setShowNewKeyword(false); } },
    );
  };

  const handleUpdateKeyword = (id: string) => {
    if (!editKwName.trim()) return;
    updateMutation.mutate(
      { keywordId: id, data: { name: editKwName.trim(), definition: editKwDef.trim() || undefined, priority: editKwPriority } },
      { onSuccess: () => { setEditingKeywordId(null); } },
    );
  };

  const startEditing = (kw: SummaryKeyword) => {
    setEditingKeywordId(kw.id);
    setEditKwName(kw.name);
    setEditKwDef(kw.definition || '');
    setEditKwPriority(kw.priority);
    setShowNewKeyword(false);
  };

  // Priority selector (shared between create & edit)
  const PrioritySelector = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div>
      <span className="text-[10px] text-gray-500 mb-1.5 block" style={{ fontWeight: 600 }}>Prioridad</span>
      <div className="flex gap-1.5">
        {PRIORITY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] border transition-all ${
              value === opt.value ? opt.active : opt.idle
            } hover:border-gray-300`}
            style={{ fontWeight: value === opt.value ? 600 : 400 }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[460px] sm:max-w-[460px] p-0 flex flex-col h-full overflow-hidden">
        {/* Fixed header */}
        <div className="shrink-0 bg-gradient-to-b from-teal-50/80 to-white px-5 pt-5 pb-3 border-b border-gray-100">
          <SheetHeader className="mb-0">
            <SheetTitle className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center">
                <Tag size={15} className="text-teal-600" />
              </div>
              <div>
                <span className="block text-sm text-gray-900" style={{ fontWeight: 600 }}>Palabras clave</span>
                <span className="text-[10px] text-gray-400" style={{ fontWeight: 400 }}>
                  {activeKeywords.length} activa{activeKeywords.length !== 1 ? 's' : ''}
                  {allKeywords.length > activeKeywords.length && (
                    <> · {allKeywords.length - activeKeywords.length} eliminada{allKeywords.length - activeKeywords.length !== 1 ? 's' : ''}</>
                  )}
                </span>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-3 flex items-start gap-2 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
            <Tag size={12} className="text-teal-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-teal-600/80 leading-relaxed">
              <span style={{ fontWeight: 600 }}>Tip:</span> Selecciona texto en el editor y presiona el boton{' '}
              <span className="inline-flex items-center gap-0.5 bg-[#2a8c7a] text-white px-1.5 py-0 rounded text-[9px]" style={{ fontWeight: 600 }}>
                <Tag size={8} /> Keyword
              </span>{' '}
              que aparece para crear rapidamente.
            </p>
          </div>

          {!keywordsLoading && (
            <button
              onClick={() => { setShowNewKeyword(true); setEditingKeywordId(null); }}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-full border-2 border-dashed border-teal-200 text-teal-600 text-xs hover:bg-teal-50 hover:border-teal-300 transition-all active:scale-[0.98]"
              style={{ fontWeight: 600 }}
            >
              <Plus size={13} /> Nueva keyword
            </button>
          )}
        </div>

        {/* Scrollable keywords list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {keywordsLoading ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl border border-gray-100 p-3.5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-1 h-8 rounded-full" />
                    <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-2.5 w-48" /></div>
                    <Skeleton className="w-6 h-6 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : allKeywords.length === 0 && !showNewKeyword ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                <Tag size={22} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-500 mb-1" style={{ fontWeight: 500 }}>Sin keywords aun</p>
              <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">
                Selecciona texto en el editor o usa el boton de arriba para crear la primera
              </p>
            </div>
          ) : (
            <>
              {/* New keyword form */}
              <AnimatePresence>
                {showNewKeyword && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="rounded-xl border-2 border-teal-200 bg-gradient-to-b from-teal-50/50 to-white p-4 space-y-3 mb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-teal-700" style={{ fontWeight: 600 }}>Nueva keyword</span>
                        <button onClick={() => { setShowNewKeyword(false); setNewKeywordName(''); setNewKeywordDef(''); setNewKeywordPriority(2); }} className="p-1 rounded-md hover:bg-teal-100 text-teal-400 hover:text-teal-600 transition-colors"><X size={14} /></button>
                      </div>
                      <Input value={newKeywordName} onChange={(e) => setNewKeywordName(e.target.value)} placeholder="Nombre de la keyword..." className="bg-white" autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && newKeywordName.trim()) { e.preventDefault(); handleCreateKeyword(); } }} />
                      <Textarea value={newKeywordDef} onChange={(e) => setNewKeywordDef(e.target.value)} placeholder="Definicion breve (opcional)" className="min-h-[52px] bg-white resize-none" />
                      <PrioritySelector value={newKeywordPriority} onChange={setNewKeywordPriority} />
                      <div className="flex justify-end gap-2 pt-1">
                        <Button size="sm" onClick={handleCreateKeyword} disabled={createMutation.isPending || !newKeywordName.trim()} className="bg-[#2a8c7a] hover:bg-[#244e47] text-white px-5 rounded-full">
                          {createMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                          Crear keyword
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Keyword list */}
              {allKeywords.map((kw, idx) => {
                const pc = KW_PRIORITY_CONFIG[kw.priority] || KW_PRIORITY_CONFIG[0];
                return (
                  <motion.div key={kw.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                    className={`rounded-xl border transition-all ${!kw.is_active ? 'border-red-200 bg-red-50/20 opacity-50' : editingKeywordId === kw.id ? 'border-teal-300 bg-teal-50/30 shadow-sm' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm bg-white'} border-l-[3px] ${kw.is_active ? pc.border : 'border-l-red-300'}`}
                  >
                    {editingKeywordId === kw.id ? (
                      <div className="p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-teal-700" style={{ fontWeight: 600 }}>Editando</span>
                          <button onClick={() => setEditingKeywordId(null)} className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={14} /></button>
                        </div>
                        <Input value={editKwName} onChange={(e) => setEditKwName(e.target.value)} placeholder="Nombre" autoFocus className="bg-white" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && editKwName.trim()) { e.preventDefault(); handleUpdateKeyword(kw.id); } }} />
                        <Textarea value={editKwDef} onChange={(e) => setEditKwDef(e.target.value)} placeholder="Definicion (opcional)" className="min-h-[52px] bg-white resize-none" />
                        <PrioritySelector value={editKwPriority} onChange={setEditKwPriority} />
                        <div className="flex justify-end gap-2 pt-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingKeywordId(null)} className="text-gray-500">Cancelar</Button>
                          <Button size="sm" onClick={() => handleUpdateKeyword(kw.id)} disabled={updateMutation.isPending || !editKwName.trim()} className="bg-[#2a8c7a] hover:bg-[#244e47] text-white px-4 rounded-full">
                            {updateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            Guardar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="px-3.5 py-3 flex items-start gap-2.5 group">
                          {kw.is_active && (
                            <button onClick={() => onToggleKeywordExpand(kw.id)} className="mt-0.5 p-0.5 rounded hover:bg-gray-100 text-gray-400 transition-colors shrink-0">
                              {expandedKeyword === kw.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          )}
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => kw.is_active && onToggleKeywordExpand(kw.id)}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{kw.name}</span>
                              {kw.priority > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-50 border border-gray-100 text-gray-500">
                                  <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />{pc.label}
                                </span>
                              )}
                              {!kw.is_active && <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">Eliminada</span>}
                            </div>
                            {kw.definition && <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">{kw.definition}</p>}
                          </div>
                          <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0">
                            {kw.is_active ? (
                              <>
                                <button onClick={() => startEditing(kw)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-teal-600 transition-colors" title="Editar"><Edit3 size={13} /></button>
                                <button onClick={() => onSetDeletingKeywordId(kw.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar"><Trash2 size={13} /></button>
                              </>
                            ) : (
                              <button onClick={() => restoreMutation.mutate(kw.id)} disabled={restoreMutation.isPending} className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors" title="Restaurar">
                                {restoreMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                              </button>
                            )}
                          </div>
                        </div>
                        <AnimatePresence>
                          {expandedKeyword === kw.id && kw.is_active && (
                            <SubtopicManager
                              keywordId={kw.id}
                              subtopics={currentSubtopics}
                              loading={subtopicsLoading}
                              newSubtopicName={newSubtopicName}
                              onNewSubtopicNameChange={onNewSubtopicNameChange}
                              onCreateSubtopic={onCreateSubtopic}
                              onDeleteSubtopic={onDeleteSubtopic}
                              createPending={createSubtopicPending}
                            />
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
