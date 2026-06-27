'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { SkillResponse } from '@/types';
import { TrashIcon, PencilIcon, LinkIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import { formatDate } from '@/utils/date';
import DeleteSkillModal from './DeleteSkillModal';
import AddSkillAgentModal from './AddSkillAgentModal';

interface SkillsListProps {
  skills: SkillResponse[];
  variant: 'my' | 'public';
  onDeleteSuccess: (skillId: string) => void;
}

export default function SkillsList({
  skills,
  variant,
  onDeleteSuccess,
}: SkillsListProps) {
  const t = useTranslations('Skills');
  const locale = useLocale();
  const router = useRouter();

  const [deletingSkill, setDeletingSkill] = useState<SkillResponse | null>(null);
  const [bindingSkill, setBindingSkill] = useState<SkillResponse | null>(null);

  const handleDeleteSuccess = (skillId: string) => {
    setDeletingSkill(null);
    onDeleteSuccess(skillId);
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

                {skill.connectorCodes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
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
                    onClick={() => setBindingSkill(skill)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors whitespace-nowrap"
                  >
                    <LinkIcon className="h-4 w-4" />
                    {t('bindToAgent')}
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

      {bindingSkill && (
        <AddSkillAgentModal
          skillId={bindingSkill.id}
          onClose={() => setBindingSkill(null)}
          onSuccess={() => setBindingSkill(null)}
        />
      )}
    </>
  );
}
