// A browser sign-in labels itself with its raw User-Agent, which is unreadable
// in a list ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) …"). This turns it
// into "Chrome · macOS" for the row title; the raw string stays available in the
// expanded details, since that is what the device actually said about itself.
//
// Order matters: Edge and Opera also claim Chrome, Chrome also claims Safari,
// and an iPhone also claims Mac OS X.
const BROWSERS: ReadonlyArray<readonly [RegExp, string]> = [
  [/Edg[A-Z]?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/YaBrowser/, 'Yandex Browser'],
  [/Firefox\/|FxiOS/, 'Firefox'],
  [/CriOS/, 'Chrome'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

const SYSTEMS: ReadonlyArray<readonly [RegExp, string]> = [
  [/Windows NT/, 'Windows'],
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Android/, 'Android'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
];

const firstMatch = (
  table: ReadonlyArray<readonly [RegExp, string]>,
  value: string,
): string | null => table.find(([pattern]) => pattern.test(value))?.[1] ?? null;

/**
 * "Chrome · macOS" from a User-Agent, or null when it is not recognisable —
 * the caller then falls back to a generic caption rather than showing the raw
 * string as a title.
 */
export function describeUserAgent(userAgent: string | null): string | null {
  if (!userAgent) return null;
  const browser = firstMatch(BROWSERS, userAgent);
  const system = firstMatch(SYSTEMS, userAgent);
  if (browser && system) return `${browser} · ${system}`;
  return browser ?? system;
}
