'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import apiService from '@/services/api';
import { SkillDetailResponse } from '@/types';
import { useSkillDetailQuery, useSkillsCacheActions } from '@/queries/skills';
import { Button } from '@/components/ui/Button';
import { FormField, TextArea } from '@/components/ui/FormField';
import { Toggle } from '@/components/ui/Toggle';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Tabs } from '@/components/ui/Tabs';
import { useUser } from '@/contexts/UserContext';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { formatDate } from '@/utils/date';
import { buildSkillMd } from '@/utils/skill';
import { getErrorMessage } from '@/utils/error';
import SkillAgentsTab from '@/components/skills/SkillAgentsTab';
import DeleteSkillModal from '@/components/skills/DeleteSkillModal';

type Tab = 'overview' | 'agents';

export default function SkillDetailPage() {
  const t = useTranslations('Skills');
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const skillId = params.id as string;
  const { user } = useUser();

  const { data: skill, isPending: pageLoading, error: queryError } = useSkillDetailQuery(skillId);
  const { invalidateSkill } = useSkillsCacheActions();
  const pageError = queryError ? getErrorMessage(queryError, 'Failed to load skill') : null;
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Inline edit state, re-seeded whenever fresh skill data arrives.
  const [editSkillMd, setEditSkillMd] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [seededFrom, setSeededFrom] = useState<SkillDetailResponse | null>(null);
  if (skill && skill !== seededFrom) {
    setSeededFrom(skill);
    setEditSkillMd(buildSkillMd(skill));
    setEditIsPublic(skill.isPublic);
  }

  useSetBreadcrumb(skillId, skill?.name);

  const isEditable = !!(user?.id && user.id === skill?.userId);

  const isDirty = !!skill && (
    editSkillMd !== buildSkillMd(skill) || editIsPublic !== skill.isPublic
  );

  const { loading: saving, error: saveError, handleSubmit } = useAsyncForm<void>({
    onSuccess: () => {
      invalidateSkill(skillId);
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
            <span className="text-xs text-muted">
              {t('version', { version: skill.version })}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{skill.name}</h1>
          {skill.description && (
            <p className="text-muted mt-1">{skill.description}</p>
          )}
          {skill.connectorCodes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-xs text-muted">{t('connectorsLabel')}:</span>
              {skill.connectorCodes.map((code) => (
                <span
                  key={code}
                  className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent"
                >
                  {code}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            id: 'overview',
            label: t('tabOverview'),
            content: (
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
                        {skill.mdContent}
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
            ),
          },
          {
            id: 'agents',
            label: t('tabAgents'),
            content: (
              <div className="bg-surface rounded-xl border border-border p-6">
                <SkillAgentsTab skillId={skill.id} skillName={skill.name} />
              </div>
            ),
          },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as Tab)}
      />

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
