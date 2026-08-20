'use client';

import { useTranslations } from 'next-intl';
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { useConnectionToolsQuery } from '@/queries/connections';
import { ConnectorToolSpec } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Chip } from '@/components/ui/Chip';
import { ConnectionDefinitionCard, type DefinitionParam } from './ConnectionDefinitionCard';

interface ConnectionToolsTabProps {
  connectionId: string;
}

function toolParams(tool: ConnectorToolSpec): DefinitionParam[] {
  const properties = tool.inputSchema?.properties ?? {};
  const required = new Set(tool.inputSchema?.required ?? []);
  return Object.entries(properties).map(([name, schema]) => ({
    name,
    required: required.has(name),
    type: schema.type,
  }));
}

export default function ConnectionToolsTab({ connectionId }: ConnectionToolsTabProps) {
  const t = useTranslations('ConnectionDetail');
  const { data: tools, isPending, error } = useConnectionToolsQuery(connectionId);

  if (isPending) {
    return <div className="text-center py-12 text-muted">{t('toolsLoading')}</div>;
  }
  if (error) {
    return <ErrorAlert>{getErrorMessage(error, t('toolsError'))}</ErrorAlert>;
  }
  if (tools.length === 0) {
    return <div className="text-center py-12 text-muted">{t('toolsEmpty')}</div>;
  }

  return (
    <div className="space-y-3">
      {tools.map((tool) => {
        const badges = (
          <>
            {tool.annotations?.readOnlyHint && (
              <Chip tone="success">{t('annReadOnly')}</Chip>
            )}
            {tool.annotations?.destructiveHint && (
              <Chip tone="warning">{t('annDestructive')}</Chip>
            )}
          </>
        );
        return (
          <ConnectionDefinitionCard
            key={tool.name}
            icon={WrenchScrewdriverIcon}
            name={tool.name}
            title={tool.title}
            description={tool.description}
            params={toolParams(tool)}
            badges={badges}
          />
        );
      })}
    </div>
  );
}
