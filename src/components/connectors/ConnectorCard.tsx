'use client';

import { Link } from '@/i18n/navigation';
import { ConnectorInfo } from '@/types';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

interface ConnectorCardProps {
  connector: ConnectorInfo;
  credentialCount?: number;
}

export default function ConnectorCard({ connector, credentialCount }: ConnectorCardProps) {
  return (
    <Link
      href={`/dashboard/connectors/${connector.code}`}
      className="block w-full bg-surface rounded-xl border border-border p-4 hover:shadow-md hover:border-accent/50 transition-all group"
    >
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="w-10 h-10 rounded-lg bg-surface-secondary flex items-center justify-center shrink-0">
          {connector.iconUrl ? (
            <img
              src={connector.iconUrl}
              alt={connector.name}
              className="w-8 h-8 object-contain"
            />
          ) : (
            <span className="text-xl font-bold text-muted">{connector.name.charAt(0)}</span>
          )}
        </div>

        {/* Name and Description */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground mb-1">{connector.name}</h3>
          <p className="text-xs text-muted line-clamp-1">{connector.description}</p>
          {credentialCount !== undefined && (
            <span className="text-xs text-muted mt-1 inline-block">
              {credentialCount} credential{credentialCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Arrow */}
        <ChevronRightIcon className="h-5 w-5 text-muted group-hover:text-foreground transition-colors shrink-0" />
      </div>
    </Link>
  );
}
