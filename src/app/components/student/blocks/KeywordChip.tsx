import { useCallback, useRef, useState } from 'react';
import { Tag } from 'lucide-react';
import type { SummaryKeyword } from '@/app/services/summariesApi';

interface KeywordChipProps {
  keyword: SummaryKeyword;
  onClick?: (keywordId: string) => void;
}

export default function KeywordChip({ keyword, onClick }: KeywordChipProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [positionAbove, setPositionAbove] = useState(true);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chipRef = useRef<HTMLSpanElement>(null);

  const openPopover = useCallback(() => {
    if (chipRef.current) {
      const rect = chipRef.current.getBoundingClientRect();
      // If there is not enough room above (less than 120px), show below
      setPositionAbove(rect.top > 120);
    }
    setShowPopover(true);
  }, []);

  const handleMouseEnter = useCallback(() => {
    enterTimer.current = setTimeout(openPopover, 150);
  }, [openPopover]);

  const handleMouseLeave = useCallback(() => {
    if (enterTimer.current) {
      clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    setShowPopover(false);
  }, []);

  const handleFocus = useCallback(() => {
    openPopover();
  }, [openPopover]);

  const handleBlur = useCallback(() => {
    setShowPopover(false);
  }, []);

  return (
    <span
      ref={chipRef}
      role="button"
      tabIndex={0}
      className="relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-axon-teal-50 dark:bg-teal-950 text-axon-dark dark:text-teal-200 border border-axon-teal-100 dark:border-teal-800 hover:bg-axon-teal-100 dark:hover:bg-teal-900 cursor-pointer transition-colors"
      onClick={() => onClick?.(keyword.id)}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick?.(keyword.id); }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <Tag size={10} className="shrink-0" />
      {keyword.name}

      {showPopover && keyword.definition && (
        <>
          {/* Popover card */}
          <span
            role="tooltip"
            className={[
              'absolute left-1/2 -translate-x-1/2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50 pointer-events-none',
              positionAbove ? 'bottom-full mb-2' : 'top-full mt-2',
            ].join(' ')}
          >
            <span className="block font-serif text-sm font-bold text-axon-dark dark:text-teal-400 mb-1.5">
              {keyword.name}
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {keyword.definition}
            </span>

            {/* Arrow pointer */}
            <span
              className={[
                'absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white dark:bg-gray-800 rotate-45',
                positionAbove
                  ? 'top-full -mt-1.5 border-r border-b border-gray-200 dark:border-gray-700'
                  : 'bottom-full -mb-1.5 border-l border-t border-gray-200 dark:border-gray-700',
              ].join(' ')}
            />
          </span>
        </>
      )}
    </span>
  );
}
