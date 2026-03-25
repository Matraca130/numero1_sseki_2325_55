import type { SummaryBlock, SummaryKeyword } from '@/app/services/summariesApi';
import renderTextWithKeywords from './renderTextWithKeywords';

export default function ProseBlock({ block, keywords }: { block: SummaryBlock; keywords?: SummaryKeyword[] }) {
  const title = block.content?.title as string | undefined;
  const content = block.content?.content as string | undefined;
  const image = block.content?.image as string | undefined;

  return (
    <div>
      {title && (
        <h3 className="font-serif text-xl font-bold text-[#1B3B36] dark:text-teal-400 mb-3 mt-0">
          {title}
        </h3>
      )}
      {content && (
        <div className="text-[15px] leading-[1.75] text-gray-500 dark:text-gray-400">
          {renderTextWithKeywords(content, keywords)}
        </div>
      )}
      {image && (
        <img
          src={image}
          alt={title ?? ''}
          className="max-w-full rounded-xl border border-gray-200 dark:border-gray-700 mt-3"
        />
      )}
    </div>
  );
}
