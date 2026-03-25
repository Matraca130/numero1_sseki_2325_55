import type { SummaryBlock, SummaryKeyword } from '@/app/services/summariesApi';
import renderTextWithKeywords from './renderTextWithKeywords';

interface ColumnItem {
  label?: string;
  detail?: string;
}

interface Column {
  title?: string;
  items?: ColumnItem[];
}

export default function TwoColumnBlock({ block, keywords }: { block: SummaryBlock; keywords?: SummaryKeyword[] }) {
  const columns = (block.content?.columns ?? []) as Column[];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {columns.map((col, ci) => (
        <div
          key={ci}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {col.title && (
            <h4 className="font-serif text-base font-bold text-[#1B3B36] dark:text-teal-400 mb-2.5 mt-0 px-4 pt-3">
              {col.title}
            </h4>
          )}
          <div>
            {(col.items ?? []).map((item, i) => (
              <div
                key={i}
                className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              >
                {item.label && (
                  <div className="text-[13px] font-semibold text-[#1B3B36] dark:text-gray-200">
                    {item.label}
                  </div>
                )}
                {item.detail && (
                  <div className="text-[13px] text-gray-500 dark:text-gray-400">
                    {renderTextWithKeywords(item.detail, keywords)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
