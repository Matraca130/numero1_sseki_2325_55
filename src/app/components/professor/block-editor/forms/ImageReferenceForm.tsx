import { type BlockFormProps, inputClass } from './shared';

export default function ImageReferenceForm({ block, onChange }: BlockFormProps) {
  const c = block.content || {};
  const imageUrl = c.image_url as string | undefined;

  return (
    <div className="space-y-3">
      {/* Image preview */}
      {imageUrl && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Vista previa</label>
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <img
              src={imageUrl}
              alt={(c.caption as string) || 'Imagen de referencia'}
              className="w-full h-auto max-h-48 object-contain bg-gray-50"
            />
          </div>
        </div>
      )}

      {/* Image URL input */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">URL de la imagen</label>
        <input
          type="url"
          className={inputClass}
          value={(c.image_url as string) ?? ''}
          onChange={(e) => onChange('image_url', e.target.value)}
          placeholder="https://ejemplo.com/imagen.jpg"
        />
        <p className="mt-1 text-[10px] text-gray-400">
          Pega la URL de una imagen. Pronto: subir desde el dispositivo.
        </p>
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
        <label className="block text-xs font-medium text-gray-600 mb-1">Pie de imagen</label>
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
