'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { ConnectorJobResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { RefreshControls } from '@/components/ui/RefreshControls';
import { Pagination } from '@/components/ui/Pagination';
import { getErrorMessage } from '@/utils/error';
import { JobRow } from './JobRow';
import { JobsFilters } from './JobsFilters';
import { useConnectorJobs } from './useConnectorJobs';
import { Placeholder } from '@/components/ui/Placeholder';
import { useIdSet } from '@/hooks/useIdSet';

export default function ConnectorJobsTab() {
  const t = useTranslations('ConnectorJobs');
  const tCommon = useTranslations('Common');
  const {
    pagedData,
    loading,
    error,
    page,
    setPage,
    pageSize,
    handlePageSizeChange,
    kindFilter,
    handleKindFilterChange,
    codeFilter,
    handleCodeFilterChange,
    debouncedCodeFilter,
    refreshInterval,
    setRefreshInterval,
    fetchData,
  } = useConnectorJobs();

  const [actionError, setActionError] = useState('');
  const expanded = useIdSet();
  const acting = useIdSet();
  const [deleteTarget, setDeleteTarget] = useState<ConnectorJobResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const runAction = async (id: string, action: () => Promise<void>) => {
    acting.add(id);
    setActionError('');
    try {
      await action();
      await fetchData();
    } catch (err) {
      setActionError(getErrorMessage(err, t('actionFailed')));
    } finally {
      acting.remove(id);
    }
  };

  const handleRunNow = async (id: string) => {
    acting.add(id);
    setActionError('');
    try {
      // Fire-and-forget: 200 means "queued". The actual run happens within ~1s.
      await apiService.runConnectorJobNow(id);
      await fetchData();
      // Re-fetch after a short delay so the user sees the status transition (PENDING → RUNNING → …).
      setTimeout(() => { fetchData(); }, 1500);
    } catch (err) {
      setActionError(getErrorMessage(err, t('actionFailed')));
    } finally {
      acting.remove(id);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError('');
    try {
      await apiService.deleteConnectorJob(deleteTarget.id);
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      setActionError(getErrorMessage(err, t('actionFailed')));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const jobs = pagedData?.content ?? [];
  const totalElements = pagedData?.totalElements ?? 0;
  const totalPages = pagedData?.totalPages ?? 0;
  const hasFilters = kindFilter !== '' || debouncedCodeFilter !== '';

  const refreshControls = (
    <RefreshControls
      value={refreshInterval}
      onChange={setRefreshInterval}
      onRefresh={() => fetchData()}
    />
  );

  const filters = (
    <JobsFilters
      codeFilter={codeFilter}
      onCodeFilterChange={handleCodeFilterChange}
      kindFilter={kindFilter}
      onKindFilterChange={handleKindFilterChange}
    />
  );

  const pagination = (
    <Pagination
      page={page}
      pageSize={pageSize}
      totalElements={totalElements}
      totalPages={totalPages}
      onPageChange={setPage}
      onPageSizeChange={handlePageSizeChange}
      rowsPerPageLabel={t('rowsPerPage')}
    />
  );

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{refreshControls}</div>
        <ErrorAlert>{error}</ErrorAlert>
      </div>
    );
  }

  if (loading) {
    return <Placeholder>{t('loading')}</Placeholder>;
  }

  if (jobs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          {filters}
          {refreshControls}
        </div>
        {actionError && <ErrorAlert>{actionError}</ErrorAlert>}
        <Placeholder>
          {hasFilters ? t('noJobsFiltered') : t('noJobs')}
        </Placeholder>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {filters}
          <div className="text-sm text-muted">{t('jobsTotal', { count: totalElements })}</div>
        </div>
        {refreshControls}
      </div>
      {actionError && <ErrorAlert>{actionError}</ErrorAlert>}
      <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('kindLabel')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('connector')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('job')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('schedule')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('nextRun')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('statusLabel')}</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted">{t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <JobRow
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
        </tbody>
      </table>
      </div>
      {pagination}

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
