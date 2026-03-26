import type { SummaryBlock } from '@/app/services/summariesApi';

interface BlockFormProps {
  block: SummaryBlock;
  onChange: (field: string, value: unknown) => void;
}

const inputClass =
  'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400';

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
