'use client';

import { useLocale } from 'next-intl';
import { localeMap } from '@/i18n/routing';
import { useState, useEffect } from 'react';
import apiService from '@/services/api';
import { WebhookDelivery } from '@/types';
import { Alert } from '@/components/ui/Alert';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface WebhookHistoryProps {
  webhookId: string;
}

export default function WebhookHistory({ webhookId }: WebhookHistoryProps) {
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    const fetchDeliveries = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await apiService.getWebhookDeliveries(webhookId, page, pageSize);
        setDeliveries(response.content);
        setTotalElements(response.totalElements);
        setTotalPages(Math.ceil(response.totalElements / pageSize));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load delivery history');
        setDeliveries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveries();
  }, [webhookId, page]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString.replace(' ', 'T'));
    return new Intl.DateTimeFormat(bcp47Locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getStatusBadge = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'bg-success/10 text-success border-success/20';
    if (statusCode >= 400 && statusCode < 500) return 'bg-warning/10 text-warning border-warning/20';
    if (statusCode >= 500) return 'bg-error/10 text-error border-error/20';
    return 'bg-muted/10 text-muted border-muted/20';
  };

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (loading) {
    return <div className="text-center py-12 text-muted">Loading delivery history...</div>;
  }

  if (deliveries.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <p>No deliveries recorded yet</p>
        <p className="text-xs mt-2">Deliveries will appear here when the webhook is triggered</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="text-sm text-muted">
        {totalElements} {totalElements === 1 ? 'delivery' : 'deliveries'} total
      </div>

      {/* Deliveries Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted">Status</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted">Event Type</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted">URL</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted">Duration</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted">Triggered At</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => (
              <tr
                key={delivery.id}
                className="border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors"
              >
                <td className="py-3 px-4">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(
                      delivery.responseStatusCode
                    )}`}
                  >
                    {delivery.responseStatusCode}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm font-mono text-foreground">{delivery.eventType}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm font-mono text-muted truncate max-w-xs block">
                    {delivery.requestUrl}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-foreground">{delivery.durationMs}ms</span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-muted">{formatDate(delivery.triggeredAt)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-sm text-muted">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-surface-secondary text-foreground hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-surface-secondary text-foreground hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
