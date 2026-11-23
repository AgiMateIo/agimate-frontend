'use client';

import { useTranslations } from 'next-intl';
import type { SkillResponse } from '@/types';
import { Chip } from '@/components/ui/Chip';
import { skillRequirements } from '@/utils/skill';
import SkillRequirementChips from '@/components/skills/SkillRequirementChips';

interface SkillPickRowProps {
  skill: SkillResponse;
  selected: boolean;
  bound: boolean;
  disabled?: boolean;
  connectorName: (code: string) => string;
  onSelect: () => void;
}

// One row of a skill picker. `bound` only labels it — clickability is
// `disabled`, so a bound skill stays reachable where re-pointing it is the point.
export default function SkillPickRow({
  skill,
  selected,
  bound,
  disabled = false,
  connectorName,
  onSelect,
}: SkillPickRowProps) {
  const t = useTranslations('Agents');
  const tSkills = useTranslations('Skills');

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
        disabled
          ? 'border-transparent opacity-50 cursor-not-allowed'
          : selected
            ? 'border-accent bg-accent/5'
            : 'border-transparent hover:bg-surface-secondary'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{skill.title}</span>
        <span className="text-xs text-muted">v{skill.version}</span>
        {skill.isPublic && <Chip strong tone="success">{tSkills('public')}</Chip>}
        {bound && <span className="text-xs text-muted">({t('alreadyBound')})</span>}
      </div>
      {skill.description && (
        <p className="text-xs text-muted mt-0.5 line-clamp-1">{skill.description}</p>
      )}
      <div className="mt-1">
        <SkillRequirementChips requirements={skillRequirements(skill)} nameOf={connectorName} />
      </div>
    </button>
  );
}
