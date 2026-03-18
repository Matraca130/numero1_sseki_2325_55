// ============================================================
// Axon — AnimationControls (GLTF Animation Playback)
//
// UI for play/pause/scrub of GLTF embedded animations.
// Used when gltf.animations.length > 0 is detected in ModelViewer3D.
//
// Three.js AnimationMixer is managed by the parent (ModelViewer3D).
// This component just renders controls and receives state via props.
//
// ZERO backend changes — purely frontend, leveraging existing
// Three.js AnimationMixer that was previously unused.
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export interface AnimationInfo {
  name: string;
  duration: number; // seconds
  index: number;
}

interface AnimationControlsProps {
  animations: AnimationInfo[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;    // seconds into current animation
  duration: number;       // total duration of current animation
  speed: number;          // playback speed (1 = normal)
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onSelectAnimation: (index: number) => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
}

const SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2];

export function AnimationControls({
  animations,
  currentIndex,
  isPlaying,
  currentTime,
  duration,
  speed,
  onPlay,
  onPause,
  onSeek,
  onSelectAnimation,
  onSpeedChange,
  onReset,
}: AnimationControlsProps) {
  const [showAnimList, setShowAnimList] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);

  const currentAnim = animations[currentIndex];
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = useCallback((secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = Number(e.target.value);
    onSeek((pct / 100) * duration);
  }, [duration, onSeek]);

  const animLabel = useMemo(() => {
    if (!currentAnim) return 'Sin animacion';
    return currentAnim.name || `Animacion ${currentAnim.index + 1}`;
  }, [currentAnim]);

  if (animations.length === 0) return null;

  return (
    <div className="absolute bottom-3 right-3 z-20 w-64">
      <div className="bg-zinc-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header: animation selector */}
        <div className="px-3 py-2 border-b border-white/5">
          <div className="relative">
            <button
              onClick={() => setShowAnimList(!showAnimList)}
              className="flex items-center gap-1.5 w-full text-left"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-white truncate flex-1">{animLabel}</span>
              {animations.length > 1 && (
                <ChevronDown size={10} className={clsx(
                  'text-gray-500 transition-transform',
                  showAnimList && 'rotate-180'
                )} />
              )}
            </button>

            {/* Animation list dropdown */}
            {showAnimList && animations.length > 1 && (
              <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg bg-zinc-800/95 border border-white/10 shadow-xl max-h-32 overflow-y-auto">
                {animations.map((anim, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onSelectAnimation(i);
                      setShowAnimList(false);
                    }}
                    className={clsx(
                      'w-full text-left px-3 py-1.5 text-[10px] transition-colors border-b border-white/5 last:border-0',
                      i === currentIndex
                        ? 'text-emerald-300 bg-emerald-500/10'
                        : 'text-gray-400 hover:bg-white/5'
                    )}
                  >
                    <span className="truncate block">
                      {anim.name || `Animacion ${i + 1}`}
                    </span>
                    <span className="text-[8px] text-gray-600">
                      {formatTime(anim.duration)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Timeline scrubber */}
        <div className="px-3 py-2 space-y-1.5">
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            onChange={handleScrub}
            className="w-full h-1 accent-emerald-500 cursor-pointer"
            style={{ accentColor: '#34d399' }}
          />

          <div className="flex items-center justify-between text-[8px] text-gray-500 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-white/5">
          {/* Play/Pause + Reset */}
          <div className="flex items-center gap-1">
            <button
              onClick={isPlaying ? onPause : onPlay}
              className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <button
              onClick={onReset}
              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
              title="Reiniciar"
            >
              <RotateCcw size={11} />
            </button>
          </div>

          {/* Speed selector */}
          <div className="relative">
            <button
              onClick={() => setShowSpeed(!showSpeed)}
              className="px-2 py-1 rounded-md text-[9px] text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-mono"
            >
              {speed}x
            </button>

            {showSpeed && (
              <div className="absolute bottom-full right-0 mb-1 rounded-lg bg-zinc-800/95 border border-white/10 shadow-xl overflow-hidden">
                {SPEED_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      onSpeedChange(s);
                      setShowSpeed(false);
                    }}
                    className={clsx(
                      'block w-full px-3 py-1.5 text-[10px] font-mono transition-colors',
                      s === speed
                        ? 'text-emerald-300 bg-emerald-500/10'
                        : 'text-gray-400 hover:bg-white/5'
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
