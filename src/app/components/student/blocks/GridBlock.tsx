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

  return (
    <div>
      {title && (
        <h3 className="font-serif text-xl font-bold text-[#1B3B36] mb-3 mt-0">
          {title}
        </h3>
      )}
      <div className={`grid ${gridCols} gap-2.5`}>
        {items.map((item, i) => (
          <div
            key={i}
            className="bg-white rounded-[10px] p-3.5 border border-gray-200 flex items-start gap-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-[#e8f5f1] flex items-center justify-center shrink-0">
              <IconByName name={item.icon} size={16} className="text-[#2a8c7a]" />
            </div>
            <div className="min-w-0">
              {item.label && (
                <div className="text-[13px] font-bold text-[#1B3B36]">
                  {item.label}
                </div>
              )}
              {item.detail && (
                <div className="text-xs text-gray-500 mt-0.5">
                  {item.detail}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
