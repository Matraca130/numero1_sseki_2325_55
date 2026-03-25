import { Zap } from 'lucide-react';
import type { SummaryBlock, SummaryKeyword } from '@/app/services/summariesApi';
import renderTextWithKeywords from './renderTextWithKeywords';

export default function KeyPointBlock({ block, keywords }: { block: SummaryBlock; keywords?: SummaryKeyword[] }) {
  const title = block.content?.title as string | undefined;
  const content = block.content?.content as string | undefined;
  const importance = block.content?.importance as string | undefined;

  return (
    <div className="bg-[#1B3B36] dark:bg-gray-950 rounded-xl px-6 py-5">
      <div className="flex items-center gap-2 mb-2.5">
        <Zap size={18} className="text-[#3cc9a8]" />
        {title && (
          <span className="font-serif text-[17px] font-bold text-[#3cc9a8]">
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
          {renderTextWithKeywords(content, keywords)}
        </div>
      )}
    </div>
  );
}
