// ============================================================
// Axon — ResponsiveModal
// Wrapper around shadcn Dialog: centered modal on desktop,
// full-screen overlay on mobile (<640px).
// Focus trap is handled by Radix Dialog's built-in behavior.
// ============================================================
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/app/components/ui/dialog';
import { useBreakpoint } from '@/app/hooks/useBreakpoint';

export interface ResponsiveModalProps {
  /** Controlled open state */
  open: boolean;
  /** Called when the modal should close */
  onOpenChange: (open: boolean) => void;
  /** Modal title (required for accessibility) */
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Modal body content */
  children: ReactNode;
  /** Additional CSS classes on the content wrapper */
  className?: string;
}

export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className = '',
}: ResponsiveModalProps) {
  const isDesktop = useBreakpoint('sm');

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={className}>
          <DialogHeader>
            <DialogTitle
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  // Mobile: full-screen overlay
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`fixed inset-0 z-50 flex flex-col bg-white p-0 max-w-none translate-x-0 translate-y-0 top-0 left-0 rounded-none border-none shadow-none data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom ${className}`}
        aria-labelledby="responsive-modal-title"
        aria-describedby={description ? 'responsive-modal-desc' : undefined}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <h2
            id="responsive-modal-title"
            className="font-semibold text-gray-900"
            style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1rem, 2vw, 1.125rem)' }}
          >
            {title}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {description && (
            <p
              id="responsive-modal-desc"
              className="text-gray-500 mb-4"
              style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)' }}
            >
              {description}
            </p>
          )}
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
