'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Chip } from '@/components/ui/Chip';
import { getAgentAvatarUrl } from '@/utils/avatar';
import { formatDateTimeFull, formatDateTimeShort } from '@/utils/date';
import type { AgentResponse } from '@/types';
import { TYPE_META, agentHref, agentPreview, previewTooltip } from './agentMeta';

// Two chips is what a fixed column holds; the rest is a count with the full
// list in the tooltip.
const MAX_SKILLS = 2;

function AgentRow({ agent }: { agent: AgentResponse }) {
  const t = useTranslations('Agents');

  const typeMeta = TYPE_META[agent.type];
  const preview = agentPreview(agent);
  const extraSkills = agent.skills.length - MAX_SKILLS;

  return (
    <tr className={`border-b border-border transition-colors last:border-b-0 hover:bg-surface-secondary ${agent.enabled ? '' : 'opacity-60'}`}>
      <td className="py-2 pr-2">
        {/* The portrait navigates too — in the other two views the whole item does. */}
        <Link href={agentHref(agent)} tabIndex={-1} aria-hidden>
          <img
            src={getAgentAvatarUrl(agent.name)}
            alt=""
            className="h-10 w-10 shrink-0 rounded-md bg-surface-secondary"
          />
        </Link>
      </td>
      <td className="max-w-0 py-2 px-2">
        <Link
          href={agentHref(agent)}
          className="block truncate text-sm font-medium text-foreground hover:text-accent"
          title={agent.name}
        >
          {agent.name}
        </Link>
        {/* The prompt stands in for a missing description, in mono as on the
            card — it is the agent's text, not a sentence someone wrote about it. */}
        {preview && (
          <div
            className={`truncate text-xs text-muted ${agent.description ? '' : 'font-mono'}`}
            title={previewTooltip(agent) ?? undefined}
          >
            {preview}
          </div>
        )}
      </td>
      <td className="hidden py-2 px-2 md:table-cell">
        <Chip icon={typeMeta.icon} tone="accent">{t(typeMeta.labelKey)}</Chip>
      </td>
      <td className="hidden py-2 px-2 lg:table-cell">
        <span className="block truncate text-sm text-muted" title={agent.agenticTeamName ?? undefined}>
          {agent.agenticTeamName ?? '—'}
        </span>
      </td>
      <td className="hidden py-2 px-2 lg:table-cell">
        {agent.skills.length === 0 ? (
          <span className="text-sm text-muted">—</span>
        ) : (
          <div className="flex flex-wrap gap-1" title={agent.skills.map((s) => s.name).join('\n')}>
            {agent.skills.slice(0, MAX_SKILLS).map((skill) => (
              <Chip key={skill.id}>{skill.name}</Chip>
            ))}
            {extraSkills > 0 && <Chip>+{extraSkills}</Chip>}
          </div>
        )}
      </td>
      <td className="py-2 px-2">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted">
          <span className={`h-2 w-2 shrink-0 rounded-full ${agent.enabled ? 'bg-success' : 'bg-muted'}`} />
          <span className="truncate">{agent.enabled ? t('enabled') : t('disabled')}</span>
        </span>
      </td>
      <td className="hidden py-2 pl-2 md:table-cell">
        <span className="block truncate text-sm text-muted" title={formatDateTimeFull(agent.createdAt)}>
          {formatDateTimeShort(agent.createdAt)}
        </span>
      </td>
    </tr>
  );
}

// Dense view: one row per agent with the fields worth comparing across them —
// how events reach it, whose team it is on, what it can do, whether it is on.
export function AgentsTable({ agents }: { agents: AgentResponse[] }) {
  const t = useTranslations('Agents');

  return (
    <div className="overflow-x-auto">
      {/* No card of its own: every page that shows this table already sits in
          one. table-fixed keeps one long agent name from re-sizing the columns,
          and the min width makes the wrapper scroll instead of squeezing them. */}
      <table className="w-full min-w-[44rem] table-fixed">
        <thead>
          <tr className="border-b border-border">
            <th className="w-14" />
            <th className="py-3 px-2 text-left text-sm font-medium text-muted">{t('nameLabel')}</th>
            <th className="hidden w-36 py-3 px-2 text-left text-sm font-medium text-muted md:table-cell">
              {t('agentType')}
            </th>
            <th className="hidden w-40 py-3 px-2 text-left text-sm font-medium text-muted lg:table-cell">
              {t('columnTeam')}
            </th>
            <th className="hidden w-56 py-3 px-2 text-left text-sm font-medium text-muted lg:table-cell">
              {t('skills')}
            </th>
            <th className="w-32 py-3 px-2 text-left text-sm font-medium text-muted">{t('status')}</th>
            <th className="hidden w-28 py-3 pl-2 text-left text-sm font-medium text-muted md:table-cell">
              {t('createdAt')}
            </th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <AgentRow key={agent.id} agent={agent} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
