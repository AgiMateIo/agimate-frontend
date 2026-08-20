'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useClipboard } from '@/hooks/useClipboard';
import { formatDateTimeFull } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import apiService from '@/services/api';
import { useTriggerProbeQuery } from '@/queries/logs';
import type { TriggerLog } from '@/types';

interface TriggerProbeModalProps {
  onClose: () => void;
  // Called when the user confirms the captured trigger; the form uses it to
  // pre-fill the connector/connection binding and offer the payload for filters.
  onCaptured: (log: TriggerLog) => void;
}

type Phase = 'issuing' | 'waiting' | 'success' | 'expired' | 'error';

const POLL_INTERVAL_MS = 2500;
const TIMEOUT_MS = 90 * 1000;

// Mounted only while open (see ChannelConfigForm), so mount is the opening: the
// probe query issues one code per opening and unmounting discards it.
export function TriggerProbeModal({ onClose, onCaptured }: TriggerProbeModalProps) {
  const t = useTranslations('Channels');
  const { copied, copy } = useClipboard();

  const {
    data: probe,
    isFetching: issuing,
    error: issueError,
    refetch: reissue,
  } = useTriggerProbeQuery();

  const [match, setMatch] = useState<TriggerLog | null>(null);
  const [expired, setExpired] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Derived, not stored: every phase is a fact already held by the query and the
  // three flags below, so there is no second copy to keep in step with them.
  const error = matchError ?? (issueError ? getErrorMessage(issueError, t('probeErrorIssue')) : null);
  // `issuing` comes first: while a replacement code is in flight, `probe` still
  // holds the spent one, and any later branch would show it as live — offering
  // copy on a dead code and polling for an event that can no longer match.
  const phase: Phase = issuing
    ? 'issuing'
    : error
      ? 'error'
      : match
        ? 'success'
        : expired
          ? 'expired'
          : probe
            ? 'waiting'
            : 'issuing';

  const runMatch = useCallback(async () => {
    if (!probe) return;
    try {
      const log = await apiService.matchTriggerLogProbe(probe.code, probe.issuedAt);
      if (log) setMatch(log);
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : t('probeErrorMatch'));
    }
  }, [probe, t]);

  // Poll for a match while waiting; give up after the timeout. The window starts
  // when this browser received the code rather than at the server's `issuedAt`,
  // so a clock skew cannot shorten it.
  useEffect(() => {
    if (phase !== 'waiting') return;
    const startedAt = Date.now();
    let cancelled = false;
    const id = setInterval(async () => {
      if (cancelled) return;
      if (Date.now() - startedAt >= TIMEOUT_MS) {
        setExpired(true);
        return;
      }
      await runMatch();
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [phase, runMatch]);

  const handleCheckNow = async () => {
    if (checking || phase !== 'waiting') return;
    setChecking(true);
    try {
      await runMatch();
    } finally {
      setChecking(false);
    }
  };

  // Regenerate clears the spent attempt before asking for a new code.
  const handleRegenerate = () => {
    setMatch(null);
    setExpired(false);
    setMatchError(null);
    reissue();
  };

  // Closing and capturing both unmount the dialog, which is what discards the
  // spent probe — no explicit reset to keep in step with the state above.
  const handleUse = () => {
    if (match) onCaptured(match);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('probeTitle')} size="md">
      <div className="space-y-4">
        <p className="text-sm text-muted">{t('probeIntro')}</p>

        {phase === 'issuing' && (
          <div className="text-sm text-muted italic">{t('probeStatusIssuing')}</div>
        )}

        {probe && phase !== 'issuing' && phase !== 'error' && (
          <div className="space-y-1.5">
            <div className="text-xs text-muted">{t('probeCodeLabel')}</div>
            <div className="flex items-stretch gap-2">
              <code className="flex-1 px-3 py-2.5 bg-surface-secondary border border-border rounded-lg font-mono text-sm text-foreground select-all break-all">
                {probe.code}
              </code>
              <button
                type="button"
                onClick={() => copy(probe.code)}
                className="px-3 py-2.5 bg-surface-secondary border border-border rounded-lg hover:bg-border transition-colors flex items-center gap-1.5 text-xs text-foreground"
                title={copied ? t('probeCopied') : t('probeCopy')}
              >
                {copied ? <CheckIcon className="h-4 w-4 text-success" /> : <ClipboardIcon className="h-4 w-4" />}
                <span>{copied ? t('probeCopied') : t('probeCopy')}</span>
              </button>
            </div>
          </div>
        )}

        {phase === 'waiting' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              {t('probeStatusWaiting')}
            </div>
            <Button type="button" variant="secondary" onClick={handleCheckNow} disabled={checking}>
              {t('probeCheckNow')}
            </Button>
          </div>
        )}

        {phase === 'success' && match && (
          <div className="space-y-3">
            <Alert variant="success">{t('probeSuccess')}</Alert>
            <div className="space-y-2 rounded-lg border border-border p-3">
              <DetailRow label={t('probeConnectorLabel')} value={match.connectorCode} mono />
              <DetailRow label={t('probeOccurredAtLabel')} value={formatDateTimeFull(match.occurredAt)} />
              <div className="space-y-1">
                <div className="text-xs text-muted">{t('probePayloadLabel')}</div>
                <pre className="max-h-48 overflow-auto text-xs font-mono bg-surface-secondary border border-border rounded-lg p-3 whitespace-pre-wrap break-all">
                  {JSON.stringify(match.input, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {phase === 'expired' && <Alert variant="warning">{t('probeExpired')}</Alert>}

        {phase === 'error' && error && <Alert variant="error">{error}</Alert>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('probeClose')}
          </Button>
          {(phase === 'expired' || phase === 'error') && (
            <Button type="button" onClick={handleRegenerate}>
              {t('probeRegenerate')}
            </Button>
          )}
          {phase === 'success' && (
            <>
              <Button type="button" variant="secondary" onClick={handleRegenerate}>
                {t('probeRetry')}
              </Button>
              <Button type="button" onClick={handleUse}>
                {t('probeUse')}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="text-muted w-28 shrink-0">{label}</span>
      <span className={`text-foreground break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
