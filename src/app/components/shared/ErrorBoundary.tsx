import React, { Component, type ErrorInfo, type ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────
export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback UI */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Optional handler called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
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
    // TODO: replace with logger.ts when P0-03 lands
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
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

    // Default fallback UI
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
          <h3 style={{ color: '#ffffff', marginBottom: '0.5rem', fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.25rem' }}>
            Algo salio mal
          </h3>
          <p style={{ color: '#a1a1aa', fontSize: '0.875rem', maxWidth: '28rem' }}>
            Ocurrio un error inesperado. Puedes reintentar o volver al inicio.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={this.handleReset}
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
              localStorage.removeItem('axon_active_membership');
              localStorage.removeItem('axon_access_token');
              localStorage.removeItem('axon_user');
              localStorage.removeItem('axon_memberships');
              this.setState({ hasError: false, error: null });
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
}

export default ErrorBoundary;
