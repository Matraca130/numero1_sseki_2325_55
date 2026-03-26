import { Image } from 'lucide-react';
import type { SummaryBlock } from '@/app/services/summariesApi';

export default function ImageReferenceBlock({ block }: { block: SummaryBlock }) {
  const description = block.content?.description as string | undefined;
  const caption = block.content?.caption as string | undefined;
  const image_url = block.content?.image_url as string | undefined;

  if (image_url) {
    return (
      <figure className="text-center">
        <img
          src={image_url}
          alt={description ?? ''}
          loading="lazy"
          className="max-w-full rounded-[10px] border border-gray-200 dark:border-gray-700 inline-block"
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
    <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-7 bg-gray-100 dark:bg-gray-950 text-center">
      <Image size={36} className="text-gray-400 dark:text-gray-500 mx-auto mb-2" aria-hidden="true" />
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
