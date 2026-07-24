'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ConnectorCatalogEntry, ConnectionResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { ConnectionAvatar } from './ConnectionAvatar';
import ConnectionSetupForm from './ConnectionSetupForm';

interface AddConnectionModalProps {
  platforms: ConnectorCatalogEntry[];
  onClose: () => void;
  onSuccess: (connection: ConnectionResponse) => void;
}

export default function AddConnectionModal({
  platforms,
  onClose,
  onSuccess,
}: AddConnectionModalProps) {
  const t = useTranslations('Connections');
  const [selectedPlatform, setSelectedPlatform] = useState<ConnectorCatalogEntry | null>(null);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={selectedPlatform ? t('configureConnection') : t('selectPlatform')}
      size={selectedPlatform ? 'md' : 'lg'}
    >
      {!selectedPlatform ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">{t('selectPlatformSubtitle')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {platforms.filter(p => p.integrationMeta).map((platform) => (
              <button
                key={platform.code}
                onClick={() => setSelectedPlatform(platform)}
                className="flex items-start gap-3 p-4 rounded-lg border border-border bg-surface-secondary hover:bg-surface-secondary/80 hover:border-accent transition-colors text-left"
              >
                <ConnectionAvatar connectorCode={platform.code} connectorName={platform.name} />
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{platform.name}</div>
                  {platform.description && (
                    <p className="text-xs text-muted mt-0.5">{platform.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Keyed by connector so credential state never leaks between platforms.
        <ConnectionSetupForm
          key={selectedPlatform.code}
          connector={selectedPlatform}
          onSuccess={onSuccess}
          onCancel={() => setSelectedPlatform(null)}
          cancelLabel={t('back')}
        />
      )}
    </Modal>
  );
}
