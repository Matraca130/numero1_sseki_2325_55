import { type BlockFormProps, inputClass } from './shared';

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
          className={`${inputClass} min-h-[120px]`}
          value={(c.content as string) ?? ''}
          onChange={(e) => onChange('content', e.target.value)}
          placeholder="Escribe el contenido..."
        />
      </div>
    </div>
  );
}
