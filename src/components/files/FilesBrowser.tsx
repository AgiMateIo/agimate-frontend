'use client';

import { Suspense, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { FilterRow } from '@/components/ui/FilterPill';
import { Select } from '@/components/ui/FormField';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { allAgentsOptions } from '@/queries/agents';
import UserFilesList from './UserFilesList';
import { FilesViewSwitcher } from './FilesViewSwitcher';
import { useFilesViewMode } from './filesViewMode';
import { Placeholder } from '@/components/ui/Placeholder';

/**
 * Search + filters + the file list in the chosen view mode.
 *
 * `fixedAgentId` scopes the browser to one agent (the agent's own Files
 * section): the filter is already answered by the route, so the picker is
 * replaced by nothing at all rather than a select the user could contradict.
 */
export default function FilesBrowser({ fixedAgentId }: { fixedAgentId?: string }) {
  const t = useTranslations('Files');
  const { mode, setMode } = useFilesViewMode();

  const [search, setSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const agentId = fixedAgentId ?? selectedAgent;

  // Non-suspense: the list must render even if the agents lookup fails — it
  // only turns an `agentId` into a name and feeds the filter.
  const agentsQuery = useQuery(allAgentsOptions());
  const agents = useMemo(() => agentsQuery.data?.content ?? [], [agentsQuery.data]);
  const agentNames = useMemo(() => new Map(agents.map((a) => [a.id, a.name])), [agents]);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        {/* Outside the Suspense boundary: typing must never unmount the field. */}
        <div className="min-w-0 flex-1">
          <SearchToolbar
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(0);
            }}
            placeholder={t('searchPlaceholder')}
            filtersActive={selectedAgent !== ''}
            filters={
              fixedAgentId ? undefined : (
                <FilterRow label={t('agentFilterLabel')}>
                  {/* "What did this agent produce" is the filtering case that
                      matters; a pill row would not survive 30 agents. */}
                  <div className="w-64">
                    <Select
                      value={selectedAgent}
                      onChange={(e) => {
                        setSelectedAgent(e.target.value);
                        setPage(0);
                      }}
                    >
                      <option value="">{t('allAgents')}</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </FilterRow>
              )
            }
          />
        </div>
        <div className="pt-0.5">
          <FilesViewSwitcher mode={mode} onChange={setMode} />
        </div>
      </div>

      <ErrorBoundary resetKeys={[debouncedSearch, agentId, page, pageSize]}>
        <Suspense
          fallback={<Placeholder>{t('loadingFiles')}</Placeholder>}
        >
          <UserFilesList
            agentId={agentId}
            name={debouncedSearch}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(0);
            }}
            agentNames={agentNames}
            mode={mode}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
