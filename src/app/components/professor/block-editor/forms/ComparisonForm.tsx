import { type BlockFormProps, inputClass } from './shared';

export default function ComparisonForm({ block, onChange }: BlockFormProps) {
  const c = block.content || {};
  const headers = (c.headers as string[]) || [];
  const rows = (c.rows as string[][]) || [];
  const highlightColumn = c.highlight_column as number | null | undefined;

  const updateHeader = (idx: number, value: string) => {
    const updated = headers.map((h, i) => (i === idx ? value : h));
    onChange('headers', updated);
  };

  const addColumn = () => {
    const newHeaders = [...headers, ''];
    // Ensure all rows are extended to match new header count, padding any sparse rows
    const updatedRows = rows.map((row) => {
      const paddedRow = Array.from({ length: headers.length }, (_, i) => row[i] ?? '');
      return [...paddedRow, ''];
    });
    onChange('headers', newHeaders);
    onChange('rows', updatedRows);
  };

  const removeColumn = (colIdx: number) => {
    const newHeaders = headers.filter((_, i) => i !== colIdx);
    const newRows = rows.map((row) => row.filter((_, i) => i !== colIdx));
    
    // Ensure all rows have correct length after removal
    const validatedRows = newRows.map((row) =>
      Array.from({ length: newHeaders.length }, (_, i) => row[i] ?? '')
    );
    
    onChange('headers', newHeaders);
    onChange('rows', validatedRows);
    
    // Handle highlight_column: invalidate if it references the removed column or beyond
    if (highlightColumn === colIdx) {
      onChange('highlight_column', null);
    } else if (highlightColumn != null && highlightColumn > colIdx) {
      onChange('highlight_column', highlightColumn - 1);
    } else if (highlightColumn != null && highlightColumn >= newHeaders.length) {
      // If highlight_column is now beyond the valid range, clear it
      onChange('highlight_column', null);
    }
  };

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    const updated = rows.map((row, ri) => {
      if (ri !== rowIdx) return row;
      
      // Ensure row is padded to match headers length
      const paddedRow = Array.from({ length: headers.length }, (_, i) => row[i] ?? '');
      paddedRow[colIdx] = value;
      return paddedRow;
    });
    onChange('rows', updated);
  };

  const addRow = () => {
    // Always create rows with length matching headers, even if headers is empty
    const newRow = Array.from({ length: headers.length }, () => '');
    onChange('rows', [...rows, newRow]);
  };

  const removeRow = (rowIdx: number) => {
    onChange('rows', rows.filter((_, i) => i !== rowIdx));
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Titulo</label>
        <input
          type="text"
          className={inputClass}
          value={(c.title as string) ?? ''}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="Titulo de la comparacion"
        />
      </div>

      {/* Headers */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Encabezados de columna
        </label>
        <div className="space-y-2">
          {headers.map((header, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                className={inputClass}
                value={header}
                onChange={(e) => updateHeader(idx, e.target.value)}
                placeholder={`Columna ${idx + 1}`}
              />
              <button
                type="button"
                className="shrink-0 text-xs text-red-400 hover:text-red-600 transition-colors px-2"
                onClick={() => removeColumn(idx)}
              >
                X
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
          onClick={addColumn}
        >
          + Agregar columna
        </button>
      </div>

      {/* Rows grid */}
      {headers.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Filas</label>
          <div className="space-y-2">
            {rows.map((row, rowIdx) => (
              <div
                key={rowIdx}
                className="flex gap-2 items-start border border-gray-100 rounded-lg p-2 bg-gray-50"
              >
                <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${headers.length}, 1fr)` }}>
                  {headers.map((_, colIdx) => (
                    <input
                      key={colIdx}
                      type="text"
                      className={inputClass}
                      value={row[colIdx] ?? ''}
                      onChange={(e) =>
                        updateCell(rowIdx, colIdx, e.target.value)
                      }
                      placeholder={headers[colIdx] || `Col ${colIdx + 1}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="shrink-0 text-xs text-red-400 hover:text-red-600 transition-colors px-1 pt-2"
                  onClick={() => removeRow(rowIdx)}
                >
                  X
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
            onClick={addRow}
          >
            + Agregar fila
          </button>
        </div>
      )}

      {/* Highlight column */}
      {headers.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Columna destacada (opcional)
          </label>
          <select
            className={inputClass}
            value={highlightColumn != null ? String(highlightColumn) : ''}
            onChange={(e) =>
              onChange(
                'highlight_column',
                e.target.value === '' ? null : Number(e.target.value),
              )
            }
          >
            <option value="">Ninguna</option>
            {headers.map((header, idx) => (
              <option key={idx} value={String(idx)}>
                {header || `Columna ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
