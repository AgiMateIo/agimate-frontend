'use client';

import type { ComponentType, SVGProps } from 'react';
import { useTranslations } from 'next-intl';
import {
  BoltIcon,
  ArrowsRightLeftIcon,
  CpuChipIcon,
  ChatBubbleOvalLeftEllipsisIcon,
} from '@heroicons/react/24/outline';
import { AgentResponse, AgentType } from '@/types';
import { Link } from '@/i18n/navigation';
import { getAgentAvatarUrl } from '@/utils/avatar';
import { Chip } from '@/components/ui/Chip';

interface AgentsListProps {
  agents: AgentResponse[];
}

// Glyph + i18n label key per delivery type — realtime, HTTP callback, in-platform.
const TYPE_META: Record<AgentType, { icon: ComponentType<SVGProps<SVGSVGElement>>; labelKey: 'centrifugo' | 'webhook' | 'generic' }> = {
  CENTRIFUGO: { icon: BoltIcon, labelKey: 'centrifugo' },
  WEBHOOK: { icon: ArrowsRightLeftIcon, labelKey: 'webhook' },
  GENERIC: { icon: CpuChipIcon, labelKey: 'generic' },
};

// Cap the skill chips so a heavily-bound agent doesn't blow up the card height.
const MAX_SKILLS = 4;

export default function AgentsList({ agents }: AgentsListProps) {
  const t = useTranslations('Agents');

  if (agents.length === 0) {
    return <div className="text-center py-8 text-muted">{t('noAgents')}</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {agents.map((agent) => {
        const typeMeta = TYPE_META[agent.type];
        const preview = agent.description || agent.instructions;
        const extraSkills = agent.skills.length - MAX_SKILLS;

        return (
          <div
            key={agent.id}
            className={`group relative flex flex-col items-center text-center bg-surface-secondary rounded-lg border border-border hover:border-accent/50 transition-colors p-5 ${agent.enabled ? '' : 'opacity-60'}`}
          >
            {/* Stretched link: the whole card navigates to the agent, while the
                chat icon sits above it (z-10) as a separate link. */}
            <Link
              href={`/dashboard/agents/${agent.id}`}
              className="absolute inset-0 rounded-lg"
              aria-label={agent.name}
            />
            <div className="absolute top-3 left-3">
              <Chip icon={typeMeta.icon} tone="accent">{t(typeMeta.labelKey)}</Chip>
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <Link
                href={`/dashboard/agents/${agent.id}/chat`}
                className="relative z-10 -m-1 p-1 text-muted hover:text-accent transition-colors"
                title={t('tabChat')}
                aria-label={t('tabChat')}
              >
                <ChatBubbleOvalLeftEllipsisIcon className="w-4.5 h-4.5" />
              </Link>
              <span
                className={`h-2.5 w-2.5 rounded-full ${agent.enabled ? 'bg-success' : 'bg-muted'}`}
                title={agent.enabled ? t('enabled') : t('disabled')}
              />
            </div>

            <img
              src={getAgentAvatarUrl(agent.name)}
              alt={agent.name}
              className="w-20 h-20 rounded-2xl mt-4"
            />
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
          </div>
        );
      })}
    </div>
  );
}
