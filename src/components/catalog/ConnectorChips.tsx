import { Chip } from '@/components/ui/Chip';
import type { CatalogConnectorRef } from '@/types';

// The services an agent or a skill works with. Connectors have no pages of
// their own, so a chip is all there is — the description goes in the tooltip.
export function ConnectorChips({
  connectors,
  limit,
}: {
  connectors: CatalogConnectorRef[];
  limit?: number;
}) {
  const shown = limit ? connectors.slice(0, limit) : connectors;
  const rest = connectors.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((c) => (
        <Chip key={c.code} title={c.description ?? undefined}>
          {c.name}
        </Chip>
      ))}
      {rest > 0 && <Chip tone="muted">+{rest}</Chip>}
    </div>
  );
}
