import type {
  CatalogPresetResponse,
  CatalogSkillResponse,
  TaxonomyResponse,
} from '@/types';
import { getServerApiBaseUrl } from '@/utils/api-url';

// The anonymous catalog API, for the site's server-rendered pages. Not
// `httpClient`: that one is a browser transport (tokens, refresh, the
// interface locale), while here the language is the route's and nobody is
// signed in. Answers sit in the Data Cache for the backend's own max-age; the
// cache key includes the headers, so the two languages never mix.
const REVALIDATE_SECONDS = 300;

async function catalogGet<T>(path: string, locale: string): Promise<T | null> {
  const response = await fetch(`${getServerApiBaseUrl()}control/public/catalog/${path}`, {
    headers: { 'Accept-Language': locale, Accept: 'application/json' },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Catalog ${path} (${locale}): HTTP ${response.status}`);
  }
  const body = (await response.json()) as T | { response: T };
  return body && typeof body === 'object' && 'response' in body ? body.response : (body as T);
}

// A preset or skill code. Anything else never reaches the backend: `..` in a
// path segment would be resolved by the URL parser into another endpoint.
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

async function catalogList<T>(path: string, locale: string): Promise<T[]> {
  return (await catalogGet<T[]>(path, locale)) ?? [];
}

export function fetchCatalogPresets(locale: string): Promise<CatalogPresetResponse[]> {
  return catalogList('agent-presets/', locale);
}

export function fetchCatalogPreset(name: string, locale: string): Promise<CatalogPresetResponse | null> {
  if (!NAME_PATTERN.test(name)) return Promise.resolve(null);
  return catalogGet(`agent-presets/${encodeURIComponent(name)}`, locale);
}

export function fetchCatalogSkills(locale: string): Promise<CatalogSkillResponse[]> {
  return catalogList('skills/', locale);
}

export function fetchCatalogSkill(name: string, locale: string): Promise<CatalogSkillResponse | null> {
  if (!NAME_PATTERN.test(name)) return Promise.resolve(null);
  return catalogGet(`skills/${encodeURIComponent(name)}`, locale);
}

export async function fetchCatalogTaxonomy(locale: string): Promise<TaxonomyResponse> {
  return (await catalogGet<TaxonomyResponse>('taxonomy/', locale)) ?? { categories: [], tagGroups: [] };
}
