// ============================================================
// Axon — KeywordFormDialog (Professor: create/edit keyword modal)
//
// Extracted from KeywordsManager.tsx (Issue #29).
// Self-contained modal with name, definition, and priority
// selector. Manages its own form state internally, reset on
// open via useEffect.
// ============================================================
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { priorityLabels } from './keyword-manager-helpers';
import type { SummaryKeyword } from '@/app/services/summariesApi';

// ── Types ─────────────────────────────────────────────────
export interface KeywordFormData {
  name: string;
  definition?: string;
  priority: number;
}

interface KeywordFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, the dialog is in "edit" mode; otherwise "create". */
  editingKeyword: SummaryKeyword | null;
  /** Called with form data when the user clicks Save/Create. */
  onSave: (data: KeywordFormData) => void;
  /** Whether a mutation is in progress. */
  saving: boolean;
}

// ── Component ─────────────────────────────────────────────
export function KeywordFormDialog({
  open,
  onOpenChange,
  editingKeyword,
  onSave,
  saving,
}: KeywordFormDialogProps) {
  const [formName, setFormName] = useState('');
  const [formDefinition, setFormDefinition] = useState('');
  const [formPriority, setFormPriority] = useState<number>(2);

  // Reset form when dialog opens or editingKeyword changes
  useEffect(() => {
    if (open) {
      if (editingKeyword) {
        setFormName(editingKeyword.name);
        setFormDefinition(editingKeyword.definition || '');
        setFormPriority(editingKeyword.priority ?? 2);
      } else {
        setFormName('');
        setFormDefinition('');
        setFormPriority(2);
      }
    }
  }, [open, editingKeyword]);

  const handleSubmit = () => {
    if (!formName.trim()) return;
    onSave({
      name: formName.trim(),
      definition: formDefinition.trim() || undefined,
      priority: formPriority,
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-full max-w-md mx-4"
          >
            <h3 className="text-sm text-gray-800 mb-4">
              {editingKeyword ? 'Editar Keyword' : 'Nuevo Keyword'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Nombre *</label>
                <Input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Nombre del keyword"
                  className="mt-1 h-8 text-xs"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Definicion</label>
                <Textarea
                  value={formDefinition}
                  onChange={e => setFormDefinition(e.target.value)}
                  placeholder="Definicion o descripcion (opcional)"
                  className="mt-1 text-xs min-h-[60px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Prioridad</label>
                <div className="flex items-center gap-2 mt-1">
                  {[1, 2, 3].map(p => {
                    const cfg = priorityLabels[p];
                    return (
                      <button
                        key={p}
                        onClick={() => setFormPriority(p)}
                        className={clsx(
                          "flex-1 text-xs py-1.5 rounded-lg border transition-all",
                          formPriority === p
                            ? "border-violet-400 bg-violet-50 text-violet-700"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        )}
                      >
                        {cfg.label} ({p})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={saving || !formName.trim()}
                className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
              >
                {saving ? (
                  <Loader2 size={12} className="animate-spin mr-1" />
                ) : (
                  <Save size={12} className="mr-1" />
                )}
                {editingKeyword ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
