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
import { Placeholder } from '@/components/ui/Placeholder';
import { useIdSet } from '@/hooks/useIdSet';

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
  const tCommon = useTranslations('Common');
  const { data: jobs, isPending, error, refetch } = useConnectionJobsQuery(connectionId);
  const [actionError, setActionError] = useState('');
  const expanded = useIdSet();
  const acting = useIdSet();
  const [deleteTarget, setDeleteTarget] = useState<ConnectorJobResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const withActing = async (id: string, action: () => Promise<void>) => {
    acting.add(id);
    setActionError('');
    try {
      await action();
    } catch (err) {
      setActionError(getErrorMessage(err, t('actionFailed')));
    } finally {
      acting.remove(id);
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
    return <Placeholder>{t('loading')}</Placeholder>;
  }
  if (error) {
    return <ErrorAlert>{getErrorMessage(error, t('actionFailed'))}</ErrorAlert>;
  }
  if (jobs.length === 0) {
    return <Placeholder>{t('noJobs')}</Placeholder>;
  }

  return (
    <div className="space-y-4">
      {actionError && <ErrorAlert>{actionError}</ErrorAlert>}
      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            isExpanded={expanded.has(job.id)}
            acting={acting.has(job.id)}
            onToggleExpand={() => expanded.toggle(job.id)}
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
              {tCommon('cancel')}
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>
              {tCommon('delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
