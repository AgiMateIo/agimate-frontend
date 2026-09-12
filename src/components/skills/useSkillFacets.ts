import { useMemo } from 'react';
import { useSkillPickerQuery, type SkillPickerSource } from '@/queries/skills';
import { useTaxonomyQuery } from '@/queries/taxonomy';
import { presentFacets } from '@/utils/taxonomy';

// Which sections and tags the skill filters offer: those with at least one
// skill in the chosen source, read off the unfiltered, unsearched set. That
// set, not the one on screen, so the rows stay put while someone types — a
// search that matches nothing in a section shows the empty state there rather
// than making the section vanish. With no search and no filter it is the very
// query the list renders, so the "all" view costs nothing extra.
export function useSkillFacets(source: SkillPickerSource) {
  const { data: taxonomy } = useTaxonomyQuery();
  const { skills } = useSkillPickerQuery(source, '');
  return useMemo(() => presentFacets(taxonomy, skills), [taxonomy, skills]);
}
