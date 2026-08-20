'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

/**
 * The net under the whole dashboard: whatever a page's own `ErrorBoundary` did
 * not catch lands here instead of taking the document down.
 *
 * Next nests a segment's error boundary *inside* that segment's layout, so this
 * renders in the same `<main>` the pages do — sidebar and top bar stay up and
 * the user can navigate away. The flip side of the same rule: an error thrown by
 * `dashboard/layout.tsx` itself passes over this file, and only an
 * `app/global-error.tsx` would see it.
 *
 * This is a net, not a substitute for the per-page shell: a boundary closer to
 * the data keeps the page header and replaces one card, and it is the one that
 * gets to say what specifically failed to load.
 */
export default function DashboardError({
  error,
  // Next 16 hands the component both `reset` (clear the boundary and re-render
  // from the cached payload) and `retry` (`router.refresh()` and then reset).
  // `retry` is the documented prop and the only one that re-runs the segment's
  // server render, so a failure that happened there gets a real second chance.
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations('Common');
  // React Query keeps a thrown error in its cache and forces `retryOnMount:
  // false` until an error-reset boundary is reset. Without this call the
  // remounted page re-throws the same cached error at once and the button looks
  // broken — the same reason `ui/ErrorBoundary` wraps itself in
  // QueryErrorResetBoundary.
  const { reset: resetQueryErrors } = useQueryErrorResetBoundary();

  useEffect(() => {
    console.error('[dashboard] uncaught render error:', error);
  }, [error]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('unexpectedErrorTitle')}</h1>
        <p className="text-muted mt-1">{t('unexpectedErrorHint')}</p>
      </div>

      {/* Empty in production for an error thrown during the server render —
          Next replaces the message and leaves only the digest. */}
      {error.message && <ErrorAlert>{error.message}</ErrorAlert>}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          onClick={() => {
            resetQueryErrors();
            retry();
          }}
        >
          {t('retry')}
        </Button>
        {error.digest && (
          <span className="font-mono text-xs text-muted">{error.digest}</span>
        )}
      </div>
    </div>
  );
}
