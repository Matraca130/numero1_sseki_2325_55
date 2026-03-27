import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ResizableImageProps {
  src: string;
  alt?: string;
  width: number;
  height: number;
  onResize: (w: number, h: number) => void;
  minWidth?: number;
  maxWidth?: number;
}

const ResizableImage = React.memo(function ResizableImage({
  src,
  alt = '',
  width,
  height,
  onResize,
  minWidth = 100,
  maxWidth = 800,
}: ResizableImageProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [currentSize, setCurrentSize] = useState({ w: width, h: height });
  const startRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const aspectRatio = width / height;

  // Refs to avoid stale closures and listener thrash
  const sizeRef = useRef(currentSize);
  sizeRef.current = currentSize;
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  // Sync external size changes
  useEffect(() => {
    if (!isResizing) {
      setCurrentSize({ w: width, h: height });
    }
  }, [width, height, isResizing]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startRef.current = { x: e.clientX, y: e.clientY, w: sizeRef.current.w, h: sizeRef.current.h };
      setIsResizing(true);
    },
    [],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startRef.current.x;
      let newW = Math.round(startRef.current.w + dx);
      newW = Math.max(minWidth, Math.min(maxWidth, newW));
      const newH = Math.round(newW / aspectRatio);
      setCurrentSize({ w: newW, h: newH });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      onResizeRef.current(sizeRef.current.w, sizeRef.current.h);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, aspectRatio, minWidth, maxWidth]);

  return (
    <div
      className="group relative inline-block"
      style={{ width: currentSize.w, height: currentSize.h }}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-contain rounded-lg transition-shadow group-hover:ring-2 group-hover:ring-teal-200"
        draggable={false}
      />

      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute bottom-1 right-1 h-3 w-3 cursor-nwse-resize rounded-full bg-white border-2 border-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"
      />

      {/* Dimensions tooltip while resizing */}
      {isResizing && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-gray-900 text-white rounded px-2 py-0.5 whitespace-nowrap pointer-events-none">
          {currentSize.w}&times;{currentSize.h}
        </div>
      )}
    </div>
  );
});

export default ResizableImage;
