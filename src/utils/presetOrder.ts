/**
 * Editorial order for both preset surfaces: these lead, the rest keep the
 * backend's order. A code an installation hasn't seeded is a no-op.
 */
export const POPULAR_PRESETS = [
  'bitrix24',
  'alfa-bank',
  't-business',
  't-invest',
  'yandex-tracker',
  'yandex-mail',
  'yandex-calendar',
  'yandex-disk',
  'yandex-wiki',
  'yandex-telemost',
  'yandex-forms',
  'yandex-search',
  'yandex-cloud-docs',
  'yandex-data-catalog',
] as const;

const RANK = new Map<string, number>(POPULAR_PRESETS.map((code, index) => [code, index]));

export function presetsByPopularity<T extends { code: string }>(presets: T[]): T[] {
  return [...presets].sort(
    (a, b) => (RANK.get(a.code) ?? Number.MAX_SAFE_INTEGER) - (RANK.get(b.code) ?? Number.MAX_SAFE_INTEGER),
  );
}
