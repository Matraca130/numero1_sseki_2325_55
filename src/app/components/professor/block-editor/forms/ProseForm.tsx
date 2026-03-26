import { useState, useRef, useCallback } from 'react';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE, ANON_KEY, getAccessToken } from '@/app/lib/api';
import type { SummaryBlock } from '@/app/services/summariesApi';

// ── Constants ─────────────────────────────────────────────
const STORAGE_BASE =
  'https://xdnciktarvxyhkrokbng.supabase.co/storage/v1/object/public/axon-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface BlockFormProps {
  block: SummaryBlock;
  onChange: (field: string, value: unknown) => void;
}

const inputClass =
  'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400';

export default function ProseForm({ block, onChange }: BlockFormProps) {
  const c = block.content || {};

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Validate ────────────────────────────────────────────
  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Formato no soportado. Usa JPG, PNG o WebP.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Archivo muy grande (max 5 MB).';
    }
    return null;
  };

  // ── Upload ──────────────────────────────────────────────
  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setUploadError(validationError);
        return;
      }

      setUploadError(null);
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'summaries');

        // Use raw fetch — apiCall forces Content-Type: application/json
        // which breaks FormData (browser must set multipart boundary).
        const headers: Record<string, string> = {
          Authorization: `Bearer ${ANON_KEY}`,
        };
        const token = getAccessToken();
        if (token) {
          headers['X-Access-Token'] = token;
        }

        const res = await fetch(`${API_BASE}/storage/upload`, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!res.ok) {
          const text = await res.text();
          let msg = `Error ${res.status}`;
          try {
            const json: unknown = JSON.parse(text);
            if (
              typeof json === 'object' &&
              json !== null &&
              typeof (json as Record<string, unknown>).error === 'string'
            ) {
              msg = (json as Record<string, string>).error;
            }
          } catch {
            /* non-JSON response */
          }
          throw new Error(msg);
        }

        const json: unknown = await res.json();
        let path: string | undefined;

        if (typeof json === 'object' && json !== null) {
          const obj = json as Record<string, unknown>;
          if (
            typeof obj.data === 'object' &&
            obj.data !== null &&
            typeof (obj.data as Record<string, unknown>).path === 'string'
          ) {
            path = (obj.data as Record<string, string>).path;
          } else if (typeof obj.path === 'string') {
            path = obj.path;
          }
        }

        if (!path) {
          throw new Error('Upload succeeded but no path returned');
        }

        const publicUrl = `${STORAGE_BASE}/${path}`;
        onChange('image', publicUrl);
        toast.success('Imagen subida');
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Error al subir imagen';
        setUploadError(message);
        toast.error(message);
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  // ── File input handler ──────────────────────────────────
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void uploadFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [uploadFile],
  );

  // ── Drag & drop ─────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void uploadFile(file);
    },
    [uploadFile],
  );

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
        <input
          type="text"
          className={inputClass}
          value={(c.title as string) ?? ''}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="Título del bloque"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Contenido</label>
        <textarea
          className={`${inputClass} min-h-[160px]`}
          value={(c.content as string) ?? ''}
          onChange={(e) => onChange('content', e.target.value)}
          placeholder="Escribe el contenido..."
        />
      </div>

      {/* ── Image (optional) ── */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Imagen (opcional)
        </label>

        {/* Preview */}
        {(c.image as string) && (
          <div className="rounded-lg overflow-hidden border border-gray-200 mb-2">
            <img
              src={c.image as string}
              alt="Vista previa"
              className="w-full h-auto max-h-40 object-contain bg-gray-50"
            />
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Dropzone */}
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
            dragOver
              ? 'border-violet-400 bg-violet-50/30'
              : 'border-gray-300 hover:border-violet-400 hover:bg-violet-50/10'
          } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin text-violet-500" />
          ) : (
            <Upload
              size={20}
              className={dragOver ? 'text-violet-500' : 'text-gray-400'}
            />
          )}
          <p className="text-xs text-gray-500">
            {uploading
              ? 'Subiendo...'
              : dragOver
                ? 'Suelta aqui'
                : 'Arrastra una imagen o haz click'}
          </p>
          {!uploading && (
            <p className="text-[10px] text-gray-400">
              JPG, PNG o WebP (max 5 MB)
            </p>
          )}
        </div>

        {/* Upload error */}
        {uploadError && (
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
            <AlertCircle size={12} />
            {uploadError}
          </div>
        )}

        {/* Separator */}
        <p className="text-[10px] text-gray-400 text-center my-1.5">
          o pega una URL abajo
        </p>

        {/* URL input */}
        <input
          type="url"
          className={inputClass}
          value={(c.image as string) ?? ''}
          onChange={(e) => onChange('image', e.target.value)}
          placeholder="https://ejemplo.com/imagen.jpg"
        />
        <p className="mt-1 text-[10px] text-gray-400">
          URL de una imagen para acompanar el texto
        </p>
      </div>
    </div>
  );
}
