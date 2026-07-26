'use client';

import { useTranslations } from 'next-intl';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Chip } from '@/components/ui/Chip';
import { getAgentAvatarUrl } from '@/utils/avatar';
import type { WizardSkill } from './AgentWizard';

interface WizardSummaryProps {
  name: string;
  skills: WizardSkill[];
  // Omitted once the agent exists — the summary is then history, not a draft.
  onRemoveSkill?: (id: string) => void;
}

// What the wizard is building so far, under the stepper: the agent and the skills
// it will get. It lives here rather than inside the skills step because the set
// is the subject of the whole wizard — the step below only browses the library.
export default function WizardSummary({ name, skills, onRemoveSkill }: WizardSummaryProps) {
  const t = useTranslations('AgentWizard');

  return (
    <div className="mt-4 space-y-2 border-t border-border pt-4">
      <div className="flex items-center gap-2.5">
        <img
          src={getAgentAvatarUrl(name)}
          alt=""
          className="h-8 w-8 shrink-0 rounded-lg"
        />
        <span className="truncate text-sm font-semibold text-foreground">{name}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted">{t('summarySkillsLabel')}</span>
        {skills.length === 0 ? (
          <span className="text-xs text-muted">{t('summaryNoSkills')}</span>
        ) : (
          skills.map((skill) =>
            onRemoveSkill ? (
              // Hand-rolled rather than <Chip>: this pill owns a remove button.
              <span
                key={skill.id}
                className="inline-flex items-center gap-1 rounded-full bg-accent/10 py-1 pl-2.5 pr-1 text-xs font-medium text-accent"
              >
                <span className="truncate max-w-[14rem]">{skill.title}</span>
                <button
                  type="button"
                  onClick={() => onRemoveSkill(skill.id)}
                  title={t('removeSkill')}
                  aria-label={t('removeSkill')}
                  className="rounded-full p-0.5 transition-colors hover:bg-accent/20"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            ) : (
              <Chip key={skill.id} tone="accent">
                {skill.title}
              </Chip>
            ),
          )
        )}
      </div>
    </div>
  );
}
