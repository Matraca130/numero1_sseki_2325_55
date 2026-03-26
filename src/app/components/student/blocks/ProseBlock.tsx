import type { SummaryBlock } from '@/app/services/summariesApi';

export default function ProseBlock({ block }: { block: SummaryBlock }) {
  const title = block.content?.title as string | undefined;
  const content = block.content?.content as string | undefined;
  const image = block.content?.image as string | undefined;

  return (
    <div>
      {title && (
        <h3 className="font-serif text-xl font-bold text-teal-900 dark:text-teal-400 mb-2.5 mt-0">
          {title}
        </h3>
      )}
      {content && (
        <div className="text-[15px] leading-[1.75] text-gray-500 dark:text-gray-400 whitespace-pre-line">
          {content}
        </div>
      )}
      {image && (
        <img
          src={image}
          alt={title ?? ''}
          loading="lazy"
          className="max-w-full rounded-[10px] border border-gray-200 dark:border-gray-700 mt-3"
        />
      )}
    </div>
  );
}
