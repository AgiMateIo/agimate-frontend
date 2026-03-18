'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { SkillResponse } from '@/types';
import { TrashIcon, PencilIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import { Alert } from '@/components/ui/Alert';
import { formatDate } from '@/utils/date';
import DeleteSkillModal from './DeleteSkillModal';
import CloneSkillModal from './CloneSkillModal';

interface SkillsListProps {
  skills: SkillResponse[];
  variant: 'my' | 'public';
  onDeleteSuccess: (skillId: string) => void;
  onCloneSuccess: () => void;
}

export default function SkillsList({
  skills,
  variant,
  onDeleteSuccess,
  onCloneSuccess,
}: SkillsListProps) {
  const t = useTranslations('Skills');
  const locale = useLocale();
  const router = useRouter();

  const [deletingSkill, setDeletingSkill] = useState<SkillResponse | null>(null);
  const [cloningSkill, setCloningSkill] = useState<SkillResponse | null>(null);
  const [cloneSuccessMessage, setCloneSuccessMessage] = useState<string | null>(null);

  const handleDeleteSuccess = (skillId: string) => {
    setDeletingSkill(null);
    onDeleteSuccess(skillId);
  };

  const handleCloneSuccess = () => {
    setCloneSuccessMessage(t('cloneSuccess'));
    setCloningSkill(null);
    onCloneSuccess();
    // Auto-clear success message after 3 seconds
    setTimeout(() => setCloneSuccessMessage(null), 3000);
  };

  if (skills.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        {variant === 'my' ? t('noSkills') : t('noPublicSkills')}
      </div>
    );
  }

  return (
    <>
      {cloneSuccessMessage && (
        <Alert variant="success">{cloneSuccessMessage}</Alert>
      )}

      <div className="space-y-3">
        {skills.map((skill) => (
          <div
            key={skill.id}
            onClick={() => router.push(`/dashboard/skills/${skill.id}`)}
            className="bg-surface-secondary rounded-lg p-4 border border-border hover:border-accent/30 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    skill.type === 'TRIGGER'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-accent/10 text-accent'
                  }`}>
                    {skill.type === 'TRIGGER' ? t('typeTrigger') : t('typeCommon')}
                  </span>
                  {skill.isPublic && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">
                      {t('public')}
                    </span>
                  )}
                  <span className="text-xs text-muted">
                    {t('version', { version: skill.version })}
                  </span>
                </div>

                <h3 className="font-medium text-foreground mt-1">{skill.name}</h3>

                {skill.description && (
                  <p className="text-sm text-muted mt-0.5 line-clamp-2">
                    {skill.description}
                  </p>
                )}

                <div className="text-xs text-muted mt-2">
                  <span>{t('updatedAt')}: {formatDate(skill.updatedAt, locale)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {variant === 'my' && (
                  <>
                    <button
                      onClick={() => router.push(`/dashboard/skills/${skill.id}/edit`)}
                      className="p-2 text-muted hover:text-foreground transition-colors rounded-lg"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setDeletingSkill(skill)}
                      className="p-2 text-muted hover:text-error transition-colors rounded-lg"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </>
                )}

                {variant === 'public' && (
                  <button
                    onClick={() => setCloningSkill(skill)}
                    className="p-2 text-muted hover:text-accent transition-colors rounded-lg"
                    title={t('cloneSkill')}
                  >
                    <DocumentDuplicateIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {deletingSkill && (
        <DeleteSkillModal
          skill={deletingSkill}
          onClose={() => setDeletingSkill(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {cloningSkill && (
        <CloneSkillModal
          skill={cloningSkill}
          onClose={() => setCloningSkill(null)}
          onSuccess={handleCloneSuccess}
        />
      )}
    </>
  );
}
