'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import apiService from '@/services/api';
import { SkillResponse } from '@/types';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import SkillForm from '@/components/skills/SkillForm';

export default function CreateSkillPage() {
  const t = useTranslations('Skills');
  const router = useRouter();

  const { loading, error, fieldErrors, handleSubmit } = useAsyncForm<SkillResponse>({
    onSuccess: (skill) => {
      router.push(`/dashboard/skills/${skill.id}`);
    },
  });

  const onSubmit = (e: React.FormEvent, data: { skillMd: string; isPublic: boolean }) => {
    handleSubmit(e, () =>
      apiService.createSkill({
        skillMd: data.skillMd,
        isPublic: data.isPublic,
      })
    );
  };

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
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('createSkillTitle')}</h1>
      </div>

      {/* Form Card */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <SkillForm
          loading={loading}
          error={error}
          fieldErrors={fieldErrors}
          submitLabel={t('create')}
          onSubmit={onSubmit}
          onCancel={() => router.push('/dashboard/skills')}
        />
      </div>
    </div>
  );
}
