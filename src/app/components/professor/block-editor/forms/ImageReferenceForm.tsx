import type { SummaryBlock } from '@/app/services/summariesApi';

interface BlockFormProps {
  block: SummaryBlock;
  onChange: (field: string, value: unknown) => void;
}

const inputClass =
  'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400';

export default function ImageReferenceForm({ block, onChange }: BlockFormProps) {
  const c = block.content || {};
  const imageUrl = c.image_url as string | undefined;

  return (
    <div className="space-y-3">
      {/* Image preview or placeholder */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Imagen</label>
        {imageUrl ? (
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <img
              src={imageUrl}
              alt={(c.caption as string) || 'Imagen de referencia'}
              className="w-full h-auto max-h-48 object-contain bg-gray-50"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
            <span className="text-xs text-gray-400">
              Sin imagen - usa el boton de upload para agregar
            </span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Descripcion</label>
        <textarea
          className={inputClass}
          value={(c.description as string) ?? ''}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Descripcion de la imagen..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Caption</label>
        <input
          type="text"
          className={inputClass}
          value={(c.caption as string) ?? ''}
          onChange={(e) => onChange('caption', e.target.value)}
          placeholder="Texto debajo de la imagen"
        />
      </div>
    </div>
  );
}
