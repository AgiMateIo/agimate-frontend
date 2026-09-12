// Catalog taxonomy (GET /control/manage/taxonomy/): the sections and the tag
// vocabulary of the skills catalog and the preset gallery.
//
// Labels live here and nowhere else — a skill or a preset carries codes, and
// the frontend does the lookup. They come in the installation's content
// language (English as the fallback), not the visitor's UI locale, so they are
// deliberately absent from the messages files. Array order is display order;
// there is no sort key to apply.

export interface TaxonomyEntry {
  // Dictionary code, uppercase with underscores (`OWN_TOKEN`). The SKILL.md
  // frontmatter form is lowercase with dashes — see `frontmatterCode()`.
  code: string;
  label: string;
}

// Groups exist for laying out the filter panel only: on a skill or a preset the
// tags are one flat list.
export interface TaxonomyTagGroup extends TaxonomyEntry {
  tags: TaxonomyEntry[];
}

export interface TaxonomyResponse {
  categories: TaxonomyEntry[];
  tagGroups: TaxonomyTagGroup[];
}
