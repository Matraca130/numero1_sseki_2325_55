import type { SummaryBlock } from '@/app/services/summariesApi';
import IconByName from './IconByName';

interface GridItem {
  icon?: string;
  label?: string;
  detail?: string;
}

export default function GridBlock({ block }: { block: SummaryBlock }) {
  const title = block.content?.title as string | undefined;
  const columns = (block.content?.columns ?? 3) as number;
  const items = (block.content?.items ?? []) as GridItem[];
  const gridCols = columns === 2 ? 'grid-cols-2' : 'grid-cols-3';

  if (!items.length) {
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
        <h3 className="font-serif text-xl font-bold text-axon-dark dark:text-teal-400 mb-3 mt-0">
          {title}
        </h3>
      )}
      <div className={`grid ${gridCols} gap-2.5`}>
        {items.map((item, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-[10px] p-3.5 border border-gray-200 dark:border-gray-700 text-center hover:shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-all"
          >
            <div className="flex justify-center mb-1.5">
              <IconByName name={item.icon} size={20} className="text-axon-accent dark:text-teal-400" />
            </div>
            {item.label && (
              <div className="text-sm font-bold text-axon-dark dark:text-gray-200 mt-1.5">
                {item.label}
              </div>
            )}
            {item.detail && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {item.detail}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
