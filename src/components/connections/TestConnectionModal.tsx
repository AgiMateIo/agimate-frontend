'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { ConnectionTestResponse } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

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
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ConnectionTestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiService.testConnection(connectionId);
      setResult(res);
    } catch (err) {
      setError(getErrorMessage(err, t('testError')));
    } finally {
      setLoading(false);
    }
  }, [connectionId, t]);

  useEffect(() => {
    runTest();
    // run once on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal isOpen={true} onClose={onClose} title={t('testConnection')} size="md">
      <div className="space-y-4">
        <p className="text-sm text-muted">{connectionName}</p>

        {loading && (
          <div className="text-center py-8 text-muted">{t('testRunning')}</div>
        )}

        {!loading && error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-error/10 border border-error/30">
            <XCircleIcon className="h-6 w-6 text-error shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-error">{t('testFailed')}</p>
              <p className="text-sm text-foreground mt-1 break-words">{error}</p>
            </div>
          </div>
        )}

        {!loading && result && (
          <TestResultView result={result} />
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={runTest}
            loading={loading}
            disabled={loading}
          >
            {t('testRetry')}
          </Button>
          <Button type="button" onClick={onClose} className="flex-1" disabled={loading}>
            {t('close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TestResultView({ result }: { result: ConnectionTestResponse }) {
  const t = useTranslations('ConnectionDetail');

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
