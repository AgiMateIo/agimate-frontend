'use client';

import { Component, type ReactNode } from 'react';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) {
        return this.props.fallback({ error, reset: this.reset });
      }
      return <ErrorAlert>{error.message}</ErrorAlert>;
    }
    return this.props.children;
  }
}
