import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { supabase } from '@/app/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────
export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback UI */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Optional handler called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Optional retry callback invoked when user clicks retry */
  retry?: () => void;
  /** Display variant: 'page' (full screen), 'section' (compact card), 'minimal' (inline text) */
  variant?: 'page' | 'section' | 'minimal';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ─── Default Fallback Renderers ──────────────────────────────────

function PageFallback({
  error,
  onReset,
  onRetry,
}: {
  error: Error;
  onReset: () => void;
  onRetry?: () => void;
}) {
  const handleRetry = () => {
    onReset();
    onRetry?.();
  };

  return (
    <div
      role="alert"
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#09090b',
        gap: '1.5rem',
        padding: '1rem',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ color: '#ffffff', marginBottom: '0.5rem', fontFamily: 'Georgia, serif', fontSize: '1.25rem' }}>
          Algo salio mal
        </h3>
        <p style={{ color: '#a1a1aa', fontSize: '0.875rem', maxWidth: '28rem' }}>
          {error.message || 'Ocurrio un error inesperado. Puedes reintentar o volver al inicio.'}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={handleRetry}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: '#27272a',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Reintentar
        </button>
        <button
          onClick={() => {
            supabase.auth.signOut().catch(() => {});
            // Guarded: if the original error came from localStorage (private mode)
            // the recovery button must NOT crash here — proceed to redirect.
            try {
              localStorage.removeItem('axon_active_membership');
              localStorage.removeItem('axon_access_token');
              localStorage.removeItem('axon_user');
              localStorage.removeItem('axon_memberships');
            } catch { /* private browsing — proceed */ }
            onReset();
            window.location.href = '/login';
          }}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: '#14b8a6',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

function SectionFallback({
  error,
  onReset,
  onRetry,
}: {
  error: Error;
  onReset: () => void;
  onRetry?: () => void;
}) {
  const handleRetry = () => {
    onReset();
    onRetry?.();
  };

  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-center gap-4"
    >
      <div
        className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-red-100"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="9" stroke="#ef4444" strokeWidth="1.5" />
          <path d="M10 6v4.5M10 13.5h.01" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-red-800" style={{ fontSize: '0.875rem' }}>
          Error al cargar esta seccion
        </p>
        <p className="text-red-600 truncate" style={{ fontSize: '0.75rem' }}>
          {error.message}
        </p>
      </div>
      <button
        onClick={handleRetry}
        className="shrink-0 px-4 py-1.5 rounded-full bg-red-100 text-red-700 font-medium hover:bg-red-200 transition-colors"
        style={{ fontSize: '0.8125rem' }}
      >
        Reintentar
      </button>
    </div>
  );
}

function MinimalFallback({
  error,
  onReset,
  onRetry,
}: {
  error: Error;
  onReset: () => void;
  onRetry?: () => void;
}) {
  const handleRetry = () => {
    onReset();
    onRetry?.();
  };

  return (
    <p role="alert" className="text-red-500" style={{ fontSize: '0.8125rem' }}>
      Error: {error.message}.{' '}
      <button
        onClick={handleRetry}
        className="underline hover:text-red-700 transition-colors"
      >
        Reintentar
      </button>
    </p>
  );
}

// ─── Component ────────────────────────────────────────────────────
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children;
    }

    // Custom fallback (function or element)
    if (this.props.fallback) {
      return typeof this.props.fallback === 'function'
        ? this.props.fallback(this.state.error, this.handleReset)
        : this.props.fallback;
    }

    const variant = this.props.variant ?? 'page';
    const retry = this.props.retry;

    switch (variant) {
      case 'section':
        return (
          <SectionFallback
            error={this.state.error}
            onReset={this.handleReset}
            onRetry={retry}
          />
        );
      case 'minimal':
        return (
          <MinimalFallback
            error={this.state.error}
            onReset={this.handleReset}
            onRetry={retry}
          />
        );
      case 'page':
      default:
        return (
          <PageFallback
            error={this.state.error}
            onReset={this.handleReset}
            onRetry={retry}
          />
        );
    }
  }
}

export default ErrorBoundary;
