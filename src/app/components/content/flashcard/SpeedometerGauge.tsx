import React from 'react';
import { motion } from 'motion/react';
import { Flashcard } from '@/app/data/courses';

export function SpeedometerGauge({ cards, currentIndex, sessionStats }: {
  cards: Flashcard[];
  currentIndex: number;
  sessionStats: number[];
}) {
  const total = cards.length;
  const progress = ((currentIndex) / total) * 100;
  const size = 120;
  const strokeWidth = 8;
  const center = size / 2;
  const radius = (size - strokeWidth * 2) / 2;

  // Arc from 135deg to 405deg (270deg sweep)
  const startAngle = 135;
  const sweepAngle = 270;

  const polarToCartesian = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const describeArc = (start: number, end: number) => {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  const segmentAngle = sweepAngle / total;
  const segmentGap = Math.min(1.5, segmentAngle * 0.1);

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="drop-shadow-lg">
        {/* Background track segments */}
        {cards.map((_, i) => {
          const segStart = startAngle + i * segmentAngle + segmentGap;
          const segEnd = startAngle + (i + 1) * segmentAngle - segmentGap;
          return (
            <path
              key={`bg-${i}`}
              d={describeArc(segStart, segEnd)}
              fill="none"
              stroke="rgba(0,0,0,0.08)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          );
        })}

        {/* Colored segments for completed/current cards */}
        {cards.map((_, i) => {
          const isCompleted = i < sessionStats.length;
          const isCurrent = i === currentIndex;
          const rating = sessionStats[i];

          if (!isCompleted && !isCurrent) return null;

          let color = "#14b8a6";
          if (isCompleted && rating !== undefined) {
            if (rating >= 4) color = "#10b981";
            else if (rating === 3) color = "#f59e0b";
            else color = "#f43f5e";
          }

          const segStart = startAngle + i * segmentAngle + segmentGap;
          const segEnd = startAngle + (i + 1) * segmentAngle - segmentGap;

          return (
            <motion.path
              key={`seg-${i}`}
              d={describeArc(segStart, segEnd)}
              fill="none"
              stroke={color}
              strokeWidth={isCurrent ? strokeWidth + 2 : strokeWidth}
              strokeLinecap="round"
              className={isCurrent ? "drop-shadow(0 0 6px rgba(20,184,166,0.5))" : undefined}
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: isCurrent ? [0.6, 1, 0.6] : 1, pathLength: 1 }}
              transition={isCurrent
                ? { opacity: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }, pathLength: { duration: 0.4 } }
                : { duration: 0.4 }
              }
            />
          );
        })}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>

        {/* Needle indicator */}
        {(() => {
          const needleAngle = startAngle + (currentIndex / total) * sweepAngle + segmentAngle / 2;
          const needleTip = polarToCartesian(needleAngle);
          const rad = (needleAngle * Math.PI) / 180;
          const needleInner = {
            x: center + (radius - 18) * Math.cos(rad),
            y: center + (radius - 18) * Math.sin(rad),
          };
          return (
            <motion.line
              x1={needleInner.x}
              y1={needleInner.y}
              x2={needleTip.x}
              y2={needleTip.y}
              stroke="#374151"
              strokeWidth={2}
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              style={{ filter: "drop-shadow(0 0 3px rgba(0,0,0,0.1))" }}
            />
          );
        })()}

        {/* Center dot */}
        <circle cx={center} cy={center} r={3} fill="#6b7280" opacity={0.5} />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: 8 }}>
        <span className="text-2xl font-black text-gray-800 tabular-nums leading-none">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Counter below gauge */}
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-[11px] font-semibold text-gray-500 tabular-nums">
          {currentIndex + 1}
        </span>
        <span className="text-[10px] text-gray-400">/</span>
        <span className="text-[11px] font-semibold text-gray-400 tabular-nums">
          {cards.length}
        </span>
      </div>
    </div>
  );
}
