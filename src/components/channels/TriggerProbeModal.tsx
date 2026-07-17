'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useClipboard } from '@/hooks/useClipboard';
import { formatDateTimeFull } from '@/utils/date';
import apiService from '@/services/api';
import type { TriggerLog, TriggerLogProbeResponse } from '@/types';

interface TriggerProbeModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Called when the user confirms the captured trigger; the form uses it to
  // pre-fill the connector/connection binding and offer the payload for filters.
  onCaptured: (log: TriggerLog) => void;
}

type Phase = 'issuing' | 'waiting' | 'success' | 'expired' | 'error';

const POLL_INTERVAL_MS = 2500;
const TIMEOUT_MS = 90 * 1000;

export function TriggerProbeModal({ isOpen, onClose, onCaptured }: TriggerProbeModalProps) {
  const t = useTranslations('Channels');
  const { copied, copy } = useClipboard();

  const [phase, setPhase] = useState<Phase>('issuing');
  const [probe, setProbe] = useState<TriggerLogProbeResponse | null>(null);
  const [match, setMatch] = useState<TriggerLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const startedAtRef = useRef<number>(0);
  const probeRef = useRef<TriggerLogProbeResponse | null>(null);
  probeRef.current = probe;

  const issueProbe = useCallback(async () => {
    setPhase('issuing');
    setError(null);
    setProbe(null);
    setMatch(null);
    try {
      // Always block delivery: the test event is logged but never wakes an agent.
      const result = await apiService.issueTriggerLogProbe(true);
      setProbe(result);
      startedAtRef.current = Date.now();
      setPhase('waiting');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('probeErrorIssue'));
      setPhase('error');
    }
  }, [t]);

  const runMatch = useCallback(async (): Promise<boolean> => {
    const current = probeRef.current;
    if (!current) return false;
    try {
      const log = await apiService.matchTriggerLogProbe(current.code, current.issuedAt);
      if (log) {
        setMatch(log);
        setPhase('success');
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('probeErrorMatch'));
      setPhase('error');
      return true; // stop polling
    }
  }, [t]);

  // Issue a fresh probe each time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    issueProbe();
  }, [isOpen, issueProbe]);

  // Poll for a match while waiting; give up after the timeout.
  useEffect(() => {
    if (!isOpen || phase !== 'waiting') return;
    let cancelled = false;
    const id = setInterval(async () => {
      if (cancelled) return;
      if (Date.now() - startedAtRef.current >= TIMEOUT_MS) {
        setPhase('expired');
        return;
      }
      await runMatch();
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isOpen, phase, runMatch]);

  const handleCheckNow = async () => {
    if (checking || phase !== 'waiting') return;
    setChecking(true);
    try {
      await runMatch();
    } finally {
      setChecking(false);
    }
  };

  const reset = () => {
    setProbe(null);
    setMatch(null);
    setError(null);
    setPhase('issuing');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleUse = () => {
    if (!match) return;
    onCaptured(match);
    reset();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('probeTitle')} size="md">
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
          <Button type="button" variant="secondary" onClick={handleClose}>
            {t('probeClose')}
          </Button>
          {(phase === 'expired' || phase === 'error') && (
            <Button type="button" onClick={issueProbe}>
              {t('probeRegenerate')}
            </Button>
          )}
          {phase === 'success' && (
            <>
              <Button type="button" variant="secondary" onClick={issueProbe}>
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
