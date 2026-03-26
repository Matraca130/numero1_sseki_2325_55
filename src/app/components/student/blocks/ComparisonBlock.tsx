import type { SummaryBlock } from '@/app/services/summariesApi';

export default function ComparisonBlock({ block }: { block: SummaryBlock }) {
  const title = block.content?.title as string | undefined;
  const headers = (block.content?.headers ?? []) as string[];
  const rows = (block.content?.rows ?? []) as string[][];
  const highlight_column = block.content?.highlight_column as number | undefined;

  if (!rows.length) {
    return (
      <div>
        {title && (
          <h3 className="font-serif text-xl font-bold text-[#1B3B36] dark:text-teal-400 mb-3 mt-0">
            {title}
          </h3>
        )}
        <p className="text-sm text-gray-400 italic py-4 text-center">Sin datos</p>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <h3 className="font-serif text-xl font-bold text-[#1B3B36] dark:text-teal-400 mb-3 mt-0">
          {title}
        </h3>
      )}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className={`px-3.5 py-2.5 bg-[#1B3B36] dark:bg-gray-950 text-[13px] font-semibold text-left ${
                    i === highlight_column ? 'text-[#3cc9a8]' : 'text-white'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-[#F0F2F5] dark:bg-gray-800/50' : ''}>
                {row.map((cell, ci) => {
                  const isHighlight = ci === highlight_column;
                  const isFirstCol = ci === 0;
                  let cellClass = 'px-3.5 py-2.5 border-b border-b-gray-200 dark:border-b-gray-700';

                  if (isHighlight) {
                    cellClass += ' text-[#2a8c7a] dark:text-teal-400 font-semibold bg-[#e8f5f1]/60 dark:bg-teal-950/40';
                  } else if (isFirstCol) {
                    cellClass += ' font-semibold text-[#1B3B36] dark:text-gray-200';
                  } else {
                    cellClass += ' text-gray-500 dark:text-gray-400';
                  }

                  return (
                    <td key={ci} className={cellClass}>
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
