'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { CheckIcon } from '@heroicons/react/24/outline';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import apiService from '@/services/api';
import { SkillResponse } from '@/types';
import { connectorCatalogOptions } from '@/queries/connectors';
import { useSkillsCacheActions } from '@/queries/skills';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface EditSkillConnectorsModalProps {
  skill: SkillResponse;
  onClose: () => void;
}

export default function EditSkillConnectorsModal({
  skill,
  onClose,
}: EditSkillConnectorsModalProps) {
  const t = useTranslations('Skills');
  const tc = useTranslations('Common');
  const { invalidateSkill, invalidateLists } = useSkillsCacheActions();

  const { data: catalog = [], isLoading: catalogLoading } = useQuery(
    connectorCatalogOptions(),
  );

  const [selected, setSelected] = useState<string[]>(skill.connectorCodes);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q),
    );
  }, [catalog, search]);

  const toggle = (code: string) => {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const isDirty =
    selected.length !== skill.connectorCodes.length ||
    selected.some((c) => !skill.connectorCodes.includes(c));

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    defaultError: t('connectorsSaveError'),
    onSuccess: () => {
      invalidateSkill(skill.id);
      invalidateLists();
      onClose();
    },
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      await apiService.updateSkillConnectors(skill.id, {
        connectorCodes: selected,
      });
    });

  return (
    <Modal isOpen onClose={onClose} title={t('editConnectorsTitle')} size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-muted">{t('editConnectorsHint')}</p>

        {/* Search */}
        <SearchToolbar
          value={search}
          onChange={setSearch}
          placeholder={t('connectorsSearchPlaceholder')}
          size="sm"
        />

        {/* Connector list */}
        <div className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border">
          {catalogLoading ? (
            <p className="p-4 text-sm text-muted text-center">{tc('loading')}</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted text-center">
              {t('noConnectorsFound')}
            </p>
          ) : (
            filtered.map((c) => {
              const isSelected = selected.includes(c.code);
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => toggle(c.code)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-secondary transition-colors"
                >
                  <span
                    className={`flex items-center justify-center h-5 w-5 rounded border shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-accent border-accent text-white'
                        : 'border-border'
                    }`}
                  >
                    {isSelected && <CheckIcon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">
                      {c.name}
                    </span>
                    <span className="block text-xs text-muted truncate">
                      {c.code}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Re-sync note — connector changes don't propagate to agents automatically. */}
        <Alert variant="info">{t('connectorsResyncNote')}</Alert>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={!isDirty || loading} loading={loading}>
            {t('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
