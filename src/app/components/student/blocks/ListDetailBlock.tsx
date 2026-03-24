import type { SummaryBlock } from '@/app/services/summariesApi';
import IconByName from './IconByName';

interface ListDetailItem {
  icon?: string;
  label?: string;
  detail?: string;
  severity?: string;
}

const SEVERITY_BADGE: Record<string, string> = {
  high: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
  medium: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  low: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
};

interface Props {
  block: SummaryBlock;
  isMobile?: boolean;
}

export default function ListDetailBlock({ block, isMobile }: Props) {
  const title = block.content?.title as string | undefined;
  const intro = block.content?.intro as string | undefined;
  const items = (block.content?.items ?? []) as ListDetailItem[];

  return (
    <div>
      {title && (
        <h3 className={`font-serif font-bold text-teal-900 dark:text-teal-400 mb-2.5 mt-0 ${isMobile ? 'text-lg' : 'text-xl'}`}>
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
            className={`flex gap-3 py-3 bg-white dark:bg-gray-800 rounded-[10px] border border-gray-200 dark:border-gray-700 items-start ${isMobile ? 'px-3' : 'px-4'}`}
          >
            <div className={`rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center shrink-0 ${isMobile ? 'w-7 h-7' : 'w-8 h-8'}`}>
              <IconByName name={item.icon} size={isMobile ? 14 : 16} className="text-teal-600 dark:text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              {item.label && (
                <div className="text-sm font-bold text-gray-900 dark:text-gray-200 mb-0.5">
                  {item.label}
                </div>
              )}
              {item.detail && (
                <div className={`text-gray-500 dark:text-gray-400 leading-normal ${isMobile ? 'text-xs' : 'text-[13px]'}`}>
                  {item.detail}
                </div>
              )}
            </div>
            {item.severity && SEVERITY_BADGE[item.severity] && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-[10px] uppercase shrink-0 ${SEVERITY_BADGE[item.severity]}`}
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
