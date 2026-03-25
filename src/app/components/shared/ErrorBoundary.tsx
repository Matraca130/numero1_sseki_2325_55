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
          padding: '2rem',
          margin: '1rem',
          borderRadius: '0.5rem',
          border: '1px solid #fca5a5',
          backgroundColor: '#fef2f2',
          textAlign: 'center',
        }}
      >
        <h3 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>
          Algo salió mal
        </h3>
        <p style={{ color: '#7f1d1d', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {this.state.error.message}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button
            onClick={this.handleReset}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Intentar de nuevo
          </button>
          <button
            onClick={() => {
              if (window.confirm('¿Seguro que deseas cerrar sesión?')) {
                localStorage.removeItem('axon_access_token');
                window.location.href = '/';
              }
            }}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid #fca5a5',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
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
