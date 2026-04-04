/**
 * Loading, error, empty, and no-results states for OwnerMembersPage.
 */

import React from 'react';
import { motion } from 'motion/react';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Button } from '@/app/components/ui/button';
import { Users, UserPlus, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { ROLE_FILTERS } from './constants';
import type { RoleFilter } from './constants';

export function FadeIn({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }} className={className}>
      {children}
    </motion.div>
  );
}

export function MembersSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-6" aria-label="Cargando miembros">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Skeleton className="h-7 w-36" /><Skeleton className="h-4 w-56" /></div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-36" /><Skeleton className="h-2.5 w-48" /></div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MembersError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 lg:p-8">
      <FadeIn>
        <div className="max-w-md mx-auto mt-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar miembros</h2>
          <p className="text-sm text-gray-500 mb-6">{message}</p>
          <Button onClick={onRetry} className="gap-2"><RefreshCw size={14} />Reintentar</Button>
        </div>
      </FadeIn>
    </div>
  );
}

export function MembersEmpty({ onInvite }: { onInvite: () => void }) {
  return (
    <FadeIn>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
          <Users size={24} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Sin miembros registrados</h3>
        <p className="text-sm text-gray-500 mb-6">Invita administradores, profesores y estudiantes a tu institución</p>
        <Button onClick={onInvite} className="gap-2 bg-amber-500 hover:bg-amber-600"><UserPlus size={14} />Invitar primer miembro</Button>
      </div>
    </FadeIn>
  );
}

export function NoResults({ query, role }: { query: string; role: RoleFilter }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-300 flex items-center justify-center mx-auto mb-3">
        <Search size={20} />
      </div>
      <h3 className="text-sm font-semibold text-gray-700 mb-1">Sin resultados</h3>
      <p className="text-xs text-gray-400">
        {query ? `No se encontraron miembros para "${query}"` : `No hay miembros con el rol "${ROLE_FILTERS.find(f => f.value === role)?.label}"`}
      </p>
    </div>
  );
}
