'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SkillResponse } from '@/types';
import type { PickedSkill } from '@/queries/skills';
import { TrashIcon, PencilIcon, LinkIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import SkillCard from './SkillCard';
import DeleteSkillModal from './DeleteSkillModal';
import AddSkillAgentModal from './AddSkillAgentModal';

interface SkillsListProps {
  skills: PickedSkill[];
  // Shown when the list is empty; the wording depends on the active source filter.
  emptyText: string;
  onDeleteSuccess: (skillId: string) => void;
}

export default function SkillsList({
  skills,
  emptyText,
  onDeleteSuccess,
}: SkillsListProps) {
  const t = useTranslations('Skills');
  const router = useRouter();

  const [deletingSkill, setDeletingSkill] = useState<SkillResponse | null>(null);
  const [bindingSkill, setBindingSkill] = useState<SkillResponse | null>(null);

  const handleDeleteSuccess = (skillId: string) => {
    setDeletingSkill(null);
    onDeleteSuccess(skillId);
  };

  if (skills.length === 0) {
    return <div className="text-center py-8 text-muted">{emptyText}</div>;
  }

  return (
    <>
      <div className="space-y-3">
        {skills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            onClick={() => router.push(`/dashboard/skills/${skill.id}`)}
            showConnectorCodes
            actions={
              <>
                {/* Own skills are editable; everyone else's can only be bound. */}
                {skill.mine && (
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

                {!skill.mine && (
                  <button
                    onClick={() => setBindingSkill(skill)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors whitespace-nowrap"
                  >
                    <LinkIcon className="h-4 w-4" />
                    {t('bindToAgent')}
                  </button>
                )}
              </>
            }
          />
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
