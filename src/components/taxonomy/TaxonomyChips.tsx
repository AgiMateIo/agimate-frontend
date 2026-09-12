'use client';

import { Chip } from '@/components/ui/Chip';
import { useTaxonomyLabels } from '@/queries/taxonomy';
import { OTHER_CATEGORY, catalogCategory, catalogTags, type Categorised } from '@/utils/taxonomy';

// Where the item sits in the catalog: its section, then its tags. "Other" is
// left out — it says nothing about the item, only that nobody sorted it.
export function TaxonomyChips({ item }: { item: Categorised }) {
  const { categoryLabel, tagLabel } = useTaxonomyLabels();
  const category = catalogCategory(item);
  const tags = catalogTags(item);
  if (category === OTHER_CATEGORY && tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {category !== OTHER_CATEGORY && (
        <Chip strong>{categoryLabel(category)}</Chip>
      )}
      {tags.map((tag) => (
        <Chip key={tag} tone="muted">{tagLabel(tag)}</Chip>
      ))}
    </div>
  );
}
