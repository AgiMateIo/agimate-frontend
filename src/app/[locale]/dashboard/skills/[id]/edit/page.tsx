'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import apiService from '@/services/api';
import { SkillDetailResponse, SkillResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import SkillForm from '@/components/skills/SkillForm';

export default function EditSkillPage() {
  const t = useTranslations('Skills');
  const router = useRouter();
  const params = useParams();
  const skillId = params.id as string;

  const [skill, setSkill] = useState<SkillDetailResponse | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useSetBreadcrumb(skillId, skill?.name);

  const fetchSkill = useCallback(async () => {
    try {
      setPageError(null);
      const data = await apiService.getSkill(skillId);
      setSkill(data);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to load skill');
    } finally {
      setPageLoading(false);
    }
  }, [skillId]);

  useEffect(() => {
    fetchSkill();
  }, [fetchSkill]);

  const { loading, error, fieldErrors, handleSubmit } = useAsyncForm<SkillResponse>({
    onSuccess: () => {
      router.push(`/dashboard/skills/${skillId}`);
    },
  });

  const onSubmit = (e: React.FormEvent, data: { skillMd: string; isPublic: boolean }) => {
    handleSubmit(e, () =>
      apiService.updateSkill(skillId, {
        skillMd: data.skillMd,
        isPublic: data.isPublic,
      })
    );
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
        onClick={() => router.push(`/dashboard/skills/${skillId}`)}
        className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        <span className="text-sm">{t('backToSkills')}</span>
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('editSkillTitle')}</h1>
      </div>

      {/* Form Card */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <SkillForm
          initialSkillMd={skill.skillMd}
          initialIsPublic={skill.isPublic}
          loading={loading}
          error={error}
          fieldErrors={fieldErrors}
          submitLabel={t('save')}
          onSubmit={onSubmit}
          onCancel={() => router.push(`/dashboard/skills/${skillId}`)}
        />
      </div>
    </div>
  );
}
