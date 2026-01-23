'use client';

import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/solid';

interface MetricsCardProps {
  title: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

export default function MetricsCard({
  title,
  value,
  delta,
  deltaLabel,
  variant = 'default',
}: MetricsCardProps) {
  const isPositive = delta !== undefined && delta >= 0;

  const variantStyles = {
    default: 'border-border',
    success: 'border-l-4 border-l-success border-border',
    warning: 'border-l-4 border-l-warning border-border',
    info: 'border-l-4 border-l-accent border-border',
  };

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString('ru-RU');
    }
    return val;
  };

  return (
    <div className={`bg-surface rounded-xl border p-5 ${variantStyles[variant]}`}>
      <div className="text-sm font-medium text-muted mb-2">{title}</div>
      <div className="text-2xl font-bold text-foreground mb-1">
        {formatValue(value)}
      </div>
      {delta !== undefined && (
        <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-success' : 'text-error'}`}>
          {isPositive ? (
            <ArrowTrendingUpIcon className="h-4 w-4" />
          ) : (
            <ArrowTrendingDownIcon className="h-4 w-4" />
          )}
          <span>{isPositive ? '+' : ''}{delta}%</span>
          {deltaLabel && <span className="text-muted ml-1">{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}
