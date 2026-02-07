'use client';

import { useLocale } from 'next-intl';
import { localeMap } from '@/i18n/routing';
import { CompetitiveEvent } from '@/types';
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  TagIcon,
  ExclamationTriangleIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import { BoltIcon } from '@heroicons/react/24/solid';

interface CompetitiveEventCardProps {
  event: CompetitiveEvent;
}

const eventTypeConfig = {
  price_drop: {
    icon: ArrowTrendingDownIcon,
    color: 'text-error',
    bgColor: 'bg-error/10',
  },
  price_increase: {
    icon: ArrowTrendingUpIcon,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  new_promo: {
    icon: TagIcon,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  stock_out: {
    icon: ExclamationTriangleIcon,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  new_competitor: {
    icon: UserPlusIcon,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
  },
};

export default function CompetitiveEventCard({ event }: CompetitiveEventCardProps) {
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];
  const config = eventTypeConfig[event.type];
  const EventIcon = config.icon;

  const timestamp = new Date(event.timestamp).toLocaleString(bcp47Locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="p-4 rounded-lg border border-border hover:bg-surface-secondary transition-colors">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.bgColor}`}>
          <EventIcon className={`h-5 w-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm text-foreground">{event.title}</h4>
          </div>
          <p className="text-xs text-muted mb-2">{event.description}</p>
          <div className="text-xs text-muted">{timestamp}</div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted flex-1">{event.recommendedAction}</p>
          <button className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium shrink-0">
            <BoltIcon className="h-3 w-3" />
            Create workflow
          </button>
        </div>
      </div>
    </div>
  );
}
