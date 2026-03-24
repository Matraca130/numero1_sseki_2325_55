import type { SummaryBlock } from '@/app/services/summariesApi';
import IconByName from './IconByName';

interface ListDetailItem {
  icon?: string;
  label?: string;
  detail?: string;
  severity?: string;
}

const SEVERITY_COLOR: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
};

export default function ListDetailBlock({ block }: { block: SummaryBlock }) {
  const title = block.content?.title as string | undefined;
  const intro = block.content?.intro as string | undefined;
  const items = (block.content?.items ?? []) as ListDetailItem[];

  return (
    <div>
      {title && (
        <h3 className="font-serif text-xl font-bold text-[#1B3B36] dark:text-teal-400 mb-2.5 mt-0">
          {title}
        </h3>
      )}
      {intro && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 leading-[1.6]">
          {intro}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-[10px] border border-gray-200 dark:border-gray-700 items-start"
          >
            <div className="w-8 h-8 rounded-lg bg-[#e8f5f1] dark:bg-teal-950 flex items-center justify-center shrink-0">
              <IconByName name={item.icon} size={16} className="text-[#2a8c7a] dark:text-teal-400" />
            </div>
            <div className="flex-1">
              {item.label && (
                <div className="text-sm font-bold text-[#1B3B36] dark:text-gray-200 mb-0.5">
                  {item.label}
                </div>
              )}
              {item.detail && (
                <div className="text-[13px] text-gray-500 dark:text-gray-400 leading-normal">
                  {item.detail}
                </div>
              )}
            </div>
            {item.severity && SEVERITY_COLOR[item.severity] && (
              <span
                className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                style={{ background: SEVERITY_COLOR[item.severity] }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
