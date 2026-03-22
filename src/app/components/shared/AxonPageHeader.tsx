// ============================================================
// Axon — Page Header (RESPONSIVE VERSION)
//
// Changes from original:
//   1. Padding: px-4 sm:px-6 lg:px-8 (reduced on mobile)
//   2. Title + action button: stacks vertically on mobile
//   3. Stats row: wraps on mobile with gap
//   4. Back button + badge: properly spaced on mobile
//   5. Title clamp already responsive (no change needed)
// ============================================================
import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { AxonBrand, AxonBadge, AxonWatermark } from '@/app/components/shared/AxonLogo';
import { components, headingStyle, displayStyle } from '@/app/design-system';

interface AxonPageHeaderProps {
  title: string;
  subtitle: string;
  onBack?: () => void;
  backLabel?: string;
  actionButton?: React.ReactNode;
  statsLeft?: React.ReactNode;
  statsRight?: React.ReactNode;
}

export function AxonPageHeader({
  title,
  subtitle,
  onBack,
  backLabel = 'Volver',
  actionButton,
  statsLeft,
  statsRight,
}: AxonPageHeaderProps) {
  return (
    <div className={`${components.pageHeader.wrapper} !px-4 sm:!px-6 lg:!px-8 !pt-4 !pb-4 sm:!pb-6`}>
      {/* Diagonal AXON watermark */}
      <AxonWatermark />

      <div className="relative z-10">
        {/* Top bar: back + brand badge */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          {onBack ? (
            <button onClick={onBack} className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm transition-colors font-medium min-h-[44px]">
              <ChevronLeft size={16} /> <span className="hidden sm:inline">{backLabel}</span>
            </button>
          ) : (
            <div />
          )}
          <AxonBadge />
        </div>

        {/* Main title area — stacks on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 lg:gap-8 mb-3">
          <div className="flex-1 min-w-0">
            <h1 className={`${components.pageHeader.title} mb-1.5 flex items-baseline gap-2 sm:gap-4`} style={headingStyle}>
              <span className="truncate">{title}</span>
              <span className="hidden sm:inline"><AxonBrand /></span>
            </h1>
            <h2 className={`${components.pageHeader.subtitle} line-clamp-2 sm:line-clamp-1`} style={displayStyle}>{subtitle}</h2>
          </div>

          {/* Right side — action button */}
          {actionButton && (
            <div className="shrink-0">
              {actionButton}
            </div>
          )}
        </div>

        {/* Bottom stats row — wraps on mobile */}
        {(statsLeft || statsRight) && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 pt-3 border-t border-gray-200/60">
            {statsLeft || <div />}
            {statsRight || <div />}
          </div>
        )}
      </div>
    </div>
  );
}
