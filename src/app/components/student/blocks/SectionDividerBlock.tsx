import type { SummaryBlock } from '@/app/services/summariesApi';

export default function SectionDividerBlock({ block }: { block: SummaryBlock }) {
  const { label } = block.content;

  return (
    <div className="flex items-center gap-4 py-2" role="separator">
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      {label && (
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">
          {label}
        </span>
      )}
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}
