import type { SummaryBlock } from '@/app/services/summariesApi';

export default function SectionDividerBlock({ block }: { block: SummaryBlock }) {
  const label = block.content?.label as string | undefined;

  return (
    <div className="flex items-center gap-4 py-2" role="separator">
      <div className="flex-1 h-0.5 bg-[#d1f0e7]" />
      {label && (
        <span className="text-[13px] font-semibold text-[#2a8c7a] font-serif whitespace-nowrap">
          {label}
        </span>
      )}
      <div className="flex-1 h-0.5 bg-[#d1f0e7]" />
    </div>
  );
}
