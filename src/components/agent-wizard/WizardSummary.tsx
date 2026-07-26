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

// The draft so far, under the stepper: the agent takes one third, its skills the
// remaining two — they are the many, and they grow while the name does not.
export default function WizardSummary({ name, skills, onRemoveSkill }: WizardSummaryProps) {
  const t = useTranslations('AgentWizard');

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-3 sm:gap-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <img
          src={getAgentAvatarUrl(name)}
          alt=""
          className="h-8 w-8 shrink-0 rounded-lg"
        />
        <span className="truncate text-sm font-semibold text-foreground">{name}</span>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:col-span-2">
        {skills.length === 0 ? (
          <p className="text-xs text-muted">{t('summaryNoSkills')}</p>
        ) : (
          skills.map((skill) =>
            onRemoveSkill ? (
              // Hand-rolled rather than <Chip>: this pill owns a remove button.
              <span
                key={skill.id}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-accent/10 py-1 pl-2.5 pr-1 text-xs font-medium text-accent"
              >
                <span className="truncate">{skill.title}</span>
                <button
                  type="button"
                  onClick={() => onRemoveSkill(skill.id)}
                  title={t('removeSkill')}
                  aria-label={t('removeSkill')}
                  className="shrink-0 rounded-full p-0.5 transition-colors hover:bg-accent/20"
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
