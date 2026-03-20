'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import apiService from '@/services/api';
import { SkillDetailResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useUser } from '@/contexts/UserContext';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { formatDate } from '@/utils/date';
import SkillFilesTab from '@/components/skills/SkillFilesTab';
import DeleteSkillModal from '@/components/skills/DeleteSkillModal';

type Tab = 'overview' | 'files';

export default function SkillDetailPage() {
  const t = useTranslations('Skills');
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const skillId = params.id as string;
  const { user } = useUser();

  const [skill, setSkill] = useState<SkillDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useSetBreadcrumb(skillId, skill?.name);

  const isOwner = !!(user?.pubId && user.pubId === skill?.userPubId);

  const fetchSkill = useCallback(async () => {
    try {
      setError(null);
      const data = await apiService.getSkill(skillId);
      setSkill(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skill');
    } finally {
      setLoading(false);
    }
  }, [skillId]);

  useEffect(() => {
    fetchSkill();
  }, [fetchSkill]);

  const handleDeleteSuccess = () => {
    router.push('/dashboard/skills');
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: t('tabOverview') },
    { key: 'files', label: t('tabFiles') },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-muted">{t('loadingSkill')}</div>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push('/dashboard/skills')}
          className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="text-sm">{t('backToSkills')}</span>
        </button>
        <ErrorAlert>{error || t('skillNotFound')}</ErrorAlert>
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
            <span className="text-xs text-muted">
              {t('version', { version: skill.version })}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{skill.name}</h1>
          {skill.description && (
            <p className="text-muted mt-1">{skill.description}</p>
          )}
        </div>
        {isOwner && (
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/skills/${skill.id}/edit`}
              className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors text-sm"
            >
              <PencilIcon className="h-4 w-4" />
              {t('edit')}
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-lg font-medium text-sm border border-error text-error hover:bg-error/10 transition-colors"
            >
              {t('delete')}
            </button>
          </div>
        )}
      </div>

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

          {/* SKILL.md Content */}
          <div>
            <h3 className="text-sm font-medium text-muted mb-2">{t('skillMd')}</h3>
            <div className="bg-surface-secondary rounded-lg border border-border/50 p-4">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
                {skill.skillMd}
              </pre>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <SkillFilesTab skillId={skill.id} isOwner={isOwner} />
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
