// ============================================================
// Axon — SummaryFormDialog (Create / Edit summary)
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Loader2, FileText } from 'lucide-react';

interface SummaryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    content_markdown: string;
    status: 'draft' | 'published';
  }) => Promise<void>;
  title: string;
  defaultValues?: {
    title: string;
    content_markdown: string;
    status: 'draft' | 'published';
  };
}

export function SummaryFormDialog({
  open,
  onOpenChange,
  onSubmit,
  title: dialogTitle,
  defaultValues,
}: SummaryFormDialogProps) {
  const [formTitle, setFormTitle] = useState(defaultValues?.title || '');
  const [status, setStatus] = useState<'draft' | 'published'>(defaultValues?.status || 'draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens/closes or defaults change
  useEffect(() => {
    if (open) {
      setFormTitle(defaultValues?.title || '');
      setStatus(defaultValues?.status || 'draft');
      setError(null);
    }
  }, [open, defaultValues?.title, defaultValues?.status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setError('El titulo es requerido');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        title: formTitle.trim(),
        content_markdown: defaultValues?.content_markdown || '',
        status,
      });
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {defaultValues ? 'Modifica los campos del resumen' : 'Crea un resumen y luego edita el contenido con el editor visual'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-700 mb-1 block">Titulo *</label>
            <Input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Ej: Introduccion a la Anatomia"
              autoFocus
            />
          </div>

          {!defaultValues && (
            <div className="flex items-start gap-3 p-3 bg-violet-50/50 border border-violet-100 rounded-lg">
              <FileText size={16} className="text-violet-500 mt-0.5 shrink-0" />
              <p className="text-xs text-violet-600">
                Una vez creado, podras editar el contenido con el editor visual (con formato, imagenes y mas) en la pestaña <strong>Editor</strong>.
              </p>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-700 mb-1 block">Estado</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus('draft')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
                  status === 'draft'
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                Borrador
              </button>
              <button
                type="button"
                onClick={() => setStatus('published')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
                  status === 'published'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                Publicado
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {defaultValues ? 'Guardar cambios' : 'Crear resumen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}