'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { PlatformResponse, IntegrationResponse } from '@/types';
import { Button } from '@/components/ui/Button';
import IntegrationsList from '@/components/integrations/IntegrationsList';
import AddIntegrationModal from '@/components/integrations/AddIntegrationModal';

export default function IntegrationsPage() {
  const t = useTranslations('Integrations');
  const [platforms, setPlatforms] = useState<PlatformResponse[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [platformsData, integrationsData] = await Promise.all([
          apiService.getPlatforms(),
          apiService.getIntegrations(),
        ]);
        setPlatforms(platformsData);
        setIntegrations(integrationsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load integrations');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddSuccess = (integration: IntegrationResponse) => {
    setIntegrations(prev => [integration, ...prev]);
    setShowAddModal(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <div className="text-center py-12 text-muted">{t('loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <p className="text-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          {t('addIntegration')}
        </Button>
      </div>

      <IntegrationsList
        integrations={integrations}
        platforms={platforms}
        onUpdate={setIntegrations}
      />

      {showAddModal && (
        <AddIntegrationModal
          platforms={platforms}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  );
}
