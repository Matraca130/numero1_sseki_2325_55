// ============================================================
// Axon — Circular Progress Ring (shared SVG component)
// Used by DailyPerformanceSidebar, WelcomePerformanceSidebar, etc.
// ============================================================
import React from 'react';

interface CircularProgressProps {
  /** 0–100 */
  percent: number;
  /** Outer size in px (width=height) */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Active stroke color (CSS) */
  strokeColor?: string;
  /** Track stroke color (CSS) */
  trackColor?: string;
  /** Optional children rendered in the center */
  children?: React.ReactNode;
}

export function CircularProgress({
  percent,
  size = 192,
  strokeWidth = 12,
  strokeColor = '#14b8a6',
  trackColor = 'rgba(255,255,255,0.1)',
  children,
}: CircularProgressProps) {
  const half = size / 2;
  const radius = half - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(percent, 100) / 100);

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx={half}
          cy={half}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={half}
          cy={half}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
