/**
 * ISO 3166-1 alpha-2 code → the name of the country in the requested language.
 *
 * One formatter per list, not per row: the dashboard shows 126 cards at once,
 * and constructing `Intl.DisplayNames` for each would be the expensive part.
 * Where `Intl` cannot build a formatter (or does not know the code), the code
 * itself is the answer — never an empty string.
 */
export function makeRegionLabel(locale: string): (code: string) => string {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    names = null;
  }
  return (code) => names?.of(code) ?? code;
}
