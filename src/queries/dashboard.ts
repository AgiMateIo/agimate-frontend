'use client';

import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/error';
import { agentsListOptions } from './agents';
import { agenticTeamsListOptions } from './agentic-teams';
import { appsListOptions } from './apps';
import { channelsListOptions } from './channels';
import { connectionsListOptions } from './connections';
import { llmProvidersListOptions } from './llm-providers';
import { skillsListOptions } from './skills';
import { webchatSessionsOptions } from './webchat';

export interface DashboardCount {
  // null until the first successful load (or after a failure).
  count: number | null;
  loading: boolean;
  // Backend message, '' when it carried none. null = no failure.
  error: string | null;
}

const toCount = <T,>(
  result: UseQueryResult<T>,
  size: (data: T) => number,
): DashboardCount => ({
  count: result.data !== undefined ? size(result.data) : null,
  loading: result.isPending,
  error: result.error ? getErrorMessage(result.error, '') : null,
});

/**
 * Every count the dashboard home renders, in one place.
 *
 * Deliberately non-suspense and per-card: the home is an overview, so one
 * failing list must degrade to one broken card rather than blank the page.
 * These are the domains' own list options, so the fetches double as a cache
 * warm-up for the pages behind the cards.
 */
export function useDashboardResources() {
  const [apps, agents, skills, connections, channels, teams, providers, sessions] =
    useQueries({
      queries: [
        appsListOptions(),
        agentsListOptions(),
        skillsListOptions('my'),
        connectionsListOptions(),
        channelsListOptions(),
        agenticTeamsListOptions(),
        llmProvidersListOptions(),
        webchatSessionsOptions(),
      ],
    });

  return {
    apps: toCount(apps, (d) => d.totalElements),
    agents: toCount(agents, (d) => d.totalElements),
    skills: toCount(skills, (d) => d.totalElements),
    connections: toCount(connections, (d) => d.length),
    channels: toCount(channels, (d) => d.length),
    teams: toCount(teams, (d) => d.length),
    llmProviders: toCount(providers, (d) => d.length),
    chatSessions: toCount(sessions, (d) => d.length),
    // Target for the "talk to an agent" action — chat is per-agent, there is no
    // standalone chat route.
    firstAgentId: agents.data?.content[0]?.id ?? null,
  };
}

export type DashboardResources = ReturnType<typeof useDashboardResources>;
