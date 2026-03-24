import type { SummaryBlock } from '@/app/services/summariesApi';
import IconByName from './IconByName';

const SEVERITY_BADGE: Record<string, string> = {
  high: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-600',
  low: 'bg-green-50 text-green-600',
};

export default function ListDetailBlock({ block }: { block: SummaryBlock }) {
  const { title, intro, items = [] } = block.content;

  return (
    <div>
      {title && (
        <h3 className="font-serif text-xl font-bold text-teal-900 dark:text-teal-400 mb-2 mt-0">
          {title}
        </h3>
      )}
      {intro && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 leading-[1.6]">
          {intro}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {items.map((item: any, i: number) => (
          <div
            key={i}
            className="flex gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-[10px] border border-gray-200 dark:border-gray-700 items-start"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center shrink-0">
              <IconByName name={item.icon} size={16} className="text-teal-600 dark:text-teal-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-gray-900 dark:text-gray-200 mb-0.5">
                {item.label}
              </div>
              <div className="text-[13px] text-gray-500 dark:text-gray-400 leading-normal">
                {item.detail}
              </div>
            </div>
            {item.severity && SEVERITY_BADGE[item.severity] && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-[10px] ${SEVERITY_BADGE[item.severity]}`}
              >
                {item.severity}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
