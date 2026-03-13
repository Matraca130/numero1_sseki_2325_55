// ============================================================
// Axon — MobileDrawer (Reusable overlay drawer for mobile)
//
// Provides:
//   - Backdrop with click-to-close
//   - Animated slide-in drawer from left
//   - Body scroll lock when open
//   - Only renders on <lg (hidden on desktop via lg:hidden)
//   - Close button inside drawer
//
// Usage:
//   <MobileDrawer isOpen={open} onClose={() => setOpen(false)} width={280}>
//     <Sidebar />
//   </MobileDrawer>
// ============================================================

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

// Global counter to track how many drawers are open (prevents scroll lock race condition)
let openDrawerCount = 0;

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
          >
            <div className="h-full relative">
              {showCloseButton && (
                <div className="absolute top-3 right-3 z-10">
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
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
