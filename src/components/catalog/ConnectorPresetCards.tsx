import { Link } from '@/i18n/navigation';
import { Chip } from '@/components/ui/Chip';
import type { CatalogConnectorPresetResponse, ConnectorPresetAuth } from '@/types';

const CARD_CLASS =
  'group flex h-full flex-col rounded-2xl border border-border/50 bg-surface p-6 shadow-card transition-colors hover:border-accent/50';

const AUTH_TONE: Record<ConnectorPresetAuth, 'accent' | 'default' | 'muted'> = {
  OAUTH: 'accent',
  TOKEN: 'default',
  NONE: 'muted',
  UNKNOWN: 'muted',
};

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

// The vendor icon, or a monogram when the card has none. Kept hook-free: the
// list is server-rendered and a per-card error state would add a client
// boundary for a fallback that should almost never trigger.
const ICON_SIZES = {
  md: 'h-12 w-12 rounded-xl text-base',
  lg: 'h-16 w-16 rounded-2xl text-xl',
} as const;

export function ServiceIcon({
  name,
  iconUrl,
  size = 'md',
}: {
  name: string;
  iconUrl: string | null;
  size?: keyof typeof ICON_SIZES;
}) {
  const tile = ICON_SIZES[size];
  if (iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a vendor-hosted icon
      <img
        src={iconUrl}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`${tile} shrink-0 object-contain`}
      />
    );
  }
  return (
    <div
      className={`${tile} flex shrink-0 items-center justify-center bg-surface-secondary font-bold text-muted`}
    >
      {initials(name)}
    </div>
  );
}

export function ConnectorPresetCard({
  preset,
  categoryLabel,
  jurisdictionLabel,
  authLabel,
  availabilityLabel,
}: {
  preset: CatalogConnectorPresetResponse;
  categoryLabel: string;
  jurisdictionLabel: string | null;
  authLabel: string;
  availabilityLabel: string | null;
}) {
  const { card } = preset;
  return (
    <Link
      href={`/catalog/connectors/${encodeURIComponent(preset.code)}`}
      className={CARD_CLASS}
    >
      <div className="mb-4 flex items-center gap-3">
        <ServiceIcon name={card.name} iconUrl={card.iconUrl} />
        <h3 className="text-lg font-semibold leading-snug transition-colors group-hover:text-accent">
          {card.name}
        </h3>
      </div>
      {card.description && (
        <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-muted">{card.description}</p>
      )}
      <div className="mt-auto space-y-2">
        <div className="flex flex-wrap gap-1">
          <Chip tone={AUTH_TONE[card.auth]}>{authLabel}</Chip>
          <Chip>{categoryLabel}</Chip>
          {jurisdictionLabel && <Chip>{jurisdictionLabel}</Chip>}
        </div>
        {availabilityLabel && <p className="text-xs text-warning">{availabilityLabel}</p>}
      </div>
    </Link>
  );
}
