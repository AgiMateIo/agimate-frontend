'use client';

import { useLocale } from 'next-intl';
import { localeMap } from '@/i18n/routing';
import { SmartAction } from '@/types';
import { BoltIcon } from '@heroicons/react/24/outline';

interface SmartActionCardProps {
  action: SmartAction;
}

const severityStyles = {
  CRITICAL: {
    badge: 'bg-error/10 text-error border-error/20',
    border: 'border-l-error',
  },
  HIGH: {
    badge: 'bg-warning/10 text-warning border-warning/20',
    border: 'border-l-warning',
  },
  MEDIUM: {
    badge: 'bg-accent/10 text-accent border-accent/20',
    border: 'border-l-accent',
  },
  LOW: {
    badge: 'bg-muted/10 text-muted border-muted/20',
    border: 'border-l-muted',
  },
};

export default function SmartActionCard({ action }: SmartActionCardProps) {
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];
  const styles = severityStyles[action.severity];
  const createdAt = new Date(action.createdAt).toLocaleString(bcp47Locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`bg-surface rounded-xl border border-border border-l-4 ${styles.border} p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${styles.badge}`}>
              {action.severity}
            </span>
            <span className="text-xs text-muted">{createdAt}</span>
          </div>
          <h3 className="font-semibold text-foreground mb-2">{action.title}</h3>
          <p className="text-sm text-muted mb-3">{action.description}</p>

          <div className="bg-surface-secondary rounded-lg p-3 mb-3">
            <div className="text-xs font-medium text-muted uppercase mb-1">Recommendation</div>
            <p className="text-sm text-foreground">{action.recommendation}</p>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">Estimated impact:</span>
            <span className="font-medium text-success">{action.estimatedImpact}</span>
          </div>
        </div>

        <button className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors shrink-0">
          <BoltIcon className="h-4 w-4" />
          Automate
        </button>
      </div>
    </div>
  );
}
