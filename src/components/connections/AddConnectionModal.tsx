'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type {
  ConnectionResponse,
  ConnectorCatalogEntry,
  ConnectorPresetResponse,
} from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Placeholder } from '@/components/ui/Placeholder';
import { useConnectorPresetsQuery } from '@/queries/connectorPresets';
import { findConnector } from '@/utils/connector';
import { ConnectionAvatar } from './ConnectionAvatar';
import ConnectionSetupForm from './ConnectionSetupForm';
import PresetCatalog from './PresetCatalog';

interface AddConnectionModalProps {
  platforms: ConnectorCatalogEntry[];
  connections: ConnectionResponse[];
  onClose: () => void;
  onSuccess: (connection: ConnectionResponse) => void;
}

type PickTab = 'presets' | 'manual';

type Step =
  | { kind: 'pick' }
  | { kind: 'connector'; connector: ConnectorCatalogEntry }
  | { kind: 'preset'; preset: ConnectorPresetResponse };

// "Ready-made" is the first face of the picker: a service the user recognises
// is easier to choose than an address to type. The manual tab keeps the
// connector tiles — and the MCP one — for everything the catalogue does not
// carry.
export default function AddConnectionModal({
  platforms,
  connections,
  onClose,
  onSuccess,
}: AddConnectionModalProps) {
  const t = useTranslations('Connections');
  const tPresets = useTranslations('ConnectorPresets');
  const tCommon = useTranslations('Common');
  const [tab, setTab] = useState<PickTab>('presets');
  const [step, setStep] = useState<Step>({ kind: 'pick' });
  // The picker is unmounted while a form is open; the catalogue's filters live
  // here so coming back finds them as they were.
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const presets = useConnectorPresetsQuery();

  const connectors = platforms.filter((platform) => platform.integrationMeta);
  const back = () => setStep({ kind: 'pick' });

  const presetConnector =
    step.kind === 'preset' ? findConnector(platforms, step.preset.connectorCode) : undefined;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={step.kind === 'pick' ? t('selectConnector') : t('configureConnection')}
      size={step.kind === 'pick' ? 'xl' : 'md'}
    >
      {step.kind === 'pick' ? (
        <Tabs
          activeTab={tab}
          onTabChange={(id) => setTab(id as PickTab)}
          tabs={[
            {
              id: 'presets',
              label: t('tabPresets'),
              content: presets.isPending ? (
                <Placeholder size="sm">{tPresets('loading')}</Placeholder>
              ) : presets.isError ? (
                <div className="space-y-3">
                  <ErrorAlert>{tPresets('loadError')}</ErrorAlert>
                  <Button
                    variant="outline"
                    loading={presets.isFetching}
                    onClick={() => presets.refetch()}
                  >
                    {tPresets('retry')}
                  </Button>
                </div>
              ) : (presets.data ?? []).length === 0 ? (
                <div className="space-y-3">
                  <Placeholder size="sm">{tPresets('empty')}</Placeholder>
                  <Button variant="secondary" onClick={() => setTab('manual')}>
                    {t('tabManual')}
                  </Button>
                </div>
              ) : (
                <PresetCatalog
                  presets={presets.data ?? []}
                  connections={connections}
                  search={search}
                  onSearchChange={setSearch}
                  category={category}
                  onCategoryChange={setCategory}
                  jurisdiction={jurisdiction}
                  onJurisdictionChange={setJurisdiction}
                  onSelect={(preset) => setStep({ kind: 'preset', preset })}
                />
              ),
            },
            {
              id: 'manual',
              label: t('tabManual'),
              content: (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {connectors.map((platform) => (
                    <button
                      key={platform.code}
                      onClick={() => setStep({ kind: 'connector', connector: platform })}
                      className="flex items-start gap-3 rounded-lg border border-border bg-surface-secondary p-4 text-left transition-colors hover:border-accent hover:bg-surface-secondary/80"
                    >
                      <ConnectionAvatar
                        connectorCode={platform.code}
                        connectorName={platform.name}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{platform.name}</div>
                        {platform.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                            {platform.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ),
            },
          ]}
        />
      ) : step.kind === 'connector' ? (
        // Keyed by connector so credential state never leaks between platforms.
        <ConnectionSetupForm
          key={step.connector.code}
          connector={step.connector}
          onSuccess={onSuccess}
          onCancel={back}
          cancelLabel={tCommon('back')}
        />
      ) : presetConnector ? (
        <ConnectionSetupForm
          key={step.preset.code}
          connector={presetConnector}
          preset={step.preset}
          onSuccess={onSuccess}
          onCancel={back}
          cancelLabel={tCommon('back')}
        />
      ) : (
        <div className="space-y-3">
          <ErrorAlert>
            {t('presetConnectorMissing', { code: step.preset.connectorCode })}
          </ErrorAlert>
          <Button variant="secondary" onClick={back}>
            {tCommon('back')}
          </Button>
        </div>
      )}
    </Modal>
  );
}
