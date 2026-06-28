'use client';

import { useTranslations } from 'next-intl';
import { ConnectorJobKind } from '@/types';

const KIND_OPTIONS: ConnectorJobKind[] = ['SYSTEM', 'AGENT', 'USER'];

interface JobsFiltersProps {
  codeFilter: string;
  onCodeFilterChange: (value: string) => void;
  kindFilter: ConnectorJobKind | '';
  onKindFilterChange: (value: ConnectorJobKind | '') => void;
}

export function JobsFilters({
  codeFilter,
  onCodeFilterChange,
  kindFilter,
  onKindFilterChange,
}: JobsFiltersProps) {
  const t = useTranslations('ConnectorJobs');

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={codeFilter}
        onChange={(e) => onCodeFilterChange(e.target.value)}
        placeholder={t('filterByConnector')}
        className="bg-surface-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground placeholder:text-muted w-40"
      />
      <select
        value={kindFilter}
        onChange={(e) => onKindFilterChange(e.target.value as ConnectorJobKind | '')}
        className="bg-surface-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground"
      >
        <option value="">{t('allKinds')}</option>
        {KIND_OPTIONS.map((k) => (
          <option key={k} value={k}>{t(`kind.${k}`)}</option>
        ))}
      </select>
    </div>
  );
}
