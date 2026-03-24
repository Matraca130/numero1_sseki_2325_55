import type { SummaryBlock } from '@/app/services/summariesApi';

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

export default function StagesBlock({ block }: { block: SummaryBlock }) {
  const { title, items = [] } = block.content;

  return (
    <div>
      {title && (
        <h3 className="font-serif text-xl font-bold text-teal-900 dark:text-teal-400 mb-4 mt-0">
          {title}
        </h3>
      )}
      <div className="relative pl-9">
        {/* Gradient connector line */}
        {items.length > 1 && (
          <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-teal-600 to-red-500" />
        )}
        {items.map((item: any, i: number) => {
          const sevBg = item.severity ? (SEVERITY_COLORS[item.severity] || 'bg-teal-600') : 'bg-teal-600';
          const sevBorder = item.severity ? (SEVERITY_BORDER[item.severity] || 'border-l-teal-600') : 'border-l-teal-600';

          return (
            <div key={i} className={`relative ${i < items.length - 1 ? 'mb-5' : ''}`}>
              {/* Numbered circle */}
              <div
                className={`absolute -left-[30px] top-0.5 w-5 h-5 rounded-full text-white text-[11px] font-bold flex items-center justify-center ${sevBg}`}
              >
                {item.stage}
              </div>
              {/* Stage card */}
              <div
                className={`rounded-[10px] px-4 py-3 border border-gray-200 dark:border-gray-700 border-l-[3px] ${sevBorder} bg-white dark:bg-gray-800`}
              >
                <div className="font-bold text-[15px] text-teal-900 dark:text-teal-400 mb-1">
                  {item.title}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 leading-[1.6]">
                  {item.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
