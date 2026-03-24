import type { SummaryBlock } from '@/app/services/summariesApi';
import IconByName from './IconByName';

interface GridItem {
  icon?: string;
  label?: string;
  detail?: string;
}

interface Props {
  block: SummaryBlock;
  isMobile?: boolean;
}

export default function GridBlock({ block, isMobile }: Props) {
  const title = block.content?.title as string | undefined;
  const columns = (block.content?.columns ?? 3) as number;
  const items = (block.content?.items ?? []) as GridItem[];

  // On mobile: max 2 cols for 3-col grids, 1 col for 2-col grids with many items
  const gridCols = isMobile
    ? columns >= 3 ? 'grid-cols-2' : 'grid-cols-1'
    : columns === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div>
      {title && (
        <h3 className={`font-serif font-bold text-teal-900 dark:text-teal-400 mb-3 mt-0 ${isMobile ? 'text-lg' : 'text-xl'}`}>
          {title}
        </h3>
      )}
      <div className={`grid ${gridCols} gap-2.5`}>
        {items.map((item, i) => (
          <div
            key={i}
            className={`bg-white dark:bg-gray-800 rounded-[10px] py-3.5 border border-gray-200 dark:border-gray-700 text-center ${isMobile ? 'px-3' : 'px-4'}`}
          >
            <IconByName name={item.icon} size={isMobile ? 18 : 20} className="text-teal-600 dark:text-teal-400 mx-auto" />
            {item.label && (
              <div className={`font-bold text-gray-900 dark:text-gray-200 mt-1.5 ${isMobile ? 'text-xs' : 'text-sm'}`}>
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
