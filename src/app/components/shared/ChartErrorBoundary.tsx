import React from 'react';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import { BarChart3 } from 'lucide-react';

interface ChartErrorBoundaryProps {
  children: React.ReactNode;
  height?: number | string;
}

export function ChartErrorBoundary({ children, height = 140 }: ChartErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <div
          className="flex flex-col items-center justify-center text-zinc-400 bg-zinc-50 rounded-xl border border-zinc-200"
          style={{ height: typeof height === 'number' ? `${height}px` : height }}
        >
          <BarChart3 size={20} className="mb-1 opacity-40" />
          <span className="text-[10px]">Grafico no disponible</span>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
