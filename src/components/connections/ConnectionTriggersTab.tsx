'use client';

import { useTranslations } from 'next-intl';
import { BoltIcon } from '@heroicons/react/24/outline';
import { useConnectionTriggersQuery } from '@/queries/connections';
import { getErrorMessage } from '@/utils/error';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ConnectionDefinitionCard } from './ConnectionDefinitionCard';

interface ConnectionTriggersTabProps {
  connectionId: string;
}

export default function ConnectionTriggersTab({ connectionId }: ConnectionTriggersTabProps) {
  const t = useTranslations('ConnectionDetail');
  const { data: triggers, isPending, error } = useConnectionTriggersQuery(connectionId);

  if (isPending) {
    return <div className="text-center py-12 text-muted">{t('triggersLoading')}</div>;
  }
  if (error) {
    return <ErrorAlert>{getErrorMessage(error, t('triggersError'))}</ErrorAlert>;
  }
  if (triggers.length === 0) {
    return <div className="text-center py-12 text-muted">{t('triggersEmpty')}</div>;
  }

  return (
    <div className="space-y-3">
      {triggers.map((trigger) => (
        <ConnectionDefinitionCard
          key={trigger.name}
          icon={BoltIcon}
          name={trigger.name}
          description={trigger.description}
          params={trigger.params.map((name) => ({ name }))}
        />
      ))}
    </div>
  );
}
