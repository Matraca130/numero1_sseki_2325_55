import React, { useState } from 'react'
import { colors } from '@/app/design-system'

// #37: previously the fallback was a base64-encoded SVG with `stroke="#000"`
// baked in, which ignored dark mode. Now rendered as inline JSX so the stroke
// follows `currentColor`, making the icon themeable via the parent's text
// color class. The container background uses `colors.surface.hover` (the
// canonical light-neutral used for hover/fallback surfaces) instead of the
// hardcoded `bg-gray-100` class.
function FallbackIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={88}
      height={88}
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth={3.7}
      fill="none"
      opacity={0.3}
      aria-hidden="true"
      {...props}
    >
      <rect x="16" y="16" width="56" height="56" rx="6" />
      <path d="m16 58 16-18 32 32" />
      <circle cx="53" cy="35" r="7" />
    </svg>
  )
}

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false)

  const handleError = () => {
    setDidError(true)
  }

  const { src, alt, style, className, ...rest } = props

  return didError ? (
    <div
      className={`inline-block text-center align-middle text-gray-500 ${className ?? ''}`}
      style={{ backgroundColor: colors.surface.hover, ...style }}
      data-original-url={src as string | undefined}
      role="img"
      aria-label={(alt as string | undefined) ?? 'Error loading image'}
    >
      <div className="flex items-center justify-center w-full h-full">
        <FallbackIcon />
      </div>
    </div>
  ) : (
    <img src={src} alt={alt} className={className} style={style} {...rest} onError={handleError} />
  )
}
