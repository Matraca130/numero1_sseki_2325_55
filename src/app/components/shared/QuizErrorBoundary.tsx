// ============================================================
// Axon — Quiz Error Boundary (per-feature resilience)
//
// Phase 7a: Catches render errors in quiz sub-trees and shows
// a recoverable error screen instead of crashing the whole app.
//
// MOVED to /shared/ (M4 FIX): Used by both student and professor
// components — cannot live in /student/ without cross-domain coupling.
//
// Usage:
//   <QuizErrorBoundary label="Sesion de Quiz">
//     <QuizTaker ... />
//   </QuizErrorBoundary>
// ============================================================

import { Component, type ReactNode } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';
import { logger } from '@/app/lib/logger';

// ── Props & State ────────────────────────────────────────

interface QuizErrorBoundaryProps {
  children: ReactNode;
  label: string;
  /** teal (student default) or purple (professor) */
  accentColor?: 'teal' | 'purple';
}

interface QuizErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ── Component ────────────────────────────────────────────

export class QuizErrorBoundary extends Component<
  QuizErrorBoundaryProps,
  QuizErrorBoundaryState
> {
  state: QuizErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): QuizErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error(`[QuizErrorBoundary:${this.props.label}]`, error, {
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isPurple = this.props.accentColor === 'purple';
    const iconBg = isPurple ? 'bg-purple-50' : 'bg-rose-50';
    const iconColor = isPurple ? 'text-purple-400' : 'text-rose-400';
    const btnBg = isPurple
      ? 'bg-purple-600 hover:bg-purple-700'
      : 'bg-teal-600 hover:bg-teal-700';

    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div
          className={`w-16 h-16 rounded-2xl ${iconBg} flex items-center justify-center mb-4`}
        >
          <AlertCircle size={32} className={iconColor} />
        </div>
        <h2
          className="text-lg text-zinc-900 mb-2"
          style={{ fontWeight: 700 }}
        >
          Error en {this.props.label}
        </h2>
        <p className="text-sm text-zinc-500 mb-4 max-w-md">
          {this.state.error?.message || 'Algo salio mal. Intenta de nuevo.'}
        </p>
        <button
          onClick={this.handleRetry}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${btnBg} text-white text-sm transition-colors`}
          style={{ fontWeight: 600 }}
        >
          <RotateCw size={14} /> Reintentar
        </button>
      </div>
    );
  }
}
