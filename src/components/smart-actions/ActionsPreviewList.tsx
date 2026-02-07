'use client';

import { Link } from '@/i18n/navigation';
import { SmartAction } from '@/types';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

interface ActionsPreviewListProps {
  actions: SmartAction[];
  limit?: number;
}

const severityStyles = {
  CRITICAL: 'bg-error/10 text-error border-error/20',
  HIGH: 'bg-warning/10 text-warning border-warning/20',
  MEDIUM: 'bg-accent/10 text-accent border-accent/20',
  LOW: 'bg-muted/10 text-muted border-muted/20',
};

export default function ActionsPreviewList({ actions, limit = 3 }: ActionsPreviewListProps) {
  const displayedActions = actions.slice(0, limit);

  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">Smart Actions</h3>
        <Link
          href="/dashboard/smart-actions"
          className="text-sm text-accent hover:text-accent/80 font-medium flex items-center gap-1 transition-colors"
        >
          View all
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
      <div className="space-y-3">
        {displayedActions.map((action) => (
          <div
            key={action.id}
            className="p-3 rounded-lg border border-border hover:bg-surface-secondary transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${severityStyles[action.severity]}`}>
                    {action.severity}
                  </span>
                </div>
                <div className="font-medium text-sm text-foreground truncate">{action.title}</div>
                <div className="text-xs text-muted mt-1 line-clamp-1">{action.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
