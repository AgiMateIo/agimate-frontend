// Prefixes that name a role of the host rather than the service behind it.
const ROLE_LABELS = new Set(['www', 'mcp', 'api', 'app']);

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * A connection name read off a server address: `https://mcp.notion.com/mcp` →
 * `Notion`. The same host label the backend builds the connection's code from
 * (`FullCodes.mainHostLabel`), so the name and the tool prefix agree.
 * `null` while the value isn't an address yet.
 */
export function connectionNameFromUrl(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  let host: string;
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`).hostname;
  } catch {
    return null;
  }
  if (!host) return null;
  // `localhost`, an IP or `[::1]` has no service name in it — the host is the name.
  if (!host.includes('.') || IPV4.test(host) || host.startsWith('[')) return host;

  const labels = host.split('.');
  const end = labels.length - 1; // drop the TLD
  let start = 0;
  while (start < end && ROLE_LABELS.has(labels[start])) start++;
  const label = labels[Math.max(start, end - 1)];
  return label.charAt(0).toUpperCase() + label.slice(1);
}
