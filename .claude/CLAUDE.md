# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Frontend for the Agimate application: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, and next-intl 4 for i18n. It implements OAuth2 authentication with JWT token-based authorization and talks to a Spring Boot microservices backend through an API gateway. The dashboard manages AI **agents**, **skills**, **apps**, **channels**, **agentic teams** (with kanban **boards**), **connections**, and **LLM providers**, plus real-time updates over Centrifugo.

## Development Commands

The project uses **pnpm** (see `packageManager` in package.json; Dockerfile and CI install with `pnpm install --frozen-lockfile`).

```bash
pnpm dev             # Start Next.js dev server on http://localhost:3000
pnpm build           # Build production bundle
pnpm start           # Start production server
pnpm lint            # Run ESLint
pnpm typecheck       # tsc --noEmit
pnpm check:i18n      # en/ru message key parity + namespace-collision check
```

CI (`.github/workflows/build-deploy.yml`) runs typecheck + lint + check:i18n as a `quality` job before the Docker build; a push to `main` deploys.

## Environment Configuration

The API base URL is computed at runtime by `getApiBaseUrl()` in `src/utils/api-url.ts`:
- **Production/staging**: derived from the current hostname → `https://api.<domain>/` (strips a leading `www.`, preserves a non-standard port).
- **localhost / SSR**: uses `NEXT_PUBLIC_API_BASE_URL` if set, else falls back to `http://api.agimate.lc:8000/`.

So for local dev against a custom gateway, set in `.env.local`:
```bash
NEXT_PUBLIC_API_BASE_URL=http://api.agimate.lc:8000/
```
The `NEXT_PUBLIC_` prefix exposes the variable to client-side code. There is no `.env.example` checked in.

The base URL points to the API gateway root; service-specific prefixes are added in code (see below).

## Backend Services Architecture

The frontend reaches the backend through the API gateway using two service prefixes, defined in `API.ENDPOINTS` (`src/config/constants.ts`):

- **`user/`** (`USER_API`) — OAuth2 auth and user info.
- **`control/`** (`CONTROL_API`) — everything else: agents, skills, apps, channels, agentic teams, boards, connections, LLM providers, the connector catalog, tool/trigger/webhook logs, and the Centrifugo token.

> The `control-api` service was previously named `device-api` (URL prefix `/device` → `/control`). Domain terms that legitimately mean "device" stay: the `deviceId` payload field and the Centrifugo `device:{deviceId}` namespace are unrelated to the service name.

### User API (`user/`)
- **OAuth2**: `POST /oauth2/refresh`, `POST /oauth2/logout`
- **User**: `GET /user/me`

