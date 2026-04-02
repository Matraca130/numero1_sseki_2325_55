/**
 * Loading, error, empty, and animation states for OwnerPlansPage.
 */

import React from 'react';
import { motion } from 'motion/react';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Button } from '@/app/components/ui/button';
import { AlertCircle, RefreshCw, Plus, Package } from 'lucide-react';

export function FadeIn({ children, delay = 0, className = '' }: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function PlansSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-6" aria-label="Cargando planes">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <div className="flex gap-4 pt-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlansError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 lg:p-8">
      <FadeIn>
        <div className="max-w-md mx-auto mt-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar planes</h2>
          <p className="text-sm text-gray-500 mb-6">{message}</p>
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw size={14} />
            Reintentar
          </Button>
        </div>
      </FadeIn>
    </div>
  );
}

export function PlansEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <FadeIn>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-12 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
          <Package size={24} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Sin planes creados</h3>
        <p className="text-sm text-gray-500 mb-6">
          Crea planes para organizar el acceso de tus estudiantes al contenido
        </p>
        <Button onClick={onCreate} className="gap-2 bg-amber-500 hover:bg-amber-600">
          <Plus size={14} />
          Crear primer plan
        </Button>
      </div>
    </FadeIn>
  );
}
