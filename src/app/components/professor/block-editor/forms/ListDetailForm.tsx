import type { SummaryBlock } from '@/app/services/summariesApi';

interface BlockFormProps {
  block: SummaryBlock;
  onChange: (field: string, value: unknown) => void;
}

interface ListItem {
  icon: string;
  label: string;
  detail: string;
  severity?: string;
}

const inputClass =
  'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400';

const validIcons = [
  'Activity', 'Heart', 'Pill', 'Stethoscope', 'Shield', 'FlaskConical',
  'Clock', 'Lightbulb', 'Target', 'AlertCircle', 'Brain', 'Info',
  'AlertTriangle', 'HelpCircle', 'CheckCircle2', 'CircleDot',
] as const;

const ICON_LABELS: Record<string, string> = {
  Activity: 'Actividad', Heart: 'Corazón', Pill: 'Medicamento',
  Stethoscope: 'Estetoscopio', Shield: 'Escudo', FlaskConical: 'Laboratorio',
  Clock: 'Reloj', Lightbulb: 'Idea', Target: 'Objetivo',
  AlertCircle: 'Alerta', Brain: 'Cerebro', Info: 'Información',
  AlertTriangle: 'Advertencia', HelpCircle: 'Ayuda', CheckCircle2: 'Verificado',
  CircleDot: 'Punto',
};

export default function ListDetailForm({ block, onChange }: BlockFormProps) {
  const c = block.content || {};
  const items = (c.items as ListItem[]) || [];

  const updateItem = (idx: number, field: string, value: unknown) => {
    const updated = items.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item,
    );
    onChange('items', updated);
  };

  const addItem = () =>
    onChange('items', [...items, { icon: 'Info', label: '', detail: '' }]);

  const removeItem = (idx: number) =>
    onChange(
      'items',
      items.filter((_, i) => i !== idx),
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
          placeholder="Título de la lista"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Introducción (opcional)
        </label>
        <textarea
          className={`${inputClass} min-h-[80px]`}
          value={(c.intro as string) ?? ''}
          onChange={(e) => onChange('intro', e.target.value)}
          placeholder="Texto introductorio..."
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
                Item {idx + 1}
              </span>
              <button
                type="button"
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
                onClick={() => removeItem(idx)}
              >
                Eliminar
              </button>
            </div>
            <select
              className={inputClass}
              value={item.icon ?? 'Info'}
              onChange={(e) => updateItem(idx, 'icon', e.target.value)}
            >
              {validIcons.map((icon) => (
                <option key={icon} value={icon}>
                  {ICON_LABELS[icon] || icon}
                </option>
              ))}
            </select>
            <input
              type="text"
              className={inputClass}
              value={item.label ?? ''}
              onChange={(e) => updateItem(idx, 'label', e.target.value)}
              placeholder="Etiqueta"
            />
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={item.detail ?? ''}
              onChange={(e) => updateItem(idx, 'detail', e.target.value)}
              placeholder="Detalle..."
            />
            <select
              className={inputClass}
              value={item.severity ?? ''}
              onChange={(e) =>
                updateItem(idx, 'severity', e.target.value || undefined)
              }
            >
              <option value="">Severidad (opcional)</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="w-full py-2 text-sm font-medium text-violet-600 border border-dashed border-violet-300 rounded-lg hover:bg-violet-50 transition-colors"
        onClick={addItem}
      >
        + Agregar item
      </button>
    </div>
  );
}
