'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useClipboard } from '@/hooks/useClipboard';
import apiService from '@/services/api';
import type { TriggerLog, TriggerLogProbeResponse } from '@/types';

interface ProbeCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptured: (log: TriggerLog) => void;
}

type Phase = 'issuing' | 'waiting' | 'expired' | 'error';

const POLL_INTERVAL_MS = 2000;
const EXPIRY_MS = 10 * 60 * 1000;

export function ProbeCaptureModal({ isOpen, onClose, onCaptured }: ProbeCaptureModalProps) {
  const t = useTranslations('Channels');
  const { copied, copy } = useClipboard();

  const [phase, setPhase] = useState<Phase>('issuing');
  const [probe, setProbe] = useState<TriggerLogProbeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const issuedAtRef = useRef<number>(0);
  const probeRef = useRef<TriggerLogProbeResponse | null>(null);
  probeRef.current = probe;

  const issueProbe = useCallback(async () => {
    setPhase('issuing');
    setError(null);
    setProbe(null);
    try {
      const result = await apiService.issueTriggerLogProbe(true);
      setProbe(result);
      issuedAtRef.current = Date.now();
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
        onCaptured(log);
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('probeErrorMatch'));
      setPhase('error');
      return true; // stop polling
    }
  }, [onCaptured, t]);

  // Issue a fresh probe each time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    issueProbe();
  }, [isOpen, issueProbe]);

  // Poll for a match while in waiting phase.
  useEffect(() => {
    if (!isOpen || phase !== 'waiting') return;
    let cancelled = false;
    const id = setInterval(async () => {
      if (cancelled) return;
      if (Date.now() - issuedAtRef.current >= EXPIRY_MS) {
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

  const handleClose = () => {
    setProbe(null);
    setError(null);
    setPhase('issuing');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('probeTitle')} size="md">
      <div className="space-y-4">
        <p className="text-sm text-muted">{t('probeIntro')}</p>

        {phase === 'issuing' && (
          <div className="text-sm text-muted italic">{t('probeStatusIssuing')}</div>
        )}

        {probe && (phase === 'waiting' || phase === 'expired') && (
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

        {phase === 'expired' && (
          <Alert variant="warning">{t('probeExpired')}</Alert>
        )}

        {phase === 'error' && error && (
          <Alert variant="error">{error}</Alert>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            {t('probeClose')}
          </Button>
          {(phase === 'expired' || phase === 'error') && (
            <Button type="button" onClick={issueProbe}>
              {t('probeRegenerate')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
