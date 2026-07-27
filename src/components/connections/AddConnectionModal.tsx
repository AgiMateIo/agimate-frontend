'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ConnectorCatalogEntry, ConnectionResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ConnectionAvatar } from './ConnectionAvatar';
import ConnectionSetupForm from './ConnectionSetupForm';
import { DEMO_CONNECTORS, DEMO_PAGE_SIZE } from './demoConnectors';

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

  const connectors = platforms.filter(p => p.integrationMeta);
  // Hide a placeholder as soon as the real catalog carries the same code.
  const codes = new Set(connectors.map(p => p.code));
  const upcoming = DEMO_CONNECTORS.filter(d => !codes.has(d.code));

  // Placeholders are revealed a page at a time. There is nothing to fetch, so
  // the "loading" is only there to keep the button from feeling instant.
  const [shown, setShown] = useState(DEMO_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const loadMore = () => {
    setLoadingMore(true);
    timer.current = setTimeout(() => {
      setShown((n) => n + DEMO_PAGE_SIZE);
      setLoadingMore(false);
    }, 500);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={selectedPlatform ? t('configureConnection') : t('selectConnector')}
      size={selectedPlatform ? 'md' : 'xl'}
    >
      {!selectedPlatform ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">{t('selectConnectorSubtitle')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {connectors.map((platform) => (
              <button
                key={platform.code}
                onClick={() => setSelectedPlatform(platform)}
                className="flex items-start gap-3 p-4 rounded-lg border border-border bg-surface-secondary hover:bg-surface-secondary/80 hover:border-accent transition-colors text-left"
              >
                <ConnectionAvatar connectorCode={platform.code} connectorName={platform.name} size="sm" />
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">{platform.name}</div>
                  {platform.description && (
                    <p className="text-xs text-muted mt-0.5 line-clamp-2">{platform.description}</p>
                  )}
                </div>
              </button>
            ))}

            {/* Not implemented yet — shown for orientation, deliberately inert. */}
            {upcoming.slice(0, shown).map((connector) => (
              <div
                key={connector.code}
                aria-disabled="true"
                className="flex items-start gap-3 p-4 rounded-lg border border-dashed border-border bg-surface-secondary/40 opacity-70"
              >
                <ConnectionAvatar connectorCode={connector.code} connectorName={connector.name} size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-foreground truncate">{connector.name}</span>
                    <Chip>{t('soon')}</Chip>
                  </div>
                  <p className="text-xs text-muted mt-0.5 line-clamp-2">{t(connector.descriptionKey)}</p>
                </div>
              </div>
            ))}
          </div>

          {shown < upcoming.length && (
            <div className="flex justify-center pt-1">
              <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                {t('loadMore')}
              </Button>
            </div>
          )}
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
