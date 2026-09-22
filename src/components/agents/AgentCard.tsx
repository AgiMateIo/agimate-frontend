'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Chip } from '@/components/ui/Chip';
import { getAgentAvatarUrl } from '@/utils/avatar';
import { UnreadBadge } from '@/components/ui/UnreadBadge';
import { useAgentUnread } from '@/queries/webchat';
import type { AgentResponse } from '@/types';
import { TYPE_META, agentHref } from './agentMeta';

// Cap the skill chips so a heavily-bound agent doesn't blow up the card height.
const MAX_SKILLS = 4;

// The roomy view: portrait, description and the skills the agent carries.
export function AgentCard({ agent }: { agent: AgentResponse }) {
  const t = useTranslations('Agents');

  const typeMeta = TYPE_META[agent.type];
  const unread = useAgentUnread(agent.id);
  const preview = agent.description || agent.instructions;
  const extraSkills = agent.skills.length - MAX_SKILLS;

  return (
    <Link
      href={agentHref(agent)}
      className={`group relative flex flex-col items-center text-center bg-surface-secondary rounded-lg border border-border hover:border-accent/50 transition-colors p-5 ${agent.enabled ? '' : 'opacity-60'}`}
    >
      <div className="absolute top-3 left-3">
        <Chip icon={typeMeta.icon} tone="accent">{t(typeMeta.labelKey)}</Chip>
      </div>

      <span className="relative mt-4">
        <img
          src={getAgentAvatarUrl(agent.name)}
          alt={agent.name}
          className="w-40 h-40 rounded-2xl"
        />
        <span
          className={`absolute bottom-2 left-2 h-3 w-3 rounded-full ring-2 ring-background ${agent.enabled ? 'bg-success' : 'bg-muted'}`}
          title={agent.enabled ? t('enabled') : t('disabled')}
        />
        <UnreadBadge count={unread} ring className="absolute -right-1.5 -top-1.5" />
      </span>
      <h3 className="w-full truncate font-semibold text-foreground mt-3 group-hover:text-accent transition-colors">
        {agent.name}
      </h3>
      {preview && (
        <p className={`w-full text-sm text-muted mt-1 line-clamp-2 ${agent.description ? '' : 'font-mono'}`}>
          {preview}
        </p>
      )}

      {agent.skills.length > 0 && (
        <div className="w-full mt-4 pt-3 border-t border-border flex flex-wrap justify-center gap-1.5">
          {agent.skills.slice(0, MAX_SKILLS).map((skill) => (
            <Chip key={skill.id}>{skill.name}</Chip>
          ))}
          {extraSkills > 0 && <Chip>+{extraSkills}</Chip>}
        </div>
      )}
    </Link>
  );
}
