import { Image } from 'lucide-react';
import type { SummaryBlock } from '@/app/services/summariesApi';

interface Props {
  block: SummaryBlock;
  isMobile?: boolean;
}

export default function ImageReferenceBlock({ block, isMobile }: Props) {
  const description = block.content?.description as string | undefined;
  const caption = block.content?.caption as string | undefined;
  const image_url = block.content?.image_url as string | undefined;

  if (image_url) {
    return (
      <figure className="text-center">
        <img
          src={image_url}
          alt={description ?? ''}
          className={`rounded-[10px] border border-gray-200 dark:border-gray-700 inline-block ${isMobile ? 'w-full' : 'max-w-full'}`}
        />
        {caption && (
          <figcaption className="text-[11px] italic text-gray-400 dark:text-gray-500 mt-1 text-center">
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  return (
    <div className={`rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-950 text-center ${isMobile ? 'p-5' : 'p-7'}`}>
      <Image size={isMobile ? 28 : 36} className="text-gray-400 dark:text-gray-500 mx-auto mb-2" aria-hidden="true" />
      <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
        {description ?? 'Imagen por agregar'}
      </div>
      {caption && (
        <div className="text-xs text-gray-400 dark:text-gray-500 italic mt-1.5">
          {caption}
        </div>
      )}
    </div>
  );
}
