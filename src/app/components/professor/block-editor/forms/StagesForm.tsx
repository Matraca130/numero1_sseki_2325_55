import { useEffect, useRef, useState } from 'react';
import { type BlockFormProps, inputClass } from './shared';

interface StageItem {
  stage: number;
  title: string;
  content: string;
  severity?: string;
}

const newId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function StagesForm({ block, onChange }: BlockFormProps) {
  const c = block.content || {};
  const items = (c.items as StageItem[]) || [];

  // Parallel local id array for stable React keys. The `stage` field is a
  // position number reassigned on every removal — it's NOT an identity, so it
  // can't be used as a key. We keep ids in component state instead of
  // embedding them in the persisted item shape (preserves backend contract).
  const [itemIds, setItemIds] = useState<string[]>(() =>
    items.map(() => newId()),
  );
  const lastSeenLength = useRef(items.length);
  useEffect(() => {
    if (items.length !== lastSeenLength.current) {
      setItemIds((prev) => {
        if (prev.length === items.length) return prev;
        if (prev.length < items.length) {
          return [
            ...prev,
            ...Array.from({ length: items.length - prev.length }, () => newId()),
          ];
        }
        return prev.slice(0, items.length);
      });
      lastSeenLength.current = items.length;
    }
  }, [items.length]);

  const updateItem = (idx: number, field: string, value: unknown) => {
    const updated = items.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item,
    );
    onChange('items', updated);
  };

  const addItem = () => {
    setItemIds((prev) => [...prev, newId()]);
    lastSeenLength.current = items.length + 1;
    onChange('items', [...items, { stage: items.length + 1, title: '', content: '' }]);
  };

  const removeItem = (idx: number) => {
    setItemIds((prev) => prev.filter((_, i) => i !== idx));
    lastSeenLength.current = items.length - 1;
    onChange(
      'items',
      items.filter((_, i) => i !== idx).map((item, i) => ({ ...item, stage: i + 1 })),
    );
  };

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
            key={itemIds[idx] ?? `fallback-${idx}-${items.length}`}
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
              className={`${inputClass} min-h-[80px]`}
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
