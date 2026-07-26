'use client';

import { useTranslations } from 'next-intl';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Chip } from '@/components/ui/Chip';
import { getAgentAvatarUrl } from '@/utils/avatar';
import type { WizardSkill } from './AgentWizard';

// The draft so far, rendered into the stepper's per-step cells: the agent under
// "Role", its skills under "Skills". Each piece sits under the step that produced
// it, so the header answers "what am I building" without repeating itself inside
// the open step.

export function AgentSummary({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <img
        src={getAgentAvatarUrl(name)}
        alt=""
        className="h-8 w-8 shrink-0 rounded-lg"
      />
      <span className="truncate text-sm font-semibold text-foreground">{name}</span>
    </div>
  );
}

export function SkillsSummary({
  skills,
  // Omitted once the agent exists — the summary is then history, not a draft.
  onRemoveSkill,
}: {
  skills: WizardSkill[];
  onRemoveSkill?: (id: string) => void;
}) {
  const t = useTranslations('AgentWizard');

  if (skills.length === 0) {
    return <p className="text-xs text-muted">{t('summaryNoSkills')}</p>;
  }

  // One per line: the cell is only as wide as the gap between two badges, and a
  // wrapping row of pills would read as a paragraph rather than a list.
  return (
    <div className="flex flex-col items-start gap-1">
      {skills.map((skill) =>
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
      )}
    </div>
  );
}
