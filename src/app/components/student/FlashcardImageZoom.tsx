// ============================================================
// Axon — FlashcardImageZoom (Student Image Zoom Modal)
//
// Fullscreen modal for zooming/panning flashcard images.
// Scroll wheel zoom, drag to pan, click outside or Escape to close.
// Does NOT interrupt review flow.
// ============================================================
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface FlashcardImageZoomProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function FlashcardImageZoom({ imageUrl, onClose }: FlashcardImageZoomProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const posStartRef = useRef({ x: 0, y: 0 });

  // Reset on open
  useEffect(() => {
    if (imageUrl) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [imageUrl]);

  // Keyboard: Escape to close
  useEffect(() => {
    if (!imageUrl) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [imageUrl, onClose]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale(prev => Math.max(0.5, Math.min(5, prev - e.deltaY * 0.002)));
  }, []);

  // Drag to pan
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (scale <= 1) return;
    setDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    posStartRef.current = { ...position };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [scale, position]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setPosition({
      x: posStartRef.current.x + (e.clientX - dragStartRef.current.x),
      y: posStartRef.current.y + (e.clientY - dragStartRef.current.y),
    });
  }, [dragging]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  if (!imageUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Controls */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale(s => Math.min(5, s + 0.5))}
              className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 transition-all"
              title="Zoom in"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={() => setScale(s => Math.max(0.5, s - 0.5))}
              className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 transition-all"
              title="Zoom out"
            >
              <ZoomOut size={18} />
            </button>
            <button
              onClick={resetZoom}
              className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 transition-all"
              title="Reset"
            >
              <RotateCcw size={18} />
            </button>
            <span className="text-xs text-zinc-500 ml-2">{Math.round(scale * 100)}%</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Image area */}
        <div
          className="flex-1 overflow-hidden flex items-center justify-center"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
        >
          <img
            src={imageUrl}
            alt="Zoom"
            className="max-w-full max-h-full object-contain select-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: dragging ? 'none' : 'transform 0.15s ease-out',
            }}
            draggable={false}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default FlashcardImageZoom;
