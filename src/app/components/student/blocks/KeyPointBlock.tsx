import { Zap } from 'lucide-react';
import type { SummaryBlock } from '@/app/services/summariesApi';

interface Props {
  block: SummaryBlock;
  isMobile?: boolean;
}

export default function KeyPointBlock({ block, isMobile }: Props) {
  const title = block.content?.title as string | undefined;
  const content = block.content?.content as string | undefined;
  const importance = block.content?.importance as string | undefined;

  return (
    <div className={`bg-teal-900 dark:bg-gray-950 rounded-xl py-5 ${isMobile ? 'px-4' : 'px-6'}`}>
      <div className="flex items-center gap-2 mb-2.5">
        <Zap size={18} className="text-[#3cc9a8]" />
        {title && (
          <span className={`font-serif font-bold text-[#3cc9a8] ${isMobile ? 'text-[15px]' : 'text-[17px]'}`}>
            {title}
          </span>
        )}
        {importance === 'critical' && (
          <span className="text-[11px] bg-red-500 text-white px-2 py-0.5 rounded-[10px] font-semibold uppercase">
            {`CR\u00cdTICO`}
          </span>
        )}
      </div>
      {content && (
        <div className="text-sm leading-[1.7] text-[#d1d5db]">
          {content}
        </div>
      )}
    </div>
  );
}
