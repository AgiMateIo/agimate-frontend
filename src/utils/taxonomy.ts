import type { TaxonomyEntry, TaxonomyResponse, TaxonomyTagGroup } from '@/types';

// The section a skill or a preset lands in when nobody sorted it. Shown under
// the dictionary's own label ("Прочее"), never hidden — but it is the one code
// a card does not repeat, since it says nothing about the item.
export const OTHER_CATEGORY = 'OTHER';

// Anything the catalog classifies: a skill row, a preset.
export interface Categorised {
  category?: string | null;
  tags?: string[] | null;
}

// A backend that predates the taxonomy answers without the fields; the
// contract past it is "category always, tags possibly empty".
export function catalogCategory(item: Categorised): string {
  return item.category || OTHER_CATEGORY;
}

export function catalogTags(item: Categorised): string[] {
  return item.tags ?? [];
}

// Dictionary code → the form SKILL.md frontmatter takes: `OWN_TOKEN` is
// written `own-token`. The API and the database only ever speak the former.
export function frontmatterCode(code: string): string {
  return code.toLowerCase().replace(/_/g, '-');
}

export interface TaxonomyFacets {
  categories: TaxonomyEntry[];
  tagGroups: TaxonomyTagGroup[];
}

// The sections and tags that have at least one item, in dictionary order —
// empty sections exist for the first integration that fills them and are not
// shown. A code the dictionary does not know (drift between releases, or no
// dictionary at all) still gets a pill, labelled by its code, after the known
// ones; unknown tags share one unlabelled group at the end.
export function presentFacets(
  taxonomy: TaxonomyResponse | undefined,
  items: Categorised[],
): TaxonomyFacets {
  const presentCategories = new Set(items.map(catalogCategory));
  const presentTags = new Set(items.flatMap(catalogTags));

  const categories = (taxonomy?.categories ?? []).filter((c) => presentCategories.has(c.code));
  for (const c of categories) presentCategories.delete(c.code);
  for (const code of presentCategories) categories.push({ code, label: code });

  const tagGroups: TaxonomyTagGroup[] = [];
  for (const group of taxonomy?.tagGroups ?? []) {
    const tags = group.tags.filter((t) => presentTags.has(t.code));
    if (tags.length === 0) continue;
    for (const t of tags) presentTags.delete(t.code);
    tagGroups.push({ ...group, tags });
  }
  if (presentTags.size > 0) {
    tagGroups.push({ code: '', label: '', tags: [...presentTags].map((code) => ({ code, label: code })) });
  }

  return { categories, tagGroups };
}
