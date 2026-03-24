import type { SummaryBlock } from '@/app/services/summariesApi';

interface ColumnItem {
  label?: string;
  detail?: string;
}

interface Column {
  title?: string;
  items?: ColumnItem[];
}

interface Props {
  block: SummaryBlock;
  isMobile?: boolean;
}

export default function TwoColumnBlock({ block, isMobile }: Props) {
  const columns = (block.content?.columns ?? []) as Column[];

  return (
    <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
      {columns.map((col, ci) => (
        <div key={ci}>
          {col.title && (
            <h4 className={`font-serif font-bold text-teal-900 dark:text-teal-400 mb-2.5 mt-0 ${isMobile ? 'text-sm' : 'text-base'}`}>
              {col.title}
            </h4>
          )}
          <div className="flex flex-col gap-1.5">
            {(col.items ?? []).map((item, i) => (
              <div
                key={i}
                className={`py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${isMobile ? 'px-2.5' : 'px-3'}`}
              >
                {item.label && (
                  <div className={`font-semibold text-gray-900 dark:text-gray-200 ${isMobile ? 'text-xs' : 'text-[13px]'}`}>
                    {item.label}
                  </div>
                )}
                {item.detail && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {item.detail}
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
