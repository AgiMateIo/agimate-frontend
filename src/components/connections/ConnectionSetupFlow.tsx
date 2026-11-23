'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ConnectionResponse, ConnectorCatalogEntry } from '@/types';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { findConnector } from '@/utils/connector';
import ConnectionPicker, { type ConnectorChoice, type PickerFilters } from './ConnectionPicker';
import ConnectionSetupForm from './ConnectionSetupForm';

export type FlowStep = 'pick' | 'form';

interface ConnectionSetupFlowProps {
  platforms: ConnectorCatalogEntry[];
  connections: ConnectionResponse[];
  connectorCode?: string;
  // Called before the consent-screen redirect; a rejection stops the flow.
  onCreated?: (connection: ConnectionResponse) => void | Promise<void>;
  onSuccess: (connection: ConnectionResponse) => void;
  onStepChange?: (step: FlowStep) => void;
  onBack?: () => void;
}

const INITIAL_FILTERS: PickerFilters = {
  tab: 'presets',
  search: '',
  category: '',
  jurisdiction: '',
};

// The "pick → configure" sequence, and only it. It knows nothing about agents,
// binding, or the modal around it.
export default function ConnectionSetupFlow({
  platforms,
  connections,
  connectorCode,
  onCreated,
  onSuccess,
  onStepChange,
  onBack,
}: ConnectionSetupFlowProps) {
  const t = useTranslations('Connections');
  const tCommon = useTranslations('Common');
  const [choice, setChoice] = useState<ConnectorChoice | null>(null);
  // The picker unmounts while a form is open; filters live here so coming back
  // finds them as they were.
  const [filters, setFilters] = useState<PickerFilters>(INITIAL_FILTERS);

  const backToPick = () => {
    setChoice(null);
    onStepChange?.('pick');
  };

  if (!choice) {
    return (
      <ConnectionPicker
        platforms={platforms}
        connections={connections}
        connectorCode={connectorCode}
        filters={filters}
        onFiltersChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        onSelect={(next) => {
          setChoice(next);
          onStepChange?.('form');
        }}
        onBack={onBack}
      />
    );
  }

  if (choice.kind === 'connector') {
    return (
      <ConnectionSetupForm
        key={choice.connector.code}
        connector={choice.connector}
        onCreated={onCreated}
        onSuccess={onSuccess}
        onCancel={backToPick}
        cancelLabel={tCommon('back')}
      />
    );
  }

  const connector = findConnector(platforms, choice.preset.connectorCode);
  if (!connector) {
    return (
      <div className="space-y-3">
        <ErrorAlert>{t('presetConnectorMissing', { code: choice.preset.connectorCode })}</ErrorAlert>
        <Button variant="secondary" onClick={backToPick}>
          {tCommon('back')}
        </Button>
      </div>
    );
  }

  return (
    <ConnectionSetupForm
      key={choice.preset.code}
      connector={connector}
      preset={choice.preset}
      onCreated={onCreated}
      onSuccess={onSuccess}
      onCancel={backToPick}
      cancelLabel={tCommon('back')}
    />
  );
}
