import type { SummaryBlock } from '@/app/services/summariesApi';

interface BlockFormProps {
  block: SummaryBlock;
  onChange: (field: string, value: unknown) => void;
}

const inputClass =
  'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400';

const variants = [
  { value: 'tip', label: 'Consejo', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'warning', label: 'Advertencia', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'clinical', label: 'Clinico', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'mnemonic', label: 'Mnemotecnia', color: 'bg-violet-100 text-violet-700 border-violet-300' },
  { value: 'exam', label: 'Examen', color: 'bg-red-100 text-red-700 border-red-300' },
] as const;

export default function CalloutForm({ block, onChange }: BlockFormProps) {
  const c = block.content || {};
  const variant = (c.variant as string) || 'tip';

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Variante</label>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <button
              key={v.value}
              type="button"
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                variant === v.value
                  ? v.color
                  : 'bg-gray-50 text-gray-400 border-gray-200'
              }`}
              onClick={() => onChange('variant', v.value)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Titulo</label>
        <input
          type="text"
          className={inputClass}
          value={(c.title as string) ?? ''}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="Titulo del callout"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Contenido</label>
        <textarea
          className={inputClass}
          value={(c.content as string) ?? ''}
          onChange={(e) => onChange('content', e.target.value)}
          placeholder="Contenido del callout..."
        />
      </div>
    </div>
  );
}
