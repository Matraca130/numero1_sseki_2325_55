import type { SummaryBlock } from '@/app/services/summariesApi';

interface BlockFormProps {
  block: SummaryBlock;
  onChange: (field: string, value: unknown) => void;
}

const inputClass =
  'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400';

export default function ProseForm({ block, onChange }: BlockFormProps) {
  const c = block.content || {};
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Titulo</label>
        <input
          type="text"
          className={inputClass}
          value={(c.title as string) ?? ''}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="Titulo del bloque"
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
      {/* Image URL (optional) */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Imagen (opcional)</label>
        {(c.image as string) && (
          <div className="rounded-lg overflow-hidden border border-gray-200 mb-2">
            <img
              src={c.image as string}
              alt="Vista previa"
              className="w-full h-auto max-h-40 object-contain bg-gray-50"
            />
          </div>
        )}
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
