import type { SummaryBlock } from '@/app/services/summariesApi';

export default function TwoColumnBlock({ block }: { block: SummaryBlock }) {
  const { columns = [] } = block.content;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {columns.map((col: any, ci: number) => (
        <div key={ci}>
          <h4 className="font-serif text-base font-bold text-teal-900 dark:text-teal-400 mb-2.5 mt-0">
            {col.title}
          </h4>
          <div className="flex flex-col gap-1.5">
            {(col.items || []).map((item: any, i: number) => (
              <div
                key={i}
                className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-200">
                  {item.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {item.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
