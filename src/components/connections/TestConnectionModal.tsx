'use client';

import { useTranslations } from 'next-intl';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useConnectionTestQuery } from '@/queries/connections';
import { ConnectionTestResponse } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AuthorizeConnectionButton } from './ConnectionAuth';
import { Placeholder } from '@/components/ui/Placeholder';

interface TestConnectionModalProps {
  connectionId: string;
  connectionName: string;
  onClose: () => void;
}

export default function TestConnectionModal({
  connectionId,
  connectionName,
  onClose,
}: TestConnectionModalProps) {
  const t = useTranslations('ConnectionDetail');
  const tCommon = useTranslations('Common');
  // The dialog is mounted only while open, so the test runs on mount and the
  // retry button is a refetch of the same query.
  const {
    data: result,
    isFetching: loading,
    error,
    refetch: runTest,
  } = useConnectionTestQuery(connectionId);

  return (
    <Modal isOpen={true} onClose={onClose} title={t('testConnection')} size="md">
      <div className="space-y-4">
        <p className="text-sm text-muted">{connectionName}</p>

        {loading && (
          <Placeholder size="sm">{t('testRunning')}</Placeholder>
        )}

        {!loading && error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-error/10 border border-error/30">
            <XCircleIcon className="h-6 w-6 text-error shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-error">{t('testFailed')}</p>
              <p className="text-sm text-foreground mt-1 break-words">
                {getErrorMessage(error, t('testError'))}
              </p>
            </div>
          </div>
        )}

        {/* `!error` matters: a retry that fails keeps the previous success in
            `data`, and without this the dialog shows "failed" and "connected"
            side by side. */}
        {!loading && !error && result && (
          <TestResultView result={result} connectionId={connectionId} />
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => runTest()}
            loading={loading}
            disabled={loading}
          >
            {t('testRetry')}
          </Button>
          <Button type="button" onClick={onClose} className="flex-1" disabled={loading}>
            {tCommon('close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TestResultView({
  result,
  connectionId,
}: {
  result: ConnectionTestResponse;
  connectionId: string;
}) {
  const t = useTranslations('ConnectionDetail');
  const tAuth = useTranslations('ConnectionAuth');

  if (!result.valid) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-error/10 border border-error/30">
        <XCircleIcon className="h-6 w-6 text-error shrink-0" />
        <div className="min-w-0">
          <p className="font-medium text-error">{t('testInvalid')}</p>
          {result.errorMessage && (
            <p className="text-sm text-foreground mt-1 break-words">{result.errorMessage}</p>
          )}
          {result.errorField && (
            <p className="text-xs text-muted mt-1">{t('testErrorField')}: {result.errorField}</p>
          )}
        </div>
      </div>
    );
  }

  const title = result.displayName || result.identifier || t('testConnected');

  // Reachable and the input is fine — what's missing is the user's consent.
  // Reporting this as a failed check would send them editing a correct URL.
  if (result.authorizationRequired) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
        <ExclamationTriangleIcon className="h-6 w-6 text-warning shrink-0" />
        <div className="min-w-0">
          <p className="font-medium text-warning">{tAuth('testNeedsAuth')}</p>
          <p className="text-sm text-foreground mt-1 break-words">{title}</p>
          <AuthorizeConnectionButton
            connectionId={connectionId}
            status="AUTH_EXPIRED"
            className="mt-3"
          />
        </div>
      </div>
    );
  }

  // valid but tools failed to load
  if (result.toolsError) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
        <ExclamationTriangleIcon className="h-6 w-6 text-warning shrink-0" />
        <div className="min-w-0">
          <p className="font-medium text-warning">{t('testConnectedToolsFailed')}</p>
          <p className="text-sm text-foreground mt-1 break-words">{title}</p>
          <p className="text-sm text-muted mt-1 break-words">{result.toolsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-success/10 border border-success/30">
      <CheckCircleIcon className="h-6 w-6 text-success shrink-0" />
      <div className="min-w-0">
        <p className="font-medium text-success">
          {result.toolsDiscovered != null
            ? t('testConnectedWithTools', { count: result.toolsDiscovered })
            : t('testConnected')}
        </p>
        <p className="text-sm text-foreground mt-1 break-words">{title}</p>
        {result.identifier && result.displayName && (
          <p className="text-xs text-muted mt-1 font-mono break-all">{result.identifier}</p>
        )}
      </div>
    </div>
  );
}
