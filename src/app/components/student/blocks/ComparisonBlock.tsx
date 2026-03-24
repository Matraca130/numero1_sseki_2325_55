import type { SummaryBlock } from '@/app/services/summariesApi';

export default function ComparisonBlock({ block }: { block: SummaryBlock }) {
  const { title, headers = [], rows = [], highlight_column } = block.content;

  return (
    <div>
      {title && (
        <h3 className="font-serif text-xl font-bold text-teal-900 dark:text-teal-400 mb-3 mt-0">
          {title}
        </h3>
      )}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {headers.map((h: string, i: number) => (
                <th
                  key={i}
                  className={`px-3.5 py-2.5 bg-teal-900 dark:bg-gray-950 text-xs font-bold text-left border-b-2 border-b-gray-200 dark:border-b-gray-700 ${
                    i === highlight_column ? 'text-[#3cc9a8]' : 'text-[#d1d5db]'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: string[], ri: number) => (
              <tr key={ri}>
                {row.map((cell: string, ci: number) => (
                  <td
                    key={ci}
                    className={`px-3.5 py-2.5 border-b border-b-gray-200 dark:border-b-gray-700 ${
                      ci === highlight_column
                        ? 'text-teal-600 dark:text-teal-400 font-semibold bg-teal-50/40 dark:bg-teal-950/40'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
