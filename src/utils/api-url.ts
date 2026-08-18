import { API } from '@/config/constants';

const DEV_FALLBACK = 'http://api.agimate.lc:8000/';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const env = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (env) return env.endsWith('/') ? env : `${env}/`;
      return DEV_FALLBACK;
    }
    const domain = hostname.replace(/^www\./, '');
    const { port, protocol } = window.location;
    const portSuffix = port && port !== '80' && port !== '443' ? `:${port}` : '';
    return `${protocol}//api.${domain}${portSuffix}/`;
  }
  // SSR fallback
  const env = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (env) return env.endsWith('/') ? env : `${env}/`;
  return DEV_FALLBACK;
}

// Resolves a signed file link — a listing row's `url`, a webchat attachment's
// `part.url`, an upload response — to something usable in <img src>/<a href>.
//
// The backend returns one of two shapes, per file and unpredictably from here:
// an absolute storage link ("https://s3…/…?X-Amz-Signature=…", used verbatim)
// or a path relative to the control context path ("/files/agf_…?exp=…&sig=…" →
// "<gateway>/control/files/agf_…?exp=…&sig=…", the fallback whenever presigning
// is off or unavailable). Auth is inside the URL either way — SigV4 there,
// exp+sig here — so no headers, and no way to cache it past its ~15 min TTL.
//
// Frontend-local links (a blob: preview of a fresh upload) pass through for the
// same reason. The pass-through is an allowlist rather than "has a scheme":
// the result is fed to <a href>, where a javascript:/data: URL would run on
// click, so an unexpected scheme is prefixed into an inert link instead.
export function resolveControlFileUrl(url: string): string {
  return /^(blob:|https?:)/i.test(url)
    ? url
    : `${getApiBaseUrl()}${API.ENDPOINTS.CONTROL_API}${url}`;
}
