'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { SkillResponse } from '@/types';
import { Link } from '@/i18n/navigation';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Placeholder } from '@/components/ui/Placeholder';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { SkillListTail, useRevealedRows } from '@/components/skills/SkillCatalogToolbar';
import { useConnectionSkillsQuery } from '@/queries/skills';
import { getErrorMessage } from '@/utils/error';
import SkillPickRow from './SkillPickRow';
import { SKILL_PICK_CHUNK } from './SkillPickerList';

interface ConnectionSkillListProps {
  connectionId: string;
  boundSkillIds: Set<string>;
  selectedSkillId: string | null;
  connectorName: (code: string) => string;
  onPick: (skill: SkillResponse) => void;
}

// Skills that fit this connection, as the server reads it: same connector code
// and matching params — for MCP that is the server's URL. A requirement with no
// params fits any instance, which is the author's choice, not ours.
export default function ConnectionSkillList({
  connectionId,
  boundSkillIds,
  selectedSkillId,
  connectorName,
  onPick,
}: ConnectionSkillListProps) {
  const t = useTranslations('Agents');
  const [search, setSearch] = useState('');
  const { skills, isPending, error, truncated } = useConnectionSkillsQuery(connectionId);

  const query = search.trim().toLowerCase();
  const filtered = query
    ? skills.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          (s.description ?? '').toLowerCase().includes(query),
      )
    : skills;
  // The search is part of the key: otherwise "show more" survives narrowing it.
  const { visible, revealMore } = useRevealedRows(`conn:${connectionId}:${query}`, SKILL_PICK_CHUNK);
  const shown = filtered.slice(0, visible);

  return (
    <div className="space-y-4">
      <SearchToolbar
        size="sm"
        value={search}
        onChange={setSearch}
        placeholder={t('searchSkills')}
      />

      <div className="min-h-[280px]">
        {isPending ? (
          <Placeholder size="sm">{t('loadingSkills')}</Placeholder>
        ) : error ? (
          <ErrorAlert>{getErrorMessage(error, 'Failed to load skills')}</ErrorAlert>
        ) : skills.length === 0 ? (
          <div className="space-y-3">
            <Placeholder size="sm">{t('noCompatibleSkills')}</Placeholder>
            <Link
              href="/dashboard/skills"
              className="block text-sm text-accent underline hover:no-underline"
            >
              {t('openSkillsPage')}
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <Placeholder size="sm">{t('noCompatibleMatches')}</Placeholder>
        ) : (
          <div className="space-y-1">
            {shown.map((skill) => (
              <SkillPickRow
                key={skill.id}
                skill={skill}
                selected={selectedSkillId === skill.id}
                bound={boundSkillIds.has(skill.id)}
                connectorName={connectorName}
                onSelect={() => onPick(skill)}
              />
            ))}
          </div>
        )}
      </div>

      <SkillListTail
        total={filtered.length}
        visible={visible}
        truncated={truncated}
        onMore={revealMore}
      />
    </div>
  );
}
