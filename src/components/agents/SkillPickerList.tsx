'use client';

import { useTranslations } from 'next-intl';
import type { SkillResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Placeholder } from '@/components/ui/Placeholder';
import { useSkillPickerQuery } from '@/queries/skills';
import {
  SkillCatalogToolbar,
  SkillListTail,
  useRevealedRows,
  useSkillCatalogFilters,
} from '@/components/skills/SkillCatalogToolbar';
import { getErrorMessage } from '@/utils/error';
import SkillPickRow from './SkillPickRow';

// Rows revealed at once; "show more" grows the list in place. Both scopes are
// merged client-side, so there is no server page to walk (see the query module).
export const SKILL_PICK_CHUNK = 8;

interface SkillPickerListProps {
  boundSkillIds: Set<string>;
  selectedSkillId: string | null;
  connectorName: (code: string) => string;
  onPick: (skill: SkillResponse) => void;
  onSourceChange: () => void;
}

// The whole catalogue, searchable: the picker's default face. Owns its filters
// so a caller that shows a different list never pays for these requests.
export default function SkillPickerList({
  boundSkillIds,
  selectedSkillId,
  connectorName,
  onPick,
  onSourceChange,
}: SkillPickerListProps) {
  const t = useTranslations('Agents');
  const catalogFilters = useSkillCatalogFilters({ onSourceChange });

  const {
    skills,
    isPending,
    error,
    truncated,
  } = useSkillPickerQuery(
    catalogFilters.source,
    catalogFilters.debouncedSearch,
    catalogFilters.filters,
  );

  const { visible, revealMore } = useRevealedRows(catalogFilters.listKey, SKILL_PICK_CHUNK);
  const shown = skills.slice(0, visible);

  return (
    <>
      {/* Same toolbar as the Skills page: source and tags behind the funnel,
          the catalog's sections in the open. */}
      <SkillCatalogToolbar state={catalogFilters} placeholder={t('searchSkills')} size="sm" />

      <div className="min-h-[280px]">
        {isPending ? (
          <Placeholder size="sm">{t('loadingSkills')}</Placeholder>
        ) : error ? (
          <ErrorAlert>{getErrorMessage(error, 'Failed to load skills')}</ErrorAlert>
        ) : skills.length === 0 ? (
          <Placeholder size="sm">{t('noSkillsFound')}</Placeholder>
        ) : (
          <div className="space-y-1">
            {shown.map((skill) => {
              const bound = boundSkillIds.has(skill.id);
              return (
                <SkillPickRow
                  key={skill.id}
                  skill={skill}
                  selected={selectedSkillId === skill.id}
                  bound={bound}
                  disabled={bound}
                  connectorName={connectorName}
                  onSelect={() => {
                    if (!bound) onPick(skill);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      <SkillListTail
        total={skills.length}
        visible={visible}
        truncated={truncated}
        onMore={revealMore}
      />
    </>
  );
}
