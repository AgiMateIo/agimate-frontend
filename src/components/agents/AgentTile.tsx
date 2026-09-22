'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getAgentAvatarUrl } from '@/utils/avatar';
import type { AgentResponse } from '@/types';
import { TYPE_META, agentHref, previewTooltip } from './agentMeta';

// Compact tile for the wall of portraits: the face does the identifying, the
// rest moves into the tooltip so eight of these fit in a row. The type keeps a
// glyph — it decides where the tile leads, so it can't be tooltip-only.
export function AgentTile({ agent }: { agent: AgentResponse }) {
  const t = useTranslations('Agents');

  const typeMeta = TYPE_META[agent.type];
  const TypeIcon = typeMeta.icon;
  const tooltip = [
    agent.name,
    `${t(typeMeta.labelKey)} · ${agent.enabled ? t('enabled') : t('disabled')}`,
    previewTooltip(agent),
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <Link
      href={agentHref(agent)}
      title={tooltip}
      className={`group min-w-0 ${agent.enabled ? '' : 'opacity-60'}`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-surface-secondary transition-colors group-hover:border-accent/50">
        <img src={getAgentAvatarUrl(agent.name)} alt={agent.name} className="h-full w-full object-cover" />

        <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-background/80 text-accent">
          <TypeIcon className="h-3 w-3" />
        </span>
        <span
          className={`absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-background ${agent.enabled ? 'bg-success' : 'bg-muted'}`}
        />
      </div>

      <div className="mt-1 truncate text-xs text-foreground group-hover:text-accent">{agent.name}</div>
    </Link>
  );
}
