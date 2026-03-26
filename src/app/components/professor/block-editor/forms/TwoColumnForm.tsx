import type { SummaryBlock } from '@/app/services/summariesApi';

interface BlockFormProps {
  block: SummaryBlock;
  onChange: (field: string, value: unknown) => void;
}

interface ColumnItem {
  label: string;
  detail: string;
}

interface Column {
  title: string;
  items: ColumnItem[];
}

const inputClass =
  'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400';

const defaultColumns: Column[] = [
  { title: '', items: [] },
  { title: '', items: [] },
];

export default function TwoColumnForm({ block, onChange }: BlockFormProps) {
  const c = block.content || {};
  const columns = (c.columns as Column[]) || defaultColumns;

  // Ensure we always have 2 columns
  const cols: Column[] =
    columns.length >= 2
      ? columns.slice(0, 2)
      : [...columns, ...defaultColumns].slice(0, 2);

  const updateColumn = (colIdx: number, field: string, value: unknown) => {
    const updated = cols.map((col, i) =>
      i === colIdx ? { ...col, [field]: value } : col,
    );
    onChange('columns', updated);
  };

  const updateColumnItem = (
    colIdx: number,
    itemIdx: number,
    field: string,
    value: unknown,
  ) => {
    const updated = cols.map((col, ci) => {
      if (ci !== colIdx) return col;
      const newItems = col.items.map((item, ii) =>
        ii === itemIdx ? { ...item, [field]: value } : item,
      );
      return { ...col, items: newItems };
    });
    onChange('columns', updated);
  };

  const addColumnItem = (colIdx: number) => {
    const updated = cols.map((col, i) =>
      i === colIdx
        ? { ...col, items: [...col.items, { label: '', detail: '' }] }
        : col,
    );
    onChange('columns', updated);
  };

  const removeColumnItem = (colIdx: number, itemIdx: number) => {
    const updated = cols.map((col, ci) =>
      ci === colIdx
        ? { ...col, items: col.items.filter((_, ii) => ii !== itemIdx) }
        : col,
    );
    onChange('columns', updated);
  };

  return (
    <div className="space-y-4">
      {cols.map((col, colIdx) => (
        <div
          key={colIdx}
          className="border border-gray-200 rounded-lg p-3 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-violet-600">
              Columna {colIdx + 1}
            </span>
          </div>
          <input
            type="text"
            className={inputClass}
            value={col.title ?? ''}
            onChange={(e) => updateColumn(colIdx, 'title', e.target.value)}
            placeholder="Título de la columna"
          />

          <div className="space-y-2">
            {col.items.map((item, itemIdx) => (
              <div
                key={itemIdx}
                className="border border-gray-100 rounded-lg p-2 space-y-1.5 bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-gray-400">
                    Item {itemIdx + 1}
                  </span>
                  <button
                    type="button"
                    className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                    onClick={() => removeColumnItem(colIdx, itemIdx)}
                  >
                    Eliminar
                  </button>
                </div>
                <input
                  type="text"
                  className={inputClass}
                  value={item.label ?? ''}
                  onChange={(e) =>
                    updateColumnItem(colIdx, itemIdx, 'label', e.target.value)
                  }
                  placeholder="Etiqueta"
                />
                <textarea
                  className={`${inputClass} min-h-[60px]`}
                  value={item.detail ?? ''}
                  onChange={(e) =>
                    updateColumnItem(colIdx, itemIdx, 'detail', e.target.value)
                  }
                  placeholder="Detalle..."
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            className="w-full py-1.5 text-xs font-medium text-violet-600 border border-dashed border-violet-300 rounded-lg hover:bg-violet-50 transition-colors"
            onClick={() => addColumnItem(colIdx)}
          >
            + Agregar item
          </button>
        </div>
      ))}
    </div>
  );
}
