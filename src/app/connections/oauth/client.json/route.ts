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
 */

// Read the environment per request: the standalone server is built once and
// deployed to several domains.
export const dynamic = 'force-dynamic';

const CLIENT_NAME = 'AgiMate';

export async function GET() {
  const clientId = process.env.APP_CONNECTORS_MCP_OAUTH_CLIENT_ID;
  const redirectUri = process.env.APP_CONNECTORS_MCP_OAUTH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    // Serving a plausible-looking document with wrong addresses would fail far
    // later, inside the provider, with `invalid_client` and no trace here.
    return Response.json(
      {
        error: {
          message:
            'MCP OAuth is not configured: set APP_CONNECTORS_MCP_OAUTH_CLIENT_ID and ' +
            'APP_CONNECTORS_MCP_OAUTH_REDIRECT_URI to the same values as the backend.',
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
