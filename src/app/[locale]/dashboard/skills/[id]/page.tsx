'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import apiService from '@/services/api';
import { SkillDetailResponse } from '@/types';
import { Button } from '@/components/ui/Button';
import { FormField, TextArea } from '@/components/ui/FormField';
import { Toggle } from '@/components/ui/Toggle';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useUser } from '@/contexts/UserContext';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { formatDate } from '@/utils/date';
import SkillFilesTab from '@/components/skills/SkillFilesTab';
import SkillConnectorsTab from '@/components/skills/SkillConnectorsTab';
import SkillAgentsTab from '@/components/skills/SkillAgentsTab';
import DeleteSkillModal from '@/components/skills/DeleteSkillModal';

type Tab = 'overview' | 'files' | 'connectors' | 'agents';

export default function SkillDetailPage() {
  const t = useTranslations('Skills');
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const skillId = params.id as string;
  const { user } = useUser();

  const [skill, setSkill] = useState<SkillDetailResponse | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Inline edit state
  const [editSkillMd, setEditSkillMd] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);

  useSetBreadcrumb(skillId, skill?.name);

  const isOwner = !!(user?.pubId && user.pubId === skill?.userPubId);
  const isFeaturedClone = skill?.parentPubId != null;
  const isEditable = isOwner && !isFeaturedClone;

  const fetchSkill = useCallback(async () => {
    try {
      setPageError(null);
      const data = await apiService.getSkill(skillId);
      setSkill(data);
      setEditSkillMd(data.skillMd);
      setEditIsPublic(data.isPublic);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to load skill');
    } finally {
      setPageLoading(false);
    }
  }, [skillId]);

  useEffect(() => {
    fetchSkill();
  }, [fetchSkill]);

  const isDirty = skill !== null && (
    editSkillMd !== skill.skillMd || editIsPublic !== skill.isPublic
  );

  const { loading: saving, error: saveError, handleSubmit } = useAsyncForm<void>({
    onSuccess: () => {
      fetchSkill();
    },
  });

  const onSave = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      await apiService.updateSkill(skillId, {
        skillMd: editSkillMd,
        isPublic: editIsPublic,
      });
    });

  const handleDeleteSuccess = () => {
    router.push('/dashboard/skills');
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: t('tabOverview') },
    { key: 'files', label: t('tabFiles') },
    { key: 'connectors', label: t('tabConnectors') },
    { key: 'agents', label: t('tabAgents') },
  ];

  if (pageLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-muted">{t('loadingSkill')}</div>
      </div>
    );
  }

  if (pageError || !skill) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push('/dashboard/skills')}
          className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="text-sm">{t('backToSkills')}</span>
        </button>
        <ErrorAlert>{pageError || t('skillNotFound')}</ErrorAlert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/dashboard/skills')}
        className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        <span className="text-sm">{t('backToSkills')}</span>
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {skill.isPublic && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">
                {t('public')}
              </span>
            )}
            {skill.isFeatured && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                {t('featured')}
              </span>
            )}
            {isFeaturedClone && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted/10 text-muted">
                {t('systemSkill')}
              </span>
            )}
            <span className="text-xs text-muted">
              {t('version', { version: skill.version })}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{skill.name}</h1>
          {skill.description && (
            <p className="text-muted mt-1">{skill.description}</p>
          )}
        </div>
      </div>

      {isFeaturedClone && (
        <div className="text-sm text-muted bg-surface-secondary rounded-lg px-4 py-3 border border-border">
          {t('featuredCloneReadOnly')}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-accent text-foreground'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted">{t('createdAt')}</span>
              <p className="text-foreground">{formatDate(skill.createdAt, locale)}</p>
            </div>
            <div>
              <span className="text-muted">{t('updatedAt')}</span>
              <p className="text-foreground">{formatDate(skill.updatedAt, locale)}</p>
            </div>
          </div>

          {/* Public toggle */}
          {isEditable ? (
            <FormField label={t('isPublic')} hint={t('isPublicHint')}>
              <Toggle
                checked={editIsPublic}
                onChange={setEditIsPublic}
              />
            </FormField>
          ) : (
            <div className="text-sm">
              <span className="text-muted">{t('isPublic')}</span>
              <p className="text-foreground mt-0.5">{skill.isPublic ? t('public') : t('private')}</p>
            </div>
          )}

          {/* SKILL.md Content */}
          <div>
            <h3 className="text-sm font-medium text-muted mb-2">{t('skillMd')}</h3>
            {isEditable ? (
              <TextArea
                value={editSkillMd}
                onChange={(e) => setEditSkillMd(e.target.value)}
                placeholder={t('skillMdPlaceholder')}
                rows={16}
                className="font-mono text-sm"
              />
            ) : (
              <div className="bg-surface-secondary rounded-lg border border-border/50 p-4">
                <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
                  {skill.skillMd}
                </pre>
              </div>
            )}
          </div>

          {saveError && <ErrorAlert>{saveError}</ErrorAlert>}

          {/* Actions */}
          {isEditable && (
            <div className="flex items-center gap-3 pt-2 border-t border-border">
              <Button
                onClick={onSave}
                disabled={!isDirty || saving || !editSkillMd.trim()}
                loading={saving}
              >
                {t('save')}
              </Button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 rounded-lg font-medium text-sm border border-error text-error hover:bg-error/10 transition-colors"
              >
                {t('delete')}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'files' && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <SkillFilesTab skillId={skill.id} isOwner={isEditable} />
        </div>
      )}

      {activeTab === 'connectors' && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <SkillConnectorsTab skillId={skill.id} isOwner={isEditable} />
        </div>
      )}

      {activeTab === 'agents' && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <SkillAgentsTab skillId={skill.id} skillName={skill.name} />
        </div>
      )}

      {showDeleteModal && (
        <DeleteSkillModal
          skill={skill}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
