import type { SummaryBlock } from '@/app/services/summariesApi';

interface Props {
  block: SummaryBlock;
  isMobile?: boolean;
}

export default function ComparisonBlock({ block, isMobile }: Props) {
  const title = block.content?.title as string | undefined;
  const headers = (block.content?.headers ?? []) as string[];
  const rows = (block.content?.rows ?? []) as string[][];
  const highlight_column = block.content?.highlight_column as number | undefined;

  return (
    <div>
      {title && (
        <h3 className={`font-serif font-bold text-teal-900 dark:text-teal-400 mb-3 mt-0 ${isMobile ? 'text-lg' : 'text-xl'}`}>
          {title}
        </h3>
      )}
      {/* Scroll hint on mobile */}
      <div className={`overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 ${isMobile ? '-mx-1' : ''}`}>
        <table className={`w-full border-collapse ${isMobile ? 'text-xs' : 'text-[13px]'}`}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className={`py-2.5 bg-teal-900 dark:bg-gray-950 text-xs font-bold text-left border-b-2 border-b-teal-600 ${
                    isMobile ? 'px-2.5' : 'px-3.5'
                  } ${
                    i === highlight_column ? 'text-[#3cc9a8]' : 'text-[#d1d5db]'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800/50' : ''}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`py-2.5 border-b border-b-gray-200 dark:border-b-gray-700 ${
                      isMobile ? 'px-2.5' : 'px-3.5'
                    } ${
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
