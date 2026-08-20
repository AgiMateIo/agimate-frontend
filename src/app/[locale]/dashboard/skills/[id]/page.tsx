'use client';

import { useMemo, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import apiService from '@/services/api';
import { SkillDetailResponse } from '@/types';
import { useSkillDetailSuspenseQuery, useSkillsCacheActions } from '@/queries/skills';
import { connectorCatalogOptions } from '@/queries/connectors';
import { Button } from '@/components/ui/Button';
import { FormField, TextArea } from '@/components/ui/FormField';
import { Toggle } from '@/components/ui/Toggle';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Tabs } from '@/components/ui/Tabs';
import { useUser } from '@/contexts/UserContext';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { formatDate } from '@/utils/date';
import { buildSkillMd } from '@/utils/skill';
import SkillAgentsTab from '@/components/skills/SkillAgentsTab';
import SkillConnectorsTab from '@/components/skills/SkillConnectorsTab';
import DeleteSkillModal from '@/components/skills/DeleteSkillModal';

type Tab = 'overview' | 'connectors' | 'agents';

function SkillDetailContent({ skillId }: { skillId: string }) {
  const t = useTranslations('Skills');
  const locale = useLocale();
  const router = useRouter();
  const { user } = useUser();

  const { data: skill } = useSkillDetailSuspenseQuery(skillId);
  const { invalidateSkill } = useSkillsCacheActions();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Connector catalog → friendly names for the header code chips (session-cached).
  const { data: catalog } = useQuery(connectorCatalogOptions());
  const connectorNameByCode = useMemo(
    () => new Map((catalog ?? []).map((c) => [c.code, c.name])),
    [catalog],
  );

  // Inline edit state, re-seeded whenever fresh skill data arrives.
  const [editSkillMd, setEditSkillMd] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [seededFrom, setSeededFrom] = useState<SkillDetailResponse | null>(null);
  if (skill !== seededFrom) {
    setSeededFrom(skill);
    setEditSkillMd(buildSkillMd(skill));
    setEditIsPublic(skill.isPublic);
  }

  useSetBreadcrumb(skillId, skill.title);

  const isEditable = !!(user?.id && user.id === skill.userId && !skill.system);

  const isDirty = editSkillMd !== buildSkillMd(skill) || editIsPublic !== skill.isPublic;

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

  return (
    <>
      {/* Header */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <h1 className="text-2xl font-bold text-foreground">{skill.title}</h1>
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
                  title={code}
                >
                  {connectorNameByCode.get(code) ?? code}
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
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
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
            id: 'connectors',
            label: t('tabConnectors'),
            content: (
              <div className="bg-surface rounded-xl border border-border p-6">
                <SkillConnectorsTab skill={skill} isEditable={isEditable} />
              </div>
            ),
          },
          {
            id: 'agents',
            label: t('tabAgents'),
            content: (
              <div className="bg-surface rounded-xl border border-border p-6">
                {/* Keyed: navigating between two skills re-renders this page
                    rather than remounting it, and the tab keeps the previous
                    page of rows while the next loads — without the key that is
                    the *other* skill's agents, under a live remove button. */}
                <SkillAgentsTab key={skill.id} skillId={skill.id} skillName={skill.title} />
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
    </>
  );
}

export default function SkillDetailPage() {
  const t = useTranslations('Skills');
  const router = useRouter();
  const params = useParams();
  const skillId = params.id as string;

  return (
    <div className="space-y-6">
      {/* Back Button — kept in the shell so it stays visible while loading/on error. */}
      <button
        onClick={() => router.push('/dashboard/skills')}
        className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        <span className="text-sm">{t('backToSkills')}</span>
      </button>

      <ErrorBoundary resetKeys={[skillId]}>
        <Suspense fallback={<div className="text-center py-12 text-muted">{t('loadingSkill')}</div>}>
          <SkillDetailContent skillId={skillId} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
