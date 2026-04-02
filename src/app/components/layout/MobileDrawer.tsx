// ============================================================
// Axon — MobileDrawer (Reusable overlay drawer for mobile)
//
// Provides:
//   - Backdrop with click-to-close
//   - Animated slide-in drawer from left
//   - Body scroll lock when open
//   - Only renders on <lg (hidden on desktop via lg:hidden)
//   - Close button inside drawer
//   - Focus trap when open (Tab wraps, focus returns on close)
//
// Usage:
//   <MobileDrawer isOpen={open} onClose={() => setOpen(false)} width={280}>
//     <Sidebar />
//   </MobileDrawer>
// ============================================================

import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

// Global counter to track how many drawers are open (prevents scroll lock race condition)
let openDrawerCount = 0;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Width of the drawer in pixels (default: 280) */
  width?: number;
  /** z-index for backdrop (drawer is +10) (default: 40) */
  zIndex?: number;
  /** Show close button (default: true) */
  showCloseButton?: boolean;
  /** Optional top offset (e.g. below header) */
  topOffset?: number;
  children: React.ReactNode;
}

export function MobileDrawer({
  isOpen,
  onClose,
  width = 280,
  zIndex = 40,
  showCloseButton = true,
  topOffset = 0,
  children,
}: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Capture the element that was focused before the drawer opened
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }
  }, [isOpen]);

  // Body scroll lock — uses global counter to handle multiple drawers
  useEffect(() => {
    if (isOpen) {
      openDrawerCount++;
      if (openDrawerCount === 1) {
        document.body.style.overflow = 'hidden';
      }
      return () => {
        openDrawerCount--;
        if (openDrawerCount <= 0) {
          openDrawerCount = 0;
          document.body.style.overflow = '';
        }
      };
    }
  }, [isOpen]);

  // Focus first element when drawer opens
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return;
    // Slight delay to ensure the drawer animation has started and DOM is ready
    const raf = requestAnimationFrame(() => {
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  // Return focus to trigger element on close
  useEffect(() => {
    if (!isOpen && triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  // Focus trap + Escape key handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key !== 'Tab' || !drawerRef.current) return;

      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab on first → wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab on last → wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 lg:hidden"
            style={{ zIndex, top: topOffset }}
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            initial={{ x: -width }}
            animate={{ x: 0 }}
            exit={{ x: -width }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-0 lg:hidden"
            style={{
              zIndex: zIndex + 10,
              width,
              top: topOffset,
              bottom: 0,
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            onKeyDown={handleKeyDown}
          >
            <div className="h-full relative">
              {showCloseButton && (
                <div className="absolute top-3 right-3 z-10">
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg bg-black/10 hover:bg-black/20 text-gray-500 transition-colors"
                    aria-label="Cerrar"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
