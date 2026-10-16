import { Link } from '@/i18n/navigation';
import { Chip } from '@/components/ui/Chip';
import { ConnectorChips } from '@/components/catalog/ConnectorChips';
import { getAgentAvatarUrl } from '@/utils/avatar';
import { OTHER_CATEGORY } from '@/utils/taxonomy';
import type { CatalogConnectorRef } from '@/types';

const CARD_CLASS =
  'group flex h-full flex-col rounded-2xl border border-border/50 bg-surface p-6 shadow-card transition-colors hover:border-accent/50';

export interface CatalogCardLabels {
  categoryLabel: (code: string) => string;
  tagLabel: (code: string) => string;
}

// Section, then tags; "Other" says nothing about the item and is left out.
export function TaxonomyLine({
  category,
  tags,
  labels,
}: {
  category: string;
  tags: string[];
  labels: CatalogCardLabels;
}) {
  if (category === OTHER_CATEGORY && tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {category !== OTHER_CATEGORY && <Chip strong>{labels.categoryLabel(category)}</Chip>}
      {tags.map((tag) => (
        <Chip key={tag} tone="muted">
          {labels.tagLabel(tag)}
        </Chip>
      ))}
    </div>
  );
}

export function PresetCard({
  name,
  title,
  description,
  category,
  tags,
  connectors,
  labels,
}: {
  name: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  connectors: CatalogConnectorRef[];
  labels: CatalogCardLabels;
}) {
  return (
    <Link href={`/catalog/agents/${encodeURIComponent(name)}`} className={CARD_CLASS}>
      <div className="mb-4 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- a generated data: URI */}
        <img src={getAgentAvatarUrl(name)} alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <h3 className="text-lg font-semibold leading-snug group-hover:text-accent transition-colors">{title}</h3>
      </div>
      {description && <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-muted">{description}</p>}
      <div className="mt-auto space-y-2">
        <TaxonomyLine category={category} tags={tags} labels={labels} />
        {connectors.length > 0 && <ConnectorChips connectors={connectors} limit={4} />}
      </div>
    </Link>
  );
}

export function SkillCard({
  name,
  title,
  description,
  connectors,
}: {
  name: string;
  title: string;
  description: string | null;
  connectors: CatalogConnectorRef[];
}) {
  return (
    <Link href={`/catalog/skills/${encodeURIComponent(name)}`} className={CARD_CLASS}>
      <h3 className="mb-2 font-semibold leading-snug group-hover:text-accent transition-colors">{title}</h3>
      {description && <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-muted">{description}</p>}
      {connectors.length > 0 && (
        <div className="mt-auto">
          <ConnectorChips connectors={connectors} limit={3} />
        </div>
      )}
    </Link>
  );
}
