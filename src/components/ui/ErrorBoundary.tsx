'use client';

import { Component, type ReactNode } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Button } from '@/components/ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  // Custom fallback. `reset` clears the boundary AND resets caught query errors,
  // so a suspense retry refetches instead of immediately re-throwing the cached error.
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
  // When any value here changes while errored, the boundary auto-clears (e.g. a new
  // route id) — recovering without a manual retry when the user navigates.
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  error: Error | null;
}

function keysChanged(a: unknown[] | undefined, b: unknown[] | undefined): boolean {
  if (a === b) return false;
  if (!a || !b || a.length !== b.length) return true;
  return a.some((v, i) => !Object.is(v, b[i]));
}

// Default fallback: the error message plus a Retry that re-runs the failed query.
function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('Common');
  return (
    <div className="space-y-3">
      <ErrorAlert>{error.message}</ErrorAlert>
      <Button variant="outline" onClick={reset}>{t('retry')}</Button>
    </div>
  );
}

type InnerProps = ErrorBoundaryProps & { onReset: () => void };

class ErrorBoundaryInner extends Component<InnerProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(prev: InnerProps) {
    if (this.state.error && keysChanged(prev.resetKeys, this.props.resetKeys)) {
      this.reset();
    }
  }

  reset = () => {
    // Reset caught query errors first so the re-rendered children refetch
    // instead of immediately re-throwing the cached error, then clear the boundary.
    this.props.onReset();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      return this.props.fallback
        ? this.props.fallback({ error, reset: this.reset })
        : <DefaultErrorFallback error={error} reset={this.reset} />;
    }
    return this.props.children;
  }
}

// Wrapped in QueryErrorResetBoundary so `reset` also clears React Query's caught
// errors — a suspense query then refetches on retry rather than re-throwing.
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => <ErrorBoundaryInner onReset={reset} {...props} />}
    </QueryErrorResetBoundary>
  );
}
