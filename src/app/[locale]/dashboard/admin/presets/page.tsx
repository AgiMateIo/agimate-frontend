'use client';

import { Suspense, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { FilterPill, FilterRow } from '@/components/ui/FilterPill';
import { Placeholder } from '@/components/ui/Placeholder';
import AdminPresetsList from '@/components/admin/AdminPresetsList';
import AdminPresetModal from '@/components/admin/AdminPresetModal';
import { useUser } from '@/contexts/UserContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useAgentPresetCacheActions } from '@/queries/agent-presets';
import type { AdminAgentPresetResponse, PresetCatalogLocale } from '@/types';

const CATALOGS: PresetCatalogLocale[] = ['ru', 'en'];

export default function AdminPresetsPage() {
  const t = useTranslations('Admin');
  const tCommon = useTranslations('Common');
  const { user, loading } = useUser();
  const isAdmin = useIsAdmin();
  const { invalidateAll } = useAgentPresetCacheActions();

  // The catalog is its own choice, not the interface locale: ru and en are two
  // sets of presets, each edited where it lives.
  const [catalog, setCatalog] = useState<PresetCatalogLocale>('ru');
  // undefined = closed, null = creating.
  const [editing, setEditing] = useState<AdminAgentPresetResponse | null | undefined>(undefined);

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('presetsTitle')}</h1>
        <p className="text-muted mt-1">{t('presetsSubtitle')}</p>
      </div>
      {isAdmin && (
        <Button onClick={() => setEditing(null)}>
          <PlusIcon className="h-4 w-4" />
          {t('presetCreate')}
        </Button>
      )}
    </div>
  );

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        {header}
        {loading || !user ? (
          <Placeholder>{tCommon('loading')}</Placeholder>
        ) : (
          <Alert variant="error">{t('noAccess')}</Alert>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <FilterRow label={t('presetCatalog')}>
        {CATALOGS.map((value) => (
          <FilterPill key={value} active={catalog === value} onClick={() => setCatalog(value)}>
            {value.toUpperCase()}
          </FilterPill>
        ))}
      </FilterRow>

      <ErrorBoundary resetKeys={[catalog]}>
        <Suspense fallback={<Placeholder>{t('loadingPresets')}</Placeholder>}>
          <AdminPresetsList locale={catalog} onOpen={setEditing} />
        </Suspense>
      </ErrorBoundary>

      {editing !== undefined && (
        <AdminPresetModal
          // A different preset is a different form, not the same one refilled.
          key={editing?.id ?? 'new'}
          locale={catalog}
          preset={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            void invalidateAll();
          }}
        />
      )}
    </div>
  );
}
