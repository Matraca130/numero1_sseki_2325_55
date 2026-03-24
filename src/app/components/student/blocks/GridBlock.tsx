import type { SummaryBlock } from '@/app/services/summariesApi';
import IconByName from './IconByName';

export default function GridBlock({ block }: { block: SummaryBlock }) {
  const { title, columns = 3, items = [] } = block.content;
  const gridCols = columns === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div>
      {title && (
        <h3 className="font-serif text-xl font-bold text-teal-900 dark:text-teal-400 mb-3 mt-0">
          {title}
        </h3>
      )}
      <div className={`grid ${gridCols} gap-2.5`}>
        {items.map((item: any, i: number) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-[10px] px-4 py-3.5 border border-gray-200 dark:border-gray-700 text-center"
          >
            <IconByName name={item.icon} size={20} className="text-teal-600 dark:text-teal-400 mx-auto" />
            <div className="text-sm font-bold text-gray-900 dark:text-gray-200 mt-1.5">
              {item.label}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {item.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
