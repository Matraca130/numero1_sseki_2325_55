import type { SummaryBlock } from '@/app/services/summariesApi';

interface BlockFormProps {
  block: SummaryBlock;
  onChange: (field: string, value: unknown) => void;
}

const inputClass =
  'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400';

const importanceLevels = [
  { value: 'medium', label: 'Medio', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'high', label: 'Alto', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'critical', label: 'Critico', color: 'bg-red-100 text-red-700 border-red-300' },
] as const;

export default function KeyPointForm({ block, onChange }: BlockFormProps) {
  const c = block.content || {};
  const importance = (c.importance as string) || 'high';

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
        <input
          type="text"
          className={inputClass}
          value={(c.title as string) ?? ''}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="Título del punto clave"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Contenido</label>
        <textarea
          className={`${inputClass} min-h-[80px]`}
          value={(c.content as string) ?? ''}
          onChange={(e) => onChange('content', e.target.value)}
          placeholder="Descripción del punto clave..."
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Importancia</label>
        <div className="flex gap-2">
          {importanceLevels.map((level) => (
            <button
              key={level.value}
              type="button"
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                importance === level.value
                  ? level.color
                  : 'bg-gray-50 text-gray-400 border-gray-200'
              }`}
              onClick={() => onChange('importance', level.value)}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
