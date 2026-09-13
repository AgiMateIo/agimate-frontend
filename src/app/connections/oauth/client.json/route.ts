/**
 * OAuth client metadata for MCP servers that speak OAuth (Notion, Linear,
 * Atlassian, Sentry…). There is no registration step: the provider is handed
 * an HTTPS `client_id`, fetches this document from it, and takes the app name
 * for the consent screen plus the allowed return addresses from here.
 *
 * Deliberately outside `[locale]`: the fetch comes from the provider's own
 * servers, with no cookies, no `Accept-Language` and no interest in our route
 * layout. The middleware matcher already skips paths containing a dot, so no
 * locale prefix is ever added to this one.
 *
 * Every value is configuration, not derived from the request — `client_id` has
 * to match the address this file is served from byte for byte, and both it and
 * the redirect URI have to match the backend's `APP_CONNECTORS_MCP_OAUTH_*`
 * settings. A trailing slash or a `www.` that only one side has reads to the
 * provider as `invalid_client`, so guessing from `Host` is not an option.
 *
 * The paths are fixed by the route layout, so the origin alone is enough:
 * `APP_PUBLIC_ORIGIN` (default `https://agimate.io`) yields both addresses,
 * and an explicit `APP_CONNECTORS_MCP_OAUTH_*` still wins over what it derives.
 * Any other domain must set it: the default would hand the provider the main
 * installation's addresses.
 */

// Read the environment per request: the standalone server is built once and
// deployed to several domains.
export const dynamic = 'force-dynamic';

const CLIENT_NAME = 'AgiMate';

const DEFAULT_PUBLIC_ORIGIN = 'https://agimate.io';

const CLIENT_ID_PATH = '/connections/oauth/client.json';
const REDIRECT_PATH = '/connections/oauth/callback';

// `new URL().origin` drops a trailing slash and any path pasted along with the
// origin, the likeliest typos. Unparseable reads as unset rather than falling
// back to the default: a 503 with the message below beats a 500 on every
// provider fetch, and beats silently serving another domain's addresses.
function publicOrigin(): string | undefined {
  const raw = process.env.APP_PUBLIC_ORIGIN || DEFAULT_PUBLIC_ORIGIN;
  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
}

export async function GET() {
  const origin = publicOrigin();
  const clientId =
    process.env.APP_CONNECTORS_MCP_OAUTH_CLIENT_ID || (origin && `${origin}${CLIENT_ID_PATH}`);
  const redirectUri =
    process.env.APP_CONNECTORS_MCP_OAUTH_REDIRECT_URI || (origin && `${origin}${REDIRECT_PATH}`);

  if (!clientId || !redirectUri) {
    // Serving a plausible-looking document with wrong addresses would fail far
    // later, inside the provider, with `invalid_client` and no trace here.
    return Response.json(
      {
        error: {
          message:
            'MCP OAuth is not configured: set APP_PUBLIC_ORIGIN (or ' +
            'APP_CONNECTORS_MCP_OAUTH_CLIENT_ID and APP_CONNECTORS_MCP_OAUTH_REDIRECT_URI) ' +
            'so the addresses equal the backend settings.',
        },
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return Response.json(
    {
      client_id: clientId,
      client_name: CLIENT_NAME,
      client_uri: new URL(clientId).origin,
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      // Public client: there is no secret to authenticate the token request
      // with, the document itself is the identity.
      token_endpoint_auth_method: 'none',
    },
    {
      headers: {
        'Content-Type': 'application/json',
        // Providers cache by HTTP headers; short and explicit, so a change to
        // `redirect_uris` propagates in minutes rather than whenever a proxy
        // feels like it.
        'Cache-Control': 'public, max-age=300',
      },
    },
  );
}
