'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MagnifyingGlassIcon, FunnelIcon, CalendarIcon, ClockIcon, HashtagIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';
import { localeMap } from '@/i18n/routing';
import { ConnectionResponse, ConnectorCatalogEntry } from '@/types';
import { formatDate } from '@/utils/date';
import { Toggle } from '@/components/ui/Toggle';
import { useUpdateConnectionMutation } from '@/queries/connections';
import { ConnectionAvatar } from './ConnectionAvatar';

interface ConnectionsListProps {
  connections: ConnectionResponse[];
  platforms: ConnectorCatalogEntry[];
}

type StatusFilter = 'ALL' | 'ENABLED' | 'DISABLED';

// Compact metadata pill used along the card's second row.
function Chip({
  icon: Icon,
  children,
}: {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-border text-muted">
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      <span className="truncate max-w-[16rem]">{children}</span>
    </span>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? 'bg-accent text-white border-accent'
          : 'border-border text-muted hover:text-foreground hover:border-accent/50'
      }`}
    >
      {children}
    </button>
  );
}

function ConnectionCard({
  connection,
  connector,
}: {
  connection: ConnectionResponse;
  connector: ConnectorCatalogEntry | undefined;
}) {
  const t = useTranslations('Connections');
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];
  const updateMutation = useUpdateConnectionMutation(connection.id);
  const connectorName = connector?.name ?? connection.connectorCode;

  const handleToggleEnabled = () => {
    updateMutation.mutate({ enabled: !connection.enabled });
  };

  return (
    <div className="group relative bg-surface-secondary rounded-xl border border-border hover:border-accent/50 transition-colors p-4">
      <div className="absolute top-4 right-4" title={connection.enabled ? t('enabled') : t('disabled')}>
        <Toggle
          checked={connection.enabled}
          onChange={handleToggleEnabled}
          disabled={updateMutation.isPending}
        />
      </div>

      <Link href={`/dashboard/connections/${connection.id}`} className="block pr-10">
        <div className="flex items-start gap-3 min-w-0">
          <ConnectionAvatar connectorCode={connection.connectorCode} connectorName={connectorName} />

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate group-hover:text-accent transition-colors">
              {connection.name || connection.fullCode}
            </h3>
            <p className="text-xs text-muted mt-0.5 truncate">{connectorName}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          <Chip icon={HashtagIcon}>{connection.subCode}</Chip>
          <Chip icon={CalendarIcon}>{formatDate(connection.createdAt, bcp47Locale)}</Chip>
          {connection.lastUsedAt && (
            <Chip icon={ClockIcon}>{formatDate(connection.lastUsedAt, bcp47Locale)}</Chip>
          )}
        </div>
      </Link>
    </div>
  );
}

export default function ConnectionsList({
  connections,
  platforms,
}: ConnectionsListProps) {
  const t = useTranslations('Connections');
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const platformByCode = useMemo(() => {
    const map = new Map<string, ConnectorCatalogEntry>();
    for (const p of platforms) map.set(p.code, p);
    return map;
  }, [platforms]);
  const getConnector = (code: string) => platformByCode.get(code);

  // Only offer platforms that actually have connections, sorted by name.
  const usedPlatforms = useMemo(() => {
    const codes = Array.from(new Set(connections.map(c => c.connectorCode)));
    return codes
      .map(code => ({ code, name: platformByCode.get(code)?.name ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [connections, platformByCode]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return connections.filter((connection) => {
      if (platformFilter !== 'ALL' && connection.connectorCode !== platformFilter) return false;
      if (statusFilter === 'ENABLED' && !connection.enabled) return false;
      if (statusFilter === 'DISABLED' && connection.enabled) return false;
      if (!query) return true;
      const connectorName = platformByCode.get(connection.connectorCode)?.name ?? '';
      return (
        connection.name.toLowerCase().includes(query) ||
        connection.fullCode.toLowerCase().includes(query) ||
        connection.subCode.toLowerCase().includes(query) ||
        connectorName.toLowerCase().includes(query)
      );
    });
  }, [connections, platformFilter, statusFilter, search, platformByCode]);

  if (connections.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        {t('noConnections')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-10 pr-11 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground placeholder:text-muted text-sm"
          />
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            aria-label={t('advancedFilters')}
            aria-pressed={showFilters}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors ${
              showFilters || platformFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'text-accent bg-accent/10'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <FunnelIcon className="h-5 w-5" />
          </button>
        </div>

        {showFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <FilterPill active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')}>
              {t('filterAll')}
            </FilterPill>
            <FilterPill active={statusFilter === 'ENABLED'} onClick={() => setStatusFilter('ENABLED')}>
              {t('enabled')}
            </FilterPill>
            <FilterPill active={statusFilter === 'DISABLED'} onClick={() => setStatusFilter('DISABLED')}>
              {t('disabled')}
            </FilterPill>

            {usedPlatforms.length > 1 && (
              <>
                <span className="w-px h-4 bg-border mx-1" />
                <FilterPill active={platformFilter === 'ALL'} onClick={() => setPlatformFilter('ALL')}>
                  {t('filterAllPlatforms')}
                </FilterPill>
                {usedPlatforms.map(p => (
                  <FilterPill key={p.code} active={platformFilter === p.code} onClick={() => setPlatformFilter(p.code)}>
                    {p.name}
                  </FilterPill>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted">
          {t('noSearchResults')}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((connection) => (
            <ConnectionCard
              key={connection.id}
              connection={connection}
              connector={getConnector(connection.connectorCode)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
