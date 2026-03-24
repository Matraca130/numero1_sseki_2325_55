import { Zap } from 'lucide-react';
import type { SummaryBlock } from '@/app/services/summariesApi';

export default function KeyPointBlock({ block }: { block: SummaryBlock }) {
  const { title, content, importance } = block.content;

  return (
    <div className="bg-teal-900 dark:bg-gray-950 rounded-xl px-6 py-5">
      <div className="flex items-center gap-2 mb-2.5">
        <Zap size={18} className="text-[#3cc9a8]" />
        <span className="font-serif text-[17px] font-bold text-[#3cc9a8]">
          {title}
        </span>
        {importance === 'critical' && (
          <span className="text-[11px] bg-red-500 text-white px-2 py-0.5 rounded-[10px] font-semibold">
            CRÍTICO
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
