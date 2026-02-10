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
