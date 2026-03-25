import { Tag } from 'lucide-react';
import type { SummaryKeyword } from '@/app/services/summariesApi';

interface KeywordChipProps {
  keyword: SummaryKeyword;
  onClick?: (keywordId: string) => void;
}

export default function KeywordChip({ keyword, onClick }: KeywordChipProps) {
  return (
    <span
      role="button"
      tabIndex={0}
      title={keyword.definition || keyword.name}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#e8f5f1] text-[#1B3B36] border border-[#d1f0e7] hover:bg-[#d1f0e7] cursor-pointer transition-colors"
      onClick={() => onClick?.(keyword.id)}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick?.(keyword.id); }}
    >
      <Tag size={10} className="shrink-0" />
      {keyword.name}
    </span>
  );
}
