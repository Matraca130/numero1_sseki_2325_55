import type { SummaryBlock } from '@/app/services/summariesApi';

interface Props {
  block: SummaryBlock;
  isMobile?: boolean;
}

export default function ProseBlock({ block, isMobile }: Props) {
  const title = block.content?.title as string | undefined;
  const content = block.content?.content as string | undefined;
  const image = block.content?.image as string | undefined;

  return (
    <div>
      {title && (
        <h3 className={`font-serif font-bold text-teal-900 dark:text-teal-400 mb-2.5 mt-0 ${isMobile ? 'text-lg' : 'text-xl'}`}>
          {title}
        </h3>
      )}
      {content && (
        <div className={`leading-[1.75] text-gray-500 dark:text-gray-400 whitespace-pre-line ${isMobile ? 'text-sm' : 'text-[15px]'}`}>
          {content}
        </div>
      )}
      {image && (
        <img
          src={image}
          alt={title ?? ''}
          className={`rounded-[10px] border border-gray-200 dark:border-gray-700 mt-3 ${isMobile ? 'w-full' : 'max-w-full'}`}
        />
      )}
    </div>
  );
}
