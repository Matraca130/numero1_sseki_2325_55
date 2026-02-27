// ============================================================
// Axon — SmartPopup (responsive keyword popup wrapper)
//
// Desktop (>=640px): Radix Popover with collision detection
//   - side="top", sideOffset=8, collisionPadding=16
//   - Portal → escapes overflow:hidden parents
//   - Auto-flip via avoidCollisions
//
// Mobile (<640px): Vaul Drawer (bottom sheet)
//   - max-height 70vh, slide-up, backdrop
//   - Better UX on small screens
//
// Animations: scale(0.95)→1 + opacity (150ms)
// Close: click outside, Escape, X button, scroll >200px
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/app/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from '@/app/components/ui/drawer';

// ── Props ─────────────────────────────────────────────────

interface SmartPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
}

export function SmartPopup({ open, onOpenChange, trigger, children }: SmartPopupProps) {
  const [isMobile, setIsMobile] = useState(false);
  const scrollRef = useRef(0);

  // ── Detect mobile ───────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── Close on scroll >200px ──────────────────────────────
  useEffect(() => {
    if (!open) return;
    scrollRef.current = window.scrollY;
    const handler = () => {
      if (Math.abs(window.scrollY - scrollRef.current) > 200) {
        onOpenChange(false);
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [open, onOpenChange]);

  // ── Mobile: Drawer (bottom sheet) ───────────────────────
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>
          {trigger}
        </DrawerTrigger>
        <DrawerContent className="max-h-[70vh]">
          <div className="overflow-y-auto max-h-[calc(70vh-2rem)] px-1">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // ── Desktop: Radix Popover with collision detection ─────
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        sideOffset={8}
        align="center"
        collisionPadding={16}
        avoidCollisions={true}
        className="p-0 border-0 bg-transparent shadow-none"
        style={{
          width: 'max-content',
          maxWidth: '420px',
          minWidth: '280px',
        }}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
