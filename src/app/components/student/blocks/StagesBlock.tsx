import type { SummaryBlock } from '@/app/services/summariesApi';

interface StageItem {
  stage?: number | string;
  title?: string;
  content?: string;
  severity?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  mild: 'bg-emerald-500',
  moderate: 'bg-amber-500',
  critical: 'bg-red-500',
};

const SEVERITY_BORDER: Record<string, string> = {
  mild: 'border-l-emerald-500',
  moderate: 'border-l-amber-500',
  critical: 'border-l-red-500',
};

interface Props {
  block: SummaryBlock;
  isMobile?: boolean;
}

export default function StagesBlock({ block, isMobile }: Props) {
  const title = block.content?.title as string | undefined;
  const items = (block.content?.items ?? []) as StageItem[];

  return (
    <div>
      {title && (
        <h3 className={`font-serif font-bold text-teal-900 dark:text-teal-400 mb-4 mt-0 ${isMobile ? 'text-lg' : 'text-xl'}`}>
          {title}
        </h3>
      )}
      <div className={`relative ${isMobile ? 'pl-7' : 'pl-9'}`}>
        {/* Gradient connector line */}
        {items.length > 1 && (
          <div className={`absolute top-2 bottom-2 w-0.5 bg-gradient-to-b from-teal-600 to-red-500 ${isMobile ? 'left-[11px]' : 'left-[15px]'}`} />
        )}
        {items.map((item, i) => {
          const sevBg = item.severity ? (SEVERITY_COLORS[item.severity] ?? 'bg-teal-600') : 'bg-teal-600';
          const sevBorder = item.severity ? (SEVERITY_BORDER[item.severity] ?? 'border-l-teal-600') : 'border-l-teal-600';

          return (
            <div key={i} className={`relative ${i < items.length - 1 ? 'mb-5' : ''}`}>
              {/* Numbered circle */}
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full text-white text-[11px] font-bold flex items-center justify-center ${sevBg} ${isMobile ? '-left-[26px]' : '-left-[30px]'}`}
              >
                {item.stage}
              </div>
              {/* Stage card */}
              <div
                className={`rounded-[10px] py-3 border border-gray-200 dark:border-gray-700 border-l-[3px] ${sevBorder} bg-white dark:bg-gray-800 ${isMobile ? 'px-3' : 'px-4'}`}
              >
                {item.title && (
                  <div className={`font-bold text-teal-900 dark:text-teal-400 mb-1 ${isMobile ? 'text-sm' : 'text-[15px]'}`}>
                    {item.title}
                  </div>
                )}
                {item.content && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 leading-[1.6]">
                    {item.content}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
