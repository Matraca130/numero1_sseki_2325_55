import React from 'react';
import clsx from 'clsx';
import { brand } from '@/app/design-system';

interface AxonLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'watermark';
  theme?: 'light' | 'dark' | 'gradient';
  className?: string;
  showText?: boolean;
}

function AxonMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 28" fill="none" className={className}>
      <path
        d="M2.5 13C2.5 13 6.5 4 12 4C17.5 4 21.5 13 21.5 13L18.5 13C18.5 13 15.5 7.5 12 7.5C8.5 7.5 5.5 13 5.5 13Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 9L3.5 27H7L9 21H15L17 27H20.5L12 9ZM10.2 18.5L12 12.5L13.8 18.5H10.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

const sizeConfig = brand.logo.sizes;

function getThemeClasses(theme: string) {
  const t = brand.logo.themes[theme as keyof typeof brand.logo.themes];
  if (t) return t;
  return brand.logo.themes.dark;
}

export function AxonLogo({ size = 'sm', theme = 'dark', className, showText = true }: AxonLogoProps) {
  const s = sizeConfig[size];
  const t = getThemeClasses(theme);
  const isWatermark = size === 'watermark';

  return (
    <span
      className={clsx(
        'inline-flex items-center select-none',
        s.gap,
        isWatermark && 'opacity-[0.03] pointer-events-none',
        className
      )}
    >
      <AxonMark className={clsx(s.svg, t.svgColor, 'shrink-0')} />
      {showText && (
        <span className={clsx(s.text, 'font-semibold uppercase', t.textColor)}>
          AXON
        </span>
      )}
    </span>
  );
}

export function AxonBadge() {
  return <AxonLogo size="sm" theme="dark" />;
}

export function AxonBrand({ theme = 'gradient' }: { theme?: 'light' | 'dark' | 'gradient' }) {
  return <AxonLogo size="md" theme={theme} />;
}

export function AxonWatermark({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  return (
    <div className="absolute top-4 right-[-10px] rotate-[-15deg] select-none pointer-events-none z-0">
      <span className={clsx(
        'inline-flex items-center gap-3',
        theme === 'dark' ? 'text-gray-900 opacity-[0.03]' : 'text-white opacity-[0.02]'
      )}>
        <AxonMark className="w-14 h-16 shrink-0" />
        <span className="text-[72px] font-black tracking-[0.1em] leading-none uppercase">AXON</span>
      </span>
    </div>
  );
}