import type { SummaryBlock } from '@/app/services/summariesApi';

interface BlockFormProps {
  block: SummaryBlock;
  onChange: (field: string, value: unknown) => void;
}

interface StageItem {
  stage: number;
  title: string;
  content: string;
  severity?: string;
}

const inputClass =
  'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-600';

export default function StagesForm({ block, onChange }: BlockFormProps) {
  const c = block.content || {};
  const items = (c.items as StageItem[]) || [];

  const updateItem = (idx: number, field: string, value: unknown) => {
    const updated = items.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item,
    );
    onChange('items', updated);
  };

  const addItem = () =>
    onChange('items', [...items, { stage: items.length + 1, title: '', content: '' }]);

  const removeItem = (idx: number) =>
    onChange(
      'items',
      items.filter((_, i) => i !== idx).map((item, i) => ({ ...item, stage: i + 1 })),
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
          placeholder="Título de las etapas"
        />
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-violet-600">
                Etapa {idx + 1}
              </span>
              <button
                type="button"
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
                onClick={() => removeItem(idx)}
              >
                Eliminar
              </button>
            </div>
            <input
              type="text"
              className={inputClass}
              value={item.title ?? ''}
              onChange={(e) => updateItem(idx, 'title', e.target.value)}
              placeholder="Título de la etapa"
            />
            <textarea
              className={`${inputClass} min-h-[60px]`}
              value={item.content ?? ''}
              onChange={(e) => updateItem(idx, 'content', e.target.value)}
              placeholder="Contenido de la etapa..."
            />
            <select
              className={inputClass}
              value={item.severity ?? ''}
              onChange={(e) =>
                updateItem(idx, 'severity', e.target.value || undefined)
              }
            >
              <option value="">Severidad (opcional)</option>
              <option value="mild">Leve</option>
              <option value="moderate">Moderado</option>
              <option value="critical">Grave</option>
            </select>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="w-full py-2 text-sm font-medium text-violet-600 border border-dashed border-violet-300 rounded-lg hover:bg-violet-50 transition-colors"
        onClick={addItem}
      >
        + Agregar etapa
      </button>
    </div>
  );
}
