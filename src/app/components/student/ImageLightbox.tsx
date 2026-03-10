// ============================================================
// Axon — ImageLightbox (Student: fullscreen image viewer)
//
// Modal fullscreen with zoom (scroll/pinch), caption,
// navigation (prev/next), close via X/click/Esc.
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export interface LightboxImage {
  src: string;
  alt?: string;
  caption?: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex, open, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  // Reset when opening or changing image
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [initialIndex, open]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const goNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(i => i + 1);
      resetView();
    }
  }, [currentIndex, images.length, resetView]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      resetView();
    }
  }, [currentIndex, resetView]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.25, 5));
      if (e.key === '-') setZoom(z => Math.max(z - 0.25, 0.5));
      if (e.key === '0') resetView();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, goNext, goPrev, resetView]);

  // Scroll to zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom(z => Math.min(Math.max(z + delta, 0.5), 5));
  }, []);

  // Drag to pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: panStart.current.x + (e.clientX - dragStart.current.x),
      y: panStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  if (!open || images.length === 0) return null;

  const current = images[currentIndex] || images[0];
  const hasMultiple = images.length > 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Top toolbar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent z-10">
            {/* Counter */}
            {hasMultiple && (
              <span className="text-white/70 text-sm">
                {currentIndex + 1} / {images.length}
              </span>
            )}
            {!hasMultiple && <div />}

            {/* Zoom controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                className="p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                title="Zoom out (-)"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-white/60 text-xs min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(z + 0.25, 5))}
                className="p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                title="Zoom in (+)"
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={resetView}
                className="p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                title="Reset (0)"
              >
                <RotateCcw size={16} />
              </button>
              <div className="w-px h-5 bg-white/20 mx-1" />
              <button
                onClick={onClose}
                className="p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                title="Cerrar (Esc)"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Navigation arrows */}
          {hasMultiple && currentIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition-all"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          {hasMultiple && currentIndex < images.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition-all"
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* Image */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden w-full select-none"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
          >
            <motion.img
              key={current.src}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              src={current.src}
              alt={current.alt || ''}
              className="max-h-[80vh] max-w-[90vw] object-contain pointer-events-none"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transition: dragging ? 'none' : 'transform 0.15s ease-out',
              }}
              draggable={false}
            />
          </div>

          {/* Caption */}
          {current.caption && (
            <div className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-gradient-to-t from-black/60 to-transparent z-10">
              <p className="text-white/80 text-sm text-center max-w-2xl mx-auto">
                {current.caption}
              </p>
            </div>
          )}

          {/* Thumbnail strip for multiple images */}
          {hasMultiple && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-sm z-10">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); resetView(); }}
                  className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                    idx === currentIndex
                      ? 'border-white/80 ring-1 ring-white/30'
                      : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                >
                  <img
                    src={img.src}
                    alt={img.alt || ''}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
