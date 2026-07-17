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

// Resolves a signed file link (webchat attachment `part.url`) to an absolute
// URL. `part.url` is relative to the control context path, e.g.
// "/files/agf_…?exp=…&sig=…" → "<gateway>/control/files/agf_…?exp=…&sig=…".
// Auth is baked into exp+sig, so the result is usable directly in <img src>.
export function resolveControlFileUrl(relativeUrl: string): string {
  return `${getApiBaseUrl()}${API.ENDPOINTS.CONTROL_API}${relativeUrl}`;
}
