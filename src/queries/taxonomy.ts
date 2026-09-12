import { useMemo } from 'react';
import { queryOptions, useQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import type { TaxonomyResponse } from '@/types';

export const taxonomyKeys = {
  all: ['taxonomy'] as const,
};

// Read-only reference data, stable between releases — cached for the session
// like the connector catalog.
export const taxonomyOptions = () =>
  queryOptions({
    queryKey: taxonomyKeys.all,
    queryFn: () => apiService.getTaxonomy(),
    staleTime: Infinity,
  });

// Non-suspense on purpose: the dictionary decorates a list, it never gates
// one. Without it the catalog still renders, with codes for labels.
export function useTaxonomyQuery() {
  return useQuery(taxonomyOptions());
}

export interface TaxonomyLabels {
  taxonomy: TaxonomyResponse | undefined;
  categoryLabel: (code: string) => string;
  tagLabel: (code: string) => string;
}

// Code → label, falling back to the code itself while the dictionary is
// loading, failed, or simply does not know the code.
export function useTaxonomyLabels(): TaxonomyLabels {
  const { data: taxonomy } = useTaxonomyQuery();
  return useMemo(() => {
    const categories = new Map((taxonomy?.categories ?? []).map((c) => [c.code, c.label]));
    const tags = new Map(
      (taxonomy?.tagGroups ?? []).flatMap((g) => g.tags.map((t) => [t.code, t.label] as const)),
    );
    return {
      taxonomy,
      categoryLabel: (code) => categories.get(code) ?? code,
      tagLabel: (code) => tags.get(code) ?? code,
    };
  }, [taxonomy]);
}
