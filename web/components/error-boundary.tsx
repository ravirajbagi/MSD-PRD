'use client';

import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * ErrorBoundary — catches React render errors and shows a graceful fallback.
 * Wraps page content to prevent full white-screen crashes.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production, this would go to Sentry/Datadog
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="flex flex-col items-center justify-center min-h-screen px-4 text-center"
          style={{ backgroundColor: '#0a0a0a' }}
        >
          <div
            className="flex flex-col items-center gap-6 max-w-md"
          >
            <div
              className="flex items-center justify-center w-14 h-14 rounded-xl"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgb(239,68,68)" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: '#f5f5f5', fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
              >
                Something went wrong
              </h2>
              <p
                className="text-sm mb-4"
                style={{ color: '#888888', fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: '11px' }}
              >
                {this.state.errorMessage}
              </p>
            </div>
            <a
              href="/"
              className="px-6 py-2.5 rounded-md text-sm font-semibold transition-colors"
              style={{ backgroundColor: '#f97316', color: '#ffffff' }}
            >
              Start Over
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
