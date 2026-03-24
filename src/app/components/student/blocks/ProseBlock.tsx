import type { SummaryBlock } from '@/app/services/summariesApi';

export default function ProseBlock({ block }: { block: SummaryBlock }) {
  const { title, content } = block.content;

  return (
    <div>
      {title && (
        <h3 className="font-serif text-xl font-bold text-teal-900 dark:text-teal-400 mb-2.5 mt-0">
          {title}
        </h3>
      )}
      {content && (
        <div className="text-[15px] leading-[1.75] text-gray-500 dark:text-gray-400">
          {content}
        </div>
      )}
    </div>
  );
}
