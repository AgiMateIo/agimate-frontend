'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { useConnectionJobsQuery } from '@/queries/connections';
import { ConnectorJobResponse } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { JobCard } from '@/components/connectors/JobCard';

interface ConnectionJobsTabProps {
  connectionId: string;
}

// Background jobs scheduled for a single connection. Listing is by connectionId;
// lifecycle actions (pause/resume/run-now/delete) go by job id through the
// shared connector-jobs endpoints. JobCard hides Delete for SYSTEM jobs.
// Cards, not the cross-connector table: everything the table's connector and
// connection columns carried is this page's own context.
export default function ConnectionJobsTab({ connectionId }: ConnectionJobsTabProps) {
  const t = useTranslations('ConnectorJobs');
  const { data: jobs, isPending, error, refetch } = useConnectionJobsQuery(connectionId);
  const [actionError, setActionError] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [actingIds, setActingIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ConnectorJobResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const withActing = async (id: string, action: () => Promise<void>) => {
    setActingIds((prev) => new Set(prev).add(id));
    setActionError('');
    try {
      await action();
    } catch (err) {
      setActionError(getErrorMessage(err, t('actionFailed')));
    } finally {
      setActingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const runAction = (id: string, action: () => Promise<void>) =>
    withActing(id, async () => {
      await action();
      await refetch();
    });

  const handleRunNow = (id: string) =>
    withActing(id, async () => {
      // Fire-and-forget: 200 means "queued". Refetch now, then again shortly so
      // the user sees the status transition (PENDING → RUNNING → …).
      await apiService.runConnectorJobNow(id);
      await refetch();
      setTimeout(() => { refetch(); }, 1500);
    });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError('');
    try {
      await apiService.deleteConnectorJob(deleteTarget.id);
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      setActionError(getErrorMessage(err, t('actionFailed')));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  if (isPending) {
    return <div className="text-center py-12 text-muted">{t('loading')}</div>;
  }
  if (error) {
    return <ErrorAlert>{getErrorMessage(error, t('actionFailed'))}</ErrorAlert>;
  }
  if (jobs.length === 0) {
    return <div className="text-center py-12 text-muted">{t('noJobs')}</div>;
  }

  return (
    <div className="space-y-4">
      {actionError && <ErrorAlert>{actionError}</ErrorAlert>}
      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            isExpanded={expandedIds.has(job.id)}
            acting={actingIds.has(job.id)}
            onToggleExpand={() => toggleExpand(job.id)}
            onRunNow={() => handleRunNow(job.id)}
            onPause={() => runAction(job.id, () => apiService.pauseConnectorJob(job.id))}
            onResume={() => runAction(job.id, () => apiService.resumeConnectorJob(job.id))}
            onDelete={() => setDeleteTarget(job)}
          />
        ))}
      </div>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => { if (!deleting) setDeleteTarget(null); }}
        title={t('deleteTitle')}
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            {t('deleteConfirm', { name: deleteTarget?.name ?? '' })}
          </p>
          <p className="text-sm text-muted">{t('deleteWarning')}</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t('cancel')}
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>
              {t('delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
