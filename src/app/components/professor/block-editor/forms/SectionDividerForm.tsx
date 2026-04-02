import { type BlockFormProps, inputClass } from './shared';

export default function SectionDividerForm({ block, onChange }: BlockFormProps) {
  const c = block.content || {};
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Etiqueta</label>
        <input
          type="text"
          className={inputClass}
          value={(c.label as string) ?? ''}
          onChange={(e) => onChange('label', e.target.value)}
          placeholder="Etiqueta del separador (opcional)"
        />
      </div>
    </div>
  );
}