### Control API (`control/`)
All paths below are under `control/manage/…` unless noted. Representative groups:
- **Agents**: CRUD `/agents/`, key regen, connector bindings `/agents/{id}/connections/` (the gate for connector access; default-allow) with per-binding policies `/agent-connections/{id}/policies/` (TOOL/TRIGGER allow/deny refinements), skill bindings `/agents/{id}/skills/`, per-agent LLMs `/agents/{id}/llms/` (keyed by `purpose` — `PUT`/`DELETE …/llms/{PURPOSE}` in uppercase, one model per role, a zero-binding agent gets a read-only synthetic `source: PLATFORM` row; an unbound purpose resolves through the CHAT provider's `purposePriority` and then the platform provider's — nothing is guessed by capability, and a dead end makes the tool call fail with a message the user reads in the chat)
- **Skills**: CRUD `/skills/`, public marketplace `/skills/public/`, a skill's agents `/skills/{id}/agents/`
- **Apps**: CRUD `/apps/`, key regen
- **Channels**: CRUD `/channels/`, sessions and session messages
- **Agentic Teams**: CRUD `/agentic-teams/`
- **Boards**: `/boards/`, tasks `/boards/{id}/tasks/`, task status, task comments
- **Connections** (connector instances): `/connections/…` incl. secret update and test
- **LLM Providers**: CRUD `/llm-providers/`, `purposePriority` on create/patch/response (uppercase-purpose → ordered model allow-list; key absent = fall through to the platform provider, `[]` = purpose switched off, PATCH replaces the whole map — there is no `defaultModel` any more), refresh models (upsert into the model registry), model registry `/llm-providers/{id}/models/` (rows persist with `AVAILABLE`/`UNAVAILABLE` status — still saveable as a binding, but UNAVAILABLE is skipped inside a purpose list and fails an agent's explicit binding; capability fields `inputModalities`/`outputModalities`/`supportedParameters`/`maxOutputTokens` come from the provider verbatim — compare case-insensitively, `null` = unknown, not "can't"), per-model extra-body `PUT /llm-providers/{id}/models/extra-body` (`model` in the body); provider-level `extraBody` on create/patch/response (≤16 KB JSON object, deep-merged with model-level by the backend, no secrets)
- **Connector catalog** (read-only): `/connectors/`, `/connectors/{code}`
- **Logs**: tool-use logs, connector jobs (pause/resume/run-now/delete), trigger logs, webhook delivery logs
- **Webchat** (dashboard chat with agents): sessions `/webchat/sessions` (POST creates, GET lists, DELETE soft-closes), newest-first paged history + send `/webchat/sessions/{id}/messages`, per-session Centrifugo tokens `POST /webchat/sessions/{id}/token`; agent replies arrive as `webchat_message` events (streams: progress/answer/error, at-least-once — dedupe by `messageId`)
- **Centrifugo**: `POST /control/manage/centrifugo/token`

## OAuth2 Authentication Architecture

Sophisticated OAuth2 flow with JWT tokens and automatic refresh.

### Token Management
- **Access Token**: JWT in `sessionStorage`, ~24h, used for API authorization
- **Refresh Token**: JWT in an HTTP-only cookie (browser-managed), ~7 days
- **Refresh Token ID**: identifier in `localStorage`, prevents token replay

### Authentication Flow
1. `/login` sends the user to backend `/oauth2/authorization/{provider}?redirect_to=<login_check_url>`
2. After provider auth, backend redirects to `/login-check#rti-<refreshTokenId>`
3. `/login-check` extracts the refresh token ID from the URL fragment and calls `/oauth2/refresh`
4. Backend validates the refresh-token cookie + ID, returns a new access token and refresh token ID
5. Tokens stored locally, user redirected to the dashboard

The two pages are split on purpose: `/login` only offers the providers, `/login-check` owns the callback. Nothing on `/login` reads the fragment, so a backend that ignores `redirect_to` and lands the user on `/login#rti-…` produces a dead page with no request in the network tab — check the callback-side `redirect_to` allowlist before suspecting the frontend.

### Multi-Domain OAuth2 Redirect
The backend supports OAuth2 login from multiple frontend domains. The frontend appends `?redirect_to=<encoded_login_check_url>` so the backend knows where to redirect back. `redirect_to` is computed client-side from `window.location.origin + '/login-check'` (via `useSyncExternalStore` to avoid SSR hydration mismatches). The path is hardcoded to `/login-check` without a locale prefix — the next-intl middleware adds the locale on redirect.

### Token Storage Security
- **Access tokens**: `sessionStorage` (cleared on tab close)
- **Refresh token ID**: `localStorage` (persists; identifier only)
- **Refresh token**: HTTP-only cookie (inaccessible to JS — XSS-safe)

Never store the actual refresh token in JavaScript-accessible storage.

## API Service (`src/services/`)

`apiService` (default export of `src/services/api.ts`) is a singleton exposing all backend calls behind a **flat facade**. `api.ts` only composes per-domain modules from `src/services/modules/` (`agents`, `apps`, `skills`, `llmProviders`, `channels`, `boards`, `connections`, `connectors`, `agenticTeams`, `logs`, `misc`, `webchat`) over the shared transport core in `src/services/httpClient.ts`. Consumers call `apiService.getAgent(...)` etc. and never touch the modules directly. When adding an endpoint, put the method in the matching domain module (or add a new module and spread it into the facade in `api.ts`).

`httpClient.ts` owns the transport: `get/post/put/patch/delete`, the token-refresh flow, in-flight GET dedup, response unwrapping, `buildPagedQuery`, and the `ApiError` class (re-exported from `@/services/api`).

**Key features**:
- Automatic Bearer token injection for authenticated requests
- Automatic token refresh on 401/403 with request retry, deduplicating concurrent refreshes
- Nested response unwrapping (backend wraps payloads in `{response: {...}}`)
- Error handling via the `ApiError` class, extracting backend error messages
- `buildPagedQuery(filters, params)` builds paged query strings (defaults `page=0`, `size=20`)

```typescript
import apiService from '@/services/api';

const user = await apiService.getUserInfo();
const { content } = await apiService.getAgentsList({ search });
await apiService.createSkill({ ... });
const token = await apiService.getCentrifugoToken();
```

User type lives in `src/services/types.ts`.

## Real-time (Centrifugo)

`src/realtime/centrifugoClient.ts` holds a singleton `Centrifuge` connection, fetching/caching a JWT via `apiService.getCentrifugoToken()` and refreshing before expiry. `src/realtime/useBoardSubscription.ts` subscribes React components to board channels for live task updates; `src/realtime/useWebchatSubscription.ts` subscribes to per-session `webchat:{sessionId}` channels (per-session tokens via `apiService.getWebchatSessionToken`) over the same shared connection. The `device:{deviceId}` namespace is used for push to physical devices.

## Contexts

- **`UserContext`** (`src/contexts/UserContext.tsx`): global auth state — auto-fetches the user on mount when a refresh token ID exists, deduplicates fetches, exposes `{ user, loading, error, fetchUser, logout }`.
- **`BreadcrumbContext`** (`src/contexts/BreadcrumbContext.tsx`): lets pages override breadcrumb labels for dynamic route segments via `useSetBreadcrumb(segment, label)` / `useBreadcrumbOverrides()`.

```typescript
import { useUser } from '@/contexts/UserContext';
const { user, loading, error, fetchUser, logout } = useUser();
```

## Internationalization (i18n)

Routing is **locale-prefixed** (`localePrefix: 'always'`). Locales: `ru` (default) and `en` — see `src/i18n/routing.ts`. The middleware (`src/middleware.ts`) is `next-intl`'s `createMiddleware(routing)`.

Translation files are split into two layers, merged at runtime in `src/i18n/request.ts` (base + dashboard):
```
messages/
├── en.json / ru.json            # Landing + auth + shared:
│                                 #   Metadata, HomePage, Login, LoginCheck, Logout,
│                                 #   Common, LocaleSwitcher, N8nPage, DesktopPage, AndroidPage
└── dashboard/
    └── en.json / ru.json         # Dashboard namespaces:
                                   #   Sidebar, TopBar, DashboardHome, ApiKeys,
                                   #   ConnectorCatalog, Connectors, Agents, LlmProviders,
                                   #   AgenticTeams, Connections, ConnectionDetail, Board,
                                   #   Skills, SkillConnectors, SkillAgents, Settings, Channels, Chat
```
When adding keys: landing/auth → `messages/{locale}.json`; dashboard → `messages/dashboard/{locale}.json`. Shared UI strings (`cancel`, `save`, `delete`, `edit`, `close`, …) live in the base **`Common`** namespace, which is merged into the dashboard bundle too — use `useTranslations('Common')` for them instead of re-defining per dashboard namespace.

## Code Architecture

### Directory Structure
```
src/
├── app/
│   └── [locale]/                  # Locale-prefixed routes (next-intl)
│       ├── dashboard/
│       │   ├── page.tsx           # home: overview / work mode (see Dashboard Home)
│       │   ├── agents/            # list, create, [id], [id]/edit, [id]/chat, deliveries
│       │   ├── agentic-teams/     # list, [id], [id]/agents, [id]/board
│       │   ├── apps/              # list, [id]
│       │   ├── channels/
│       │   ├── connectors/        # connector catalog
│       │   ├── connections/       # list, [id]
│       │   ├── connector-jobs/
│       │   ├── llm-providers/
│       │   ├── skills/            # list, create, [id], [id]/edit
│       │   ├── tool-use-logs/     # accepts ?status= / ?access= to seed filters
│       │   ├── trigger-logs/
│       │   └── settings/
│       ├── login/  login-check/  logout/
│       └── n8n/  desktop/  android/   # landing pages
├── components/
│   ├── agents/  agentic-teams/  boards/  channels/  connectors/
│   ├── connections/  dashboard/  llm-providers/  skills/  webchat/
│   ├── landing/  layout/
│   └── ui/                        # Alert, Button, FormField (+ Select), Modal, ConfirmDeleteModal,
│                                  #   Toggle, Tabs, Chip, RowAction, Pagination, RefreshControls,
│                                  #   SearchToolbar, FilterPill,
│                                  #   ErrorAlert, ErrorBoundary, LocaleSwitcher
├── config/constants.ts            # UI, API.ENDPOINTS
├── contexts/                      # UserContext, BreadcrumbContext, QueryProvider
├── hooks/                         # useAsyncForm, useClipboard, useDebouncedValue
├── i18n/                          # routing.ts, request.ts
├── queries/                       # React Query per domain: key factories, queryOptions,
│                                  #   useXQuery hooks, mutations, cache actions
├── realtime/                      # centrifugoClient.ts, useBoardSubscription.ts
├── services/                      # api.ts (facade) + httpClient.ts + modules/, types.ts (User)
├── types/                         # one file per domain (agents, skills, apps, channels,
│                                  #   boards, agentic-teams, connections, llm-providers,
│                                  #   agent-connections, agent-skills, connector-jobs, webhooks,
│                                  #   centrifugo, tool-use-logs, connectors via skills.ts) + index.ts
├── utils/                         # date, error, clipboard, api-url, avatar, animateCardMove
└── middleware.ts
```
Note: keep this tree approximate — verify against `src/` before relying on a specific path.

### Path Aliases
`@/*` maps to `src/*`. Example: `import apiService from '@/services/api'`.

### Styling
Tailwind CSS v4 with `@tailwindcss/postcss`; inline `@theme` config in `globals.css`; CSS variables (`--background`, `--foreground`); dark mode via `prefers-color-scheme`; Geist font.

### Client Components
Any component using hooks, browser APIs (`window`, storage), or event handlers needs the `'use client'` directive. Server components (default) cannot use client-side features.

## Important Implementation Details

### Server-Side Rendering
Always guard storage access:
```typescript
const token = typeof window !== 'undefined' ? sessionStorage.getItem('key') : null;
```

### Hydration and Mounting
For components that render differently on server vs client:
```typescript
const [isMounted, setIsMounted] = useState(false);
useEffect(() => setIsMounted(true), []);
if (!isMounted) return null;
```

### Backend API Contract
- Successful responses may be wrapped in `{response: {...}}`
- Errors contain `{error: {message: string}}`
- The API service unwraps both automatically and throws `ApiError`

## TypeScript Configuration
Target ES2017, strict mode, `react-jsx` (no React import needed), bundler module resolution.

## Common Patterns

### Protected Routes
```typescript
const { user, loading } = useUser();
if (loading) return <div>Loading...</div>;
if (!user) redirect('/login');
```

### API Error Handling
```typescript
try {
  const data = await apiService.get('/endpoint');
} catch (error) {
  console.error(error.message); // extracted from backend response
}
```

### Navigation
Routing is locale-prefixed, so use the **locale-aware** helpers from `@/i18n/navigation` (`Link`, `useRouter`, `redirect`, `usePathname`, `getPathname`) instead of `next/navigation` — they add/strip the locale prefix automatically. `next/navigation` is still fine for things `@/i18n/navigation` doesn't re-export (`useSearchParams`, `useParams`).
```typescript
import { Link, useRouter } from '@/i18n/navigation';
```

### Data Fetching (React Query)
All server data goes through **TanStack React Query** (`QueryProvider` in `src/contexts/QueryProvider.tsx`, wired in the locale layout). Per-domain modules in `src/queries/` own key factories, `queryOptions` builders, hooks, and cache actions:

```typescript
// list pages (inside <ErrorBoundary> + <Suspense>):
const { data } = useConnectionsQuery();               // useSuspenseQuery under the hood

// parallel suspense queries — use useSuspenseQueries with exported options:
const [{ data: a }, { data: b }] = useSuspenseQueries({
  queries: [integrationPlatformsOptions(), connectionsListOptions()],
});

// detail pages: same ErrorBoundary + Suspense shell as lists, via a suspense
// detail hook. A non-suspense useQuery variant remains only for edit pages that
// seed form state from the data:
const { data: agent } = useAgentDetailSuspenseQuery(agentId);

// after mutations: invalidate or patch the cache via the domain's cache actions
const { invalidateLists } = useConnectionCacheActions();
```

Conventions: keys come only from the domain's key factory; **every page uses the `ErrorBoundary` + `Suspense` shell** with suspense queries (list and detail alike); two `useSuspenseQuery` calls in one component run **serially** — use `useSuspenseQueries` for parallel fetches. **Mutations**: create/edit/delete forms use `useAsyncForm` + `apiService.*` and invalidate via the domain's cache actions in `onSuccess`; reserve a `useMutation` hook in the query module for optimistic updates with rollback (`queryClient.setQueryData`/`setQueriesData` then restore — see `useUpdateConnectionMutation`, `useChangeTaskStatusMutation`). **Never fetch server data with `useEffect` + `apiService` in a component** — it bypasses the cache (some older `*Tab` components and nothing else should; migrate them when touched). Paged auto-refresh tabs (logs/jobs/deliveries) use `usePagedLogsQuery` from `src/queries/logs.ts` (page/pageSize state + `refetchInterval` + `keepPreviousData`), paired with `RefreshControls` and `Pagination`.

## Reusable UI Components (`src/components/ui/`)

`Modal`, `ConfirmDeleteModal`, `Button`, `FormField` (+ `Input`, `TextArea`, `Select`), `Alert`, `Toggle`, `Tabs`, `Chip`, `RowAction`, `Pagination`, `RefreshControls`, `SearchToolbar`, `FilterPill` (+ `FilterRow`), `ErrorAlert`, `ErrorBoundary`, `LocaleSwitcher`.

`SearchToolbar` is the single search field (magnifier icon, md/lg pages vs sm modals) — never hand-roll that input; pass `filters` (rows of `FilterPill`/`FilterRow`) to get the funnel toggle that collapses them, with `filtersActive` highlighting the funnel while collapsed filters are in effect (aria-label comes from `Common.filters`).

`Select` is the single dropdown primitive (native `<select>` sharing `Input`'s styling — never hand-roll that className); `Chip` is the metadata pill (with a `tone`); `RowAction` is the compact outline icon+label action that sits inline with a field (rotate key, refresh, edit).

`ConfirmDeleteModal` is the shared confirm/delete dialog (title, labels, async `onConfirm`, body via children) — use it instead of hand-rolling a Modal + form + buttons. `Pagination` and `RefreshControls` back the paged log/job tabs (via `usePagedLogsQuery`).

```typescript
<Modal isOpen={isOpen} onClose={close} title="Title" size="md" showCloseButton>
  ...
</Modal>

<Button variant="primary" loading={isLoading} onClick={handleClick}>Click</Button>
// variant: 'primary' | 'secondary' | 'danger' | 'warning'

<FormField label="Name" required error={errors.name} hint="...">
  <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
</FormField>

<Alert variant="error|warning|success|info">Message</Alert>
<Toggle checked={enabled} onChange={setEnabled} label="Enable" />
```

## Custom Hooks (`src/hooks/`)

### useAsyncForm
Form submission with loading/error state:
```typescript
const { loading, error, handleSubmit, setError, clearError } = useAsyncForm({
  onSuccess: () => { /* close modal, refresh */ },
  defaultError: 'Failed to save changes',
});
const onSubmit = (e) => handleSubmit(e, async () => { await apiService.createSkill(data); });
```

### useClipboard
```typescript
const { copied, copy } = useClipboard({ timeout: 2000 });
<Button onClick={() => copy(key)}>{copied ? 'Copied!' : 'Copy'}</Button>
```

### useDebouncedValue
Debounces a value (e.g. search inputs) before it enters a React Query key.

## Utilities (`src/utils/`)

- **`date.ts`** — `parseBackendDate`, `formatDate`, `formatDateTimeFull`, `formatDateTimeShort` (backend format `yyyy-MM-dd HH:mm:ss`)
- **`error.ts`** — `getErrorMessage(error, fallback)` (message from an unknown thrown value)
- **`clipboard.ts`** — `copyToClipboard(text)` with fallback
- **`api-url.ts`** — `getApiBaseUrl()` (hostname-derived base URL)
- **`avatar.ts`** — `getAgentAvatarUrl(name)`
- **`animateCardMove.ts`** — board card move animation

## Configuration Constants (`src/config/constants.ts`)

```typescript
import { UI, API } from '@/config/constants';
```
- **`UI`**: `DATE_FORMAT_OPTIONS`
- **`API`**: `ENDPOINTS` (`USER_API: 'user'`, `CONTROL_API: 'control'`)

Component-level limits (name/description `maxLength`, clipboard timeout) are inlined at their call sites, not centralized.

## Type Organization

Types live in `src/types/`, one file per domain (`agents`, `skills`, `apps`, `channels`, `boards`, `agentic-teams`, `connections`, `llm-providers`, `agent-connections`, `agent-skills`, `connector-jobs`, `webhooks`, `centrifugo`, `tool-use-logs`, …), re-exported from `index.ts`.
```typescript
import { AgentResponse, SkillResponse } from '@/types';        // from root
import type { AgentResponse } from '@/types/agents';           // or domain file
```

## Modal Patterns

- **Add modals**: validated form; one-time secret display (agent/app/skill keys) with copy button and a "save it now, shown once" warning; block close during the API call.
- **Edit modals**: pre-filled, partial-update, loading state.
- **Delete modals**: use the shared `ConfirmDeleteModal` (`ui/`) — pass title, labels, an async `onConfirm`, and the confirm text + warning `Alert` as children; it owns the form, `useAsyncForm`, error display, and the cancel/danger buttons.

All modals close on backdrop/X, prevent interaction during async ops, and follow the design system.

## Dashboard Home

`src/app/[locale]/dashboard/page.tsx` renders one of two modes from `src/components/dashboard/`:

- **overview** — greeting, first-run checklist, free-tier ring, resource counters, quick actions.
- **pro** (work) — attention panel, tool-call feed, upcoming connector runs, recent chats, token spend, with one `RefreshControls` driving every block's `refetchInterval`.

The mode lives in `viewMode.ts` (`localStorage` + `useSyncExternalStore`, same shape as the sidebar collapse flag); `?view=pro|overview` overrides the stored value and is rewritten on switch. Data comes from `src/queries/dashboard.ts` — counters reuse each domain's own list options (shared cache, no extra requests), and it is deliberately **non-suspense**: one failing list must break one card, not the page.

Backend limits this surface has to work around — keep them in mind before adding a number here:
- Tool-use logs have **no time filter**, so any `totalElements` is an all-time count. Error/denial signals show recent rows within a 24h client-side window instead of a total, otherwise one old denial warns forever.
- Connector jobs and webhook deliveries **cannot be filtered by outcome**, so those counts are derived from a scanned page (100 / 20 rows) and flagged `partial` (`12+`) when the set is larger.
- There are no aggregate/analytics endpoints; anything resembling a trend chart needs backend support first.

## UI Patterns

- **Optimistic updates**: update UI immediately, revert on error; track per-item loading with `Set<string>` for O(1) lookup.
- **One-time secret display**: keys/tokens shown once after creation; clipboard "Copied!" feedback + warning banner (connectors use the shared `SecretKeyReveal`).
- **Masked display**: sensitive identifiers show a prefix + first chars + asterisks (e.g. `amobZ3h5****`).
