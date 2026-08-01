# AgiMate Frontend

Web dashboard for the AgiMate platform — create AI agents, give them skills and
connectors, wire them to channels, and watch them work in real time.

Built with Next.js 16 (App Router), React 19, TypeScript and Tailwind CSS v4.

## Features

- 🤖 **Agents** — CRUD, API keys, per-agent LLM roles, skill and connector bindings with allow/deny policies
- 🧩 **Skills** — private and public marketplace skills, agent assignment
- 🔌 **Connections** — connector instances with secret management and connection testing
- 🧠 **LLM Providers** — provider CRUD, model registry with capability metadata, quotas, extra-body overrides
- 👥 **Agentic Teams** — teams with kanban boards, drag-and-drop tasks and comments
- 💬 **Chat** — talk to an agent from the dashboard, with streaming answers and attachments
- 📡 **Real-time** — live board and chat updates over [Centrifugo](https://centrifugal.dev)
- 📊 **Observability** — tool-use logs, trigger logs, connector jobs, webhook deliveries
- 🌍 **i18n** — Russian and English, locale-prefixed routing via `next-intl`
- 🔐 **OAuth2** — JWT access tokens with automatic refresh and replay protection

## Requirements

- **Node.js 24+** and **pnpm** (the version is pinned in `packageManager`)
- A running **AgiMate API gateway** — this is a client for the backend and does
  not work standalone. See [AgiMateIo/backend](https://github.com/AgiMateIo/backend).

## Quick Start

```bash
git clone https://github.com/AgiMateIo/frontend.git agimate-frontend
cd agimate-frontend

corepack enable
pnpm install

cp .env.example .env.local   # point NEXT_PUBLIC_API_BASE_URL at your gateway
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to
`/ru/login` (or `/en/login`) — sign in through the OAuth2 provider configured on
your backend.

## Configuration

The API base URL is resolved at runtime by `getApiBaseUrl()` in
[`src/utils/api-url.ts`](src/utils/api-url.ts):

| Environment | Base URL |
| --- | --- |
| Production / staging | Derived from the current hostname → `https://api.<domain>/` (a leading `www.` is stripped, a non-standard port is preserved) |
| `localhost` / SSR | `NEXT_PUBLIC_API_BASE_URL`, falling back to `http://api.agimate.lc:8000/` |

So a deployed instance needs no build-time configuration — only local
development does. See [`.env.example`](.env.example).

### MCP OAuth connections

MCP servers that authenticate with OAuth (Notion, Linear, Atlassian, Sentry…)
identify this app by fetching
[`/connections/oauth/client.json`](src/app/connections/oauth/client.json/route.ts)
from their own servers. The two addresses in that document are read from the
environment at runtime and **must equal the backend's
`APP_CONNECTORS_MCP_OAUTH_*` settings byte for byte** — a trailing slash or a
`www.` on only one side is `invalid_client`:

| Variable | Value |
| --- | --- |
| `APP_CONNECTORS_MCP_OAUTH_CLIENT_ID` | `https://<frontend>/connections/oauth/client.json` — the address the document is served from, and the client identity |
| `APP_CONNECTORS_MCP_OAUTH_REDIRECT_URI` | `https://<frontend>/connections/oauth/callback` |

Both live on the same public origin as the frontend: the consent screen shows
the app name from the document next to the host of the return address, and two
different hosts read as two unrelated applications. Unset, the document answers
`503` rather than serving plausible-looking wrong addresses. Local development
needs neither variable — the handshake requires a public HTTPS origin anyway.

## Scripts

```bash
pnpm dev             # dev server on http://localhost:3000
pnpm build           # production bundle (standalone output)
pnpm start           # serve the production build
pnpm lint            # ESLint
pnpm typecheck       # tsc --noEmit
pnpm check:i18n      # en/ru message key parity + namespace collision check
```

## Architecture

```
src/
├── app/[locale]/         # locale-prefixed routes: dashboard, auth, landing pages
├── components/           # feature components + ui/ design-system primitives
├── queries/              # TanStack Query: key factories, options, hooks, cache actions
├── services/             # api.ts facade + httpClient.ts transport + modules/ per domain
├── realtime/             # shared Centrifugo connection and subscription hooks
├── contexts/             # UserContext, BreadcrumbContext, QueryProvider
├── types/                # one file per backend domain
└── i18n/                 # next-intl routing and request config
```

Key conventions:

- **Data fetching** goes through TanStack Query. Pages use an
  `ErrorBoundary` + `Suspense` shell with suspense queries; mutations invalidate
  through each domain's cache actions. Never fetch with `useEffect` + `apiService`.
- **API calls** go through the `apiService` singleton, a flat facade over the
  per-domain modules in `src/services/modules/`. It injects the bearer token,
  refreshes it on 401/403 with a single de-duplicated refresh, unwraps
  `{response: …}` payloads and throws `ApiError`.
- **Navigation** uses the locale-aware helpers from `@/i18n/navigation`, not
  `next/navigation`.
- **Translations** live in `messages/{locale}.json` (landing + auth + shared)
  and `messages/dashboard/{locale}.json`, merged at runtime. `pnpm check:i18n`
  enforces key parity between locales.

More detail — including the backend endpoint map and the OAuth2 token flow —
lives in [`.claude/CLAUDE.md`](.claude/CLAUDE.md).

## Docker

The [`Dockerfile`](Dockerfile) builds a multi-stage image around Next.js
`output: 'standalone'`:

```bash
docker build -t agimate-frontend .
docker run -p 3000:3000 agimate-frontend
```

## Related Projects

- [desktop](https://github.com/AgiMateIo/desktop) — cross-platform system tray agent
- [android](https://github.com/AgiMateIo/android) — Android companion agent
- [n8n-nodes-agimate](https://github.com/AgiMateIo/n8n-nodes-agimate) — n8n community nodes

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
Every PR must pass `pnpm typecheck`, `pnpm lint` and `pnpm check:i18n`.

## License

[Apache License 2.0](LICENSE) © AgiMate
