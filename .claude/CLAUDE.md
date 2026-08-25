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

A deployed instance also needs `APP_CONNECTORS_MCP_OAUTH_CLIENT_ID` and `APP_CONNECTORS_MCP_OAUTH_REDIRECT_URI` (server-side, read per request) — see **MCP OAuth connections** below. Local dev needs neither.

The base URL points to the API gateway root; service-specific prefixes are added in code (see below).

## Backend Services Architecture

The frontend reaches the backend through the API gateway using two service prefixes, defined in `API.ENDPOINTS` (`src/config/constants.ts`):

- **`user/`** (`USER_API`) — sign-in (password and OAuth2), ways into an account, and user info.
- **`control/`** (`CONTROL_API`) — everything else: agents, skills, apps, channels, agentic teams, boards, connections, LLM providers, the connector catalog, tool/trigger/webhook logs, and the Centrifugo token.

> The `control-api` service was previously named `device-api` (URL prefix `/device` → `/control`). Domain terms that legitimately mean "device" stay: the `deviceId` payload field and the Centrifugo `device:{deviceId}` namespace are unrelated to the service name.

### User API (`user/`)
- **OAuth2**: `POST /oauth2/refresh`, `POST /oauth2/logout`
- **Password sign-in**: `POST /auth/login` (`{email, password, client?}` — `client: WEB` is the default and decides only the *shape* of the answer: web gets its refresh token as an httpOnly cookie, `NATIVE` in the body. `401` covers an unknown address and a wrong password **alike and in the same time** — there is nothing to tell them apart with, so the screen says one thing; `429` after ten failures per mailbox in 15 minutes, with the wait in its `message`).
- **Registration** (three requests and a letter): `POST /auth/register` (`{email, displayName?, ref?}`) → **200 always**, free address or taken — the endpoint would otherwise be a check of who is registered here, so the screen promises "if the address can be registered, a letter is on its way"; `POST /auth/register/resend {email}`; `POST /auth/register/confirm {token, password, client?}` → a token pair. **There is no password in the registration request**: it is named by whoever opens the letter, or one person picks the password while another proves the mailbox. **The account row appears on confirm**, not on register.
- **Password**: `POST /auth/password/forgot {email}` → 200 always (same reason; the screen says the letter went out **unconditionally** — flat wording is fine, wording that varies with the address is not), the letter links to `{front}/password/reset?token=…`; `POST /auth/password/reset {token, password}` — **ends every session of the account, the one that asked included**, so the client must treat itself as signed out (`authApi.resetPassword` calls `httpClient.forgetSession()`); `POST /auth/password/change {currentPassword, newPassword}` (Bearer) — ends every *other* session, this one survives. Rules: ≥8 characters, **≤72 bytes** — the limit is in bytes because the hash reads 72 of them, so 40 Cyrillic letters are already over while looking short (`src/utils/password.ts` counts UTF-8, never characters). No composition rules, deliberately.
- **Ways in** (`GET /auth/methods/`, **trailing slash significant**): one row per way — providers oldest to newest, password last; a provider row's `email` is legitimately `null`. `DELETE /auth/methods/oauth/{PROVIDER}` (**uppercase** here, lowercase in the authorization URL — enum value vs the provider's own registration id) and `DELETE /auth/methods/password`. **The last way in never unlinks**: both answer 400, so the UI greys the button out rather than catching a refusal. Open to a `GUEST`, like the devices list. **Every change here mails the account owner** — say so before the letter surprises them.
- **Linking a provider** (`POST /auth/methods/link {proof}`, Bearer) — see **Linking a provider** below.
- **Mail-less installations**: `register`, `register/resend` and `password/forgot` answer **503** where mail is not configured. Sign-in and an already-issued link keep working.
- **User**: `GET /user/me` (the `/user/user/me` double segment is a wart of that controller, not the convention — the admin area below sits at `user/admin/…`)
- **Sessions** (active sign-ins, one row per device): `GET /user/sessions/` (**trailing slash significant**, one `user` segment — these sit next to `user/oauth2/…`), revoke `DELETE /user/sessions/{id}`. Sorted by `lastSeenAt`, freshest first — **do not re-sort**; revoked and expired sign-ins are absent rather than listed, so there is no status. Timestamps are ISO-8601 with microseconds, not the control API's `yyyy-MM-dd HH:mm:ss`. `deviceLabel` is legitimately `null` (a model for `client: NATIVE`, the raw User-Agent for `WEB` — `describeUserAgent` in `src/utils/user-agent.ts` turns the latter into "Chrome · macOS"). `push` is empty for **every** `WEB` row (web push doesn't exist yet), so notification state is only meaningful for `NATIVE`, and two entries for one device is normal during a token rotation — `maskedToken` is a prefix, never a token, goes nowhere back to the API. Revoking kills token refresh at once but the issued access token lives out its term (an hour, on web and app alike since the lifetimes converged) — promise "will be signed out", never instant; push stops immediately. `GET /user/me` is the one endpoint that re-checks the registry, so a revoked device notices at its next page load rather than at the hour. `404` = already revoked → treat as success and re-read. There is no "sign out everywhere" endpoint. **The screen is open to a `GUEST`** (a lost phone must not wait for approval), which is why the dashboard layout lets that one route through (`GUEST_ALLOWED_ROUTES`).
- **Admin** (ADMIN only): paged directory `GET /admin/users/` (`search` = substring of email *or* display name, `role` = exact, order fixed newest-first with no sort parameter, `size` capped at 100), role change `PATCH /admin/users/{id}/role` (returns the updated user; 400 on your own row so the platform can't end up with no admin; setting the role a user already has is a no-op success). The gate is the `/admin` path prefix, not the individual handler — 403 for a non-ADMIN, 401 without a token, and any endpoint added under it inherits that. **A role change is not platform-wide at once**: user-api applies it immediately, the rest of the API reads the role from the user's access token, so it lands there only after their session refreshes (up to a day) — never promise "access revoked".

### Control API (`control/`)
All paths below are under `control/manage/…` unless noted. Representative groups:
- **Agents**: CRUD `/agents/`, key regen, connector bindings `/agents/{id}/connections/` (the gate for connector access; default-allow) with per-binding policies `/agent-connections/{id}/policies/` (TOOL/TRIGGER allow/deny refinements), skill bindings `/agents/{id}/skills/`, per-agent LLMs `/agents/{id}/llms/` (keyed by `purpose` — `PUT`/`DELETE …/llms/{PURPOSE}` in uppercase, one model per role, a zero-binding agent gets a read-only synthetic `source: PLATFORM` row; an unbound purpose resolves through the CHAT provider's `purposePriority` and then the platform provider's — nothing is guessed by capability, and a dead end makes the tool call fail with a message the user reads in the chat)
- **Skills**: CRUD `/skills/`, public marketplace `/skills/public/`, a skill's agents `/skills/{id}/agents/`
- **Apps**: CRUD `/apps/`, key regen
- **Channels**: CRUD `/channels/`, sessions `/channels/{id}/sessions/` (paged, freshest activity first) and session messages `/channels/sessions/{sessionId}/messages/` (paged **newest-first** — reverse a page to read a transcript, same shape as webchat history)
- **Agentic Teams**: CRUD `/agentic-teams/`
- **Boards**: `/boards/`, tasks `/boards/{id}/tasks/`, task status, task comments
- **Connections** (connector instances): `/connections/…` incl. secret update and test. Create answers `{connection, status, authorizeUrl?}`: `status: "authorization_required"` means the row exists in `PENDING_AUTH` and does **nothing** until the user passes the provider's consent screen (see MCP OAuth below). `authStatus` (`AUTHORIZED`/`PENDING_AUTH`/`AUTH_EXPIRED`) is orthogonal to `enabled` — `enabled` is intent, `authStatus` is whether it can reach the platform. `POST /connections/{id}/authorize` mints a ~10-min consent URL (same call for first auth, re-connect and scope widening); `POST /connections/oauth/complete` finishes it. `test` gained `authorizationRequired`: `valid:true` + that flag is *not* a credential error. v1 limitation: a listing can't tell an OAuth connection from a static-token one (both `AUTHORIZED`), so the "update secret" form 400s on OAuth rows.
- **LLM Providers**: CRUD `/llm-providers/`, `purposePriority` on create/patch/response (uppercase-purpose → ordered model allow-list; key absent = fall through to the platform provider, `[]` = purpose switched off, PATCH replaces the whole map — there is no `defaultModel` any more), refresh models (upsert into the model registry), model registry `/llm-providers/{id}/models/` (rows persist with `AVAILABLE`/`UNAVAILABLE` status — still saveable as a binding, but UNAVAILABLE is skipped inside a purpose list and fails an agent's explicit binding; capability fields `inputModalities`/`outputModalities`/`supportedParameters`/`maxOutputTokens` come from the provider verbatim — compare case-insensitively, `null` = unknown, not "can't"), per-model extra-body `PUT /llm-providers/{id}/models/extra-body` (`model` in the body); provider-level `extraBody` on create/patch/response (≤16 KB JSON object, deep-merged with model-level by the backend, no secrets), read-only catalog `GET /llm-providers/catalog/` (known gateways pre-filling the create form — server-sorted, empty is legal; pre-fill only, it never takes part in how a created provider works)
- **Connector catalog** (read-only): `/connectors/`, `/connectors/{code}`. `integrationMeta.credentialFields` maps a field code to a declaration — `{label, type, required}`, where `type` is `URL`/`SECRET`/`JSON`/`TEXT` and the list is the backend's to grow. It used to be a bare label string, so masking and optionality were guessed from the field name and the label text; don't reintroduce that. An unrecognised `type` renders masked (`src/components/connections/CredentialFieldsForm.tsx`).
- **Logs**: tool-use logs, connector jobs (pause/resume/run-now/delete), trigger logs, webhook delivery logs
- **Webchat** (dashboard chat with agents): sessions `/webchat/sessions` (POST creates, GET lists paged newest-activity-first, DELETE soft-closes), newest-first paged history + send `/webchat/sessions/{id}/messages` (attachments are `parts: [{fileId}]`, up to 5, uploaded beforehand through `POST /manage/files` — the key is `fileId` even though the file row calls it `id`; a file failing ownership/readiness/expiry is a 400, never a silent drop), per-session Centrifugo tokens `POST /webchat/sessions/{id}/token`; agent replies arrive as `webchat_message` events (streams: progress/answer/error, at-least-once — dedupe by `messageId`). A session row also carries `unreadCount` (AGENT `answer`/`error` past the read pointer — `progress` and own messages never count), `lastMessage` (preview cut to 160 chars server-side; `text: null` + `hasAttachments` = an attachment-only message, so never render the empty string) and `isRunning` (a run executing or queued — for *restoring* the "working…" indicator when a screen opens; it goes out live with the answer/error event, and a queued run stops counting after 15 min). Read pointer: `POST /webchat/sessions/{id}/read`, body optional — **`lastReadMessageId` is a history row's `id`, not its `messageId`** (that one is the delivery key and carries no order; sending it is a 400). The pointer only moves forward, so a stale call is a no-op, and sending a message or closing the session clears the badge server-side. `GET /webchat/contacts/` (agents as chat contacts, with the same three fields summed per agent, `lastSessionId` to open) exists but nothing in the dashboard uses it — chat is per-agent, there is no contacts screen.
- **Runs** (one agent's handling of one event): list `GET /manage/runs/` — every filter optional and ANDed (`agentId`, `sessionId` = the conversation view, `triggerLogId` = who picked up one event, `connectorCode`, `connectionId`, `name`, `status`), newest first. It replaces `GET /manage/trigger-logs/agent-runs/` (deprecated, `agentId` was required); the row gained `turnsIntact` — `false` means the turn journal is incomplete and, the one consequence worth showing, later runs of the same session won't see this one, so the agent doesn't remember it. Steps `GET /manage/runs/{runId}/turns/` (page/size, default 50) come newest-first too — **reverse a page to read a transcript**; one tool call is two neighbouring turns (`ASSISTANT` with `toolCalls`, then `TOOL` with `toolResults`, joined by `id`), `SYSTEM` never appears, and nothing is truncated server-side (a reasoning block or a tool output runs to tens of KB — keep it collapsed). `argumentsJson`/`outputJson` are raw JSON **strings** that the worker may have cut at 64000 chars, so `JSON.parse` legitimately fails → show as text; `failed` with `{"error":"cancelled by the user"}` means the call never ran at all. One run by id: `GET /manage/runs/{runId}` answers with **the same row as the list**, no separate projection — a deep link to a run needs nothing else. The list still primes its row into the cache before navigating (`primeRunSummary` in `src/queries/runs.ts`), so a click costs no request; a cold-opened link fetches. The row also carries `turnsCount`, `hasPrompt` (no snapshot → don't render the input tab) and `usage` — token spend summed over the run's model calls, where **the cache counters are deliberately outside `totalTokens`** (billed separately; adding them would count the same prompt twice) and there is no money anywhere, since prices at call time aren't recorded. A turn carries the same `usage` minus `calls`, and **`usage: null` means "no model call" or "the report went missing", never zero** — show nothing rather than a 0. Input `GET /manage/runs/{runId}/prompt` is the message list as it went into the first model call — the only place ephemeral blocks (memory notes) are visible, since they are deliberately kept out of the journal; `messages: null` = no snapshot, not an error, and its result field is called `contentJson` where the journal says `outputJson` (historical, both are here to stay).
- **Runs** (stopping work in flight): `POST /manage/runs/sessions/{sessionId}/cancel` for a chat (the frontend never sees a `runId`, and runs queued behind the working one must stop too — `cancelled: 0` just means there was nothing left to stop), `POST /manage/runs/{runId}/cancel` for a run row. Both only **record a request**: the run notices it at its next seam (between model turns, or when a tool result comes back) and signs off with an ordinary `stream: "answer"` message listing what it managed to do — so nothing special is needed to detect the end, and the UI must say "stopping", never "stopped". Nothing already done is rolled back, no confirmation is asked, and an agent can never cancel a run — only a person. 404 covers both "no such run" and "someone else's".
- **Files** (one layer for everything that passed through it — chat attachments, messenger media, agent-generated images, spreadsheet exports; one entity, one `agf_…` id that is the currency everywhere: `parts[].fileId`, an `[[attach:agf_…]]` marker, a tool argument). **The access boundary is the user** — somebody else's id never resolves, and `agentId`/`origin`/`sessionId` are provenance and navigation, not permissions. Upload `POST /manage/files` (multipart field `file`, optional form field `origin` = a label for the place in the UI it came from, `[a-z0-9][a-z0-9_-]{0,31}`, stored as `user:<label>`; the prefix is what stops an upload from passing itself off as a connector) answers with **the same row the listing returns** — `id`, not `fileId`. Uploading binds the file to nothing: it sits in the account until something references it, which is why the upload precedes the send. Limits 50 MB / 500 MB a day / 30 a minute; a 400 (size cap, quota, bad `origin`) carries a user-ready `error.message` — show it verbatim, 429 = back off. Webchat's own `POST /manage/webchat/files` **is gone**. Paged newest-first list `GET /manage/files/` — `agentId` = *related to* that agent (produced it **or** was shown it, wider than the row's own `agentId` field, which still names the producer alone), `sessionId` = one conversation's attachments in both directions, `name` = case-insensitive substring (a file without a name is unfindable this way), no sort parameter. `DELETE /manage/files/{fileId}` (404 = already gone → treat as success and re-read); the row goes at once, the bytes within a minute, and afterwards references in history stop resolving exactly as they do on expiry. `name` is legitimately `null` where a name never existed — fall back to type + size, never to the id. `url` is a **signed link valid ~15 min**, in one of two shapes chosen per file by the backend and unpredictable from here: an absolute storage link (presigned S3, SigV4 in the query — needs the host in `img-src`/`connect-src` if a CSP is ever added) or a path under the control context path (`/files/{fileId}?exp=…&sig=…`, a public route taking no `Authorization`), so both can arrive mixed in one response. Always route it through `resolveControlFileUrl`; auth is inside the URL either way, so it works in `<img src>`/`<a href>` with no header and no CORS (nothing fetches a file link — keep it that way). Never persist it, re-read the list for fresh signatures (**403 = expired signature, not lost access** — re-read first, and only a row missing from the listing means the file is gone). A presigned link doesn't pass through the `files` table, so it outlives deletion until it expires — the delete warning is about references inside the app, not about a link already copied out. Retention differs by origin: **90 days for what a person uploaded, 7 for what a connector produced**, read off `expiresAt` and not extendable from the UI — show the remaining time or vanishing files read as data loss. Deleting breaks the file wherever it was referenced (chat, task comments, sheets), so it is always confirmed. Video seeking and resumable downloads work only on presigned links — our own streaming ignores Range. Not ours: `POST /app/files` is the connected-app channel, a dashboard client always uses `/manage/files` with the ordinary JWT.
- **Admin** (ADMIN only, same path-prefix gate as user-api's): per-user token spend `GET /manage/admin/llm-usage/{userId}/` — the shape of the caller's own `/manage/llm-usage`, for an arbitrary user. Never 404s (control-api doesn't own the user directory, so an unknown id answers with the platform row at zero) and an empty array is legal. `source` changes what the numbers mean: `PLATFORM` = that user's own free-tier spend, `USER` = the whole own key across all their agents — do not label them alike.
- **Centrifugo**: `POST /control/manage/centrifugo/token`

## OAuth2 Authentication Architecture

Sophisticated OAuth2 flow with JWT tokens and automatic refresh.

### Token Management
- **Access Token**: JWT in `sessionStorage`, **~1h** (was 24h) — read the term from `expiresIn` on every token response, never from a constant: the backend changes it without telling clients. `storeTokens` turns it into an absolute `access_token_refresh_at` at **90% of the lifetime**, and `startTokenLifecycle()` (armed once by `UserProvider`) refreshes in the background at that mark. That does **not** replace the reactive refresh on 401 — a laptop asleep through the window wakes holding a dead token — and neither half is enough alone.
- **Refresh Token**: JWT in an HTTP-only cookie (browser-managed), ~7 days
- **Refresh Token ID**: identifier in `localStorage`, prevents token replay. Refresh is single-use with rotation, so it is serialized in `httpClient` (one in-flight promise), a **409 "Concurrent refresh" is retried once** with whatever id is in storage by then (someone rotated first — a live session, not a dead one), and a lost response can be replayed with the same id for a minute. A **403 "already rotated"** past that minute is the backend closing the session: for us, a sign-out.
- **Session ID**: `sessionId` from every `/oauth2/refresh` response, in `localStorage` next to the refresh token id (`src/services/currentSession.ts`, read via `useCurrentSessionId`). Stable for the life of the sign-in and the **only** way to tell which row of the device list is this browser — the list carries no such flag. Absent until the first refresh that returns it, and then no row is marked rather than the wrong one.

### `GET /user/me` is the only revocation check
Every other endpoint trusts the token's signature until the hour is out; `/me` alone reads the session registry and answers **401** when the sign-in was revoked (signed out on this device, killed from the devices list, password changed or reset). The transport already does the right thing with it: refresh → retry → clear tokens and hard-redirect to `/login`. The third outcome is normal, not a bug — it is what "somebody signed me out from another device" looks like.

### Authentication Flow
Two ways in, and one account can hold both at once (see **Linking a provider**).

**Password**: `/login` posts to `/auth/login`, the pair is stored, `fetchUser()` runs, and the page lands on `?next=` or `/dashboard`. Registration is `/register` → letter → `/register/confirm?token=…` (sets the password, creates the account, signs in). "Forgot" is `/password/forgot` → letter → `/password/reset?token=…`. The email links carry **no locale prefix** — the next-intl proxy adds the visitor's own on the way in, as it does for `/login-check`.

**Provider**:
1. `/login` sends the user to backend `/oauth2/authorization/{provider}?redirect_to=<login_check_url>`
2. After provider auth, backend redirects to `/login-check#rti-<refreshTokenId>`
3. `/login-check` extracts the refresh token ID from the URL fragment and calls `/oauth2/refresh`
4. Backend validates the refresh-token cookie + ID, returns a new access token and refresh token ID
5. Tokens stored locally, user redirected to the dashboard

A provider sign-in looks for the person by "provider + its id" first and only then by confirmed address, and that second step can now refuse in words: two accounts at one provider on one mailbox, or a provider not authorised to walk into an existing account by address. **Those refusals carry no machine-readable code, only an English `message`** — show it verbatim; matching on the string is the fragile thing the backend offered to fix with an `error.code` if a screen ever needs its own wording.

`/login` offers a way in only when nobody is signed in: with a stored refresh token id it waits for `UserContext`, and a live user is redirected to `?next=` or `/dashboard` instead. Signing in on top of a live sign-in is not idempotent — the backend opens a **second session**, which the device list then shows as a stray row (`hasStoredSession()` from the transport is what keeps SSR rendering the buttons as before).

The two pages are split on purpose: `/login` only offers the providers, `/login-check` owns the callback. Nothing on `/login` reads the fragment, so a backend that ignores `redirect_to` and lands the user on `/login#rti-…` produces a dead page with no request in the network tab — check the callback-side `redirect_to` allowlist before suspecting the frontend.

### Multi-Domain OAuth2 Redirect
The backend supports OAuth2 login from multiple frontend domains. The frontend appends `?redirect_to=<encoded_login_check_url>` so the backend knows where to redirect back. `redirect_to` is computed client-side from `window.location.origin + '/login-check'` (via `useSyncExternalStore` to avoid SSR hydration mismatches). The path is hardcoded to `/login-check` without a locale prefix — the next-intl middleware adds the locale on redirect.

### Token Storage Security
- **Access tokens**: `sessionStorage` (cleared on tab close)
- **Refresh token ID**: `localStorage` (persists; identifier only)
- **Refresh token**: HTTP-only cookie (inaccessible to JS — XSS-safe)

Never store the actual refresh token in JavaScript-accessible storage.

### Returning to an interrupted page after sign-in
`/login` accepts `?next=<locale-less in-app path>` and threads it through as `redirect_to=<origin>/login-check?next=…`; `/login-check` navigates there instead of `/dashboard`. Values pass through `safeNextPath` (`src/utils/next-path.ts`) — in-app paths only, no absolute or protocol-relative URLs. It exists for the MCP OAuth callback, whose single-use `code`/`state` must survive the sign-in round trip **in the URL** rather than in storage.

## Linking a provider

Adding a second door to an account somebody is already inside. **Two steps, and the order is the point**: the round trip through the provider establishes *which provider* and nothing else, and *whose account* is said by the next request, with an `Authorization` header a foreign page cannot send. A one-step version let anyone who could make a browser follow a link attach their own provider account to somebody else's login.

1. A page navigation (never `fetch`) to `GET /user/oauth2/authorization/{provider}?link=1&redirect_to=…`. `link=1` is exactly that string; anything else reads as an ordinary sign-in. `redirect_to` is matched against the installation's allow-list **character for character**, so it carries no locale prefix: `${origin}/dashboard/settings`.
2. The provider returns to `{redirect_to}?link_proof=<64 hex>&provider=github`. `AuthMethodsCard` reads it out of `window.location.search`, **strips both parameters with `history.replaceState` before anything else** (otherwise they ride along in `Referer` and settle into history, and a reload replays a spent proof), then posts `{proof}` to `/auth/methods/link`. The proof lives 5 minutes — the trip from the callback, not time to think it over — and is spent once, guarded by a module-level `Set` so StrictMode's second mount doesn't turn a success into "already used".

**When `redirect_to` is not on the installation's allow-list the backend silently returns to its default address instead — which is `/login-check`.** The failure is invisible: the proof arrives, `/login-check` finds no `#rti-` fragment, bounces to `/login`, and a signed-in person lands on the dashboard as if the round trip never happened. So `/login-check` forwards a `link_proof` in its query to `/dashboard/settings` rather than dropping it, and linking works either way — one extra hop until the settings address is allow-listed.

**The outcome is held at page-load scope, not in component state** (the module store beside `spentProofs` in `AuthMethodsCard`). The two facts have one lifetime: a proof is spendable once, so a second mount cannot retry it — and an outcome living in a `useMutation` would be stranded by any unmount, leaving a "linking…" that never finishes or no banner at all, with the spent-proof guard blocking a retry. A settled banner is cleared when the card unmounts; one still in flight is not.

Four outcomes, **all of them HTTP 200**: `LINKED` and `ALREADY_YOURS` are success, `TAKEN` and `PROVIDER_OCCUPIED` are refusals — the status says nothing, the `outcome` says everything. A separate **403** means the proof is expired, spent or forged → offer the round trip again.

Gone with this design: the ticket endpoint (`POST /auth/methods/link/{provider}`), the `link_ticket` parameter, and the `?linked=` / `?link_error=` redirect outcomes. Nothing in this repo ever spoke that protocol.

**Adding a password** to a provider-only account is not a separate endpoint: settings sends the same `password/forgot` letter as the sign-in screen.

**CORS is now an allow-list** of the installation's sign-in redirect origins. A dev host that is not on it fails at the preflight — fixed in the installation's configuration, never on the client.

## MCP OAuth connections

Some MCP servers (Notion, Linear, Atlassian, Sentry…) refuse a hand-written token. The user enters only the server URL; the backend finds out that OAuth is needed and creates the connection in `PENDING_AUTH`, and the frontend walks the user through the provider's consent screen. **No token ever reaches the frontend.**

- `src/app/connections/oauth/client.json/route.ts` — outside `[locale]`, served as `application/json` without auth: the *provider's server* fetches it to learn the app name and the allowed return addresses. `client_id` and `redirect_uris` come from `APP_CONNECTORS_MCP_OAUTH_CLIENT_ID` / `APP_CONNECTORS_MCP_OAUTH_REDIRECT_URI` (read per request, `force-dynamic`) and must equal the backend's settings byte for byte — never derived from `window.location` or `Host`. Missing config answers `503` rather than serving wrong addresses. The middleware matcher already skips dotted paths, so no locale prefix is added.
- `src/app/[locale]/connections/oauth/callback/page.tsx` — the return address. Forwards `state`/`code`/`error`/`iss` to `POST /connections/oauth/complete` verbatim and **exactly once** (a module-level `Set` of spent states, so StrictMode's second mount doesn't turn a success into "already been used"; no automatic retry). `error_description` from the URL is never rendered — until the backend has matched `iss`, anything in that query is attacker-supplied.
- `src/components/connections/ConnectionAuth.tsx` — the shared badge, panel and "Подключить/Переподключить" button; `window.location.assign` on the minted URL (never `fetch`, never an iframe — consent screens send `X-Frame-Options`).

## API Service (`src/services/`)

`apiService` (default export of `src/services/api.ts`) is a singleton exposing all backend calls behind a **flat facade**. `api.ts` only composes per-domain modules from `src/services/modules/` (`admin`, `agents`, `apps`, `skills`, `llmProviders`, `channels`, `boards`, `connections`, `connectors`, `files`, `agenticTeams`, `logs`, `misc`, `webchat`) over the shared transport core in `src/services/httpClient.ts`. Consumers call `apiService.getAgent(...)` etc. and never touch the modules directly. When adding an endpoint, put the method in the matching domain module (or add a new module and spread it into the facade in `api.ts`).

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

`src/realtime/centrifugoClient.ts` holds a singleton `Centrifuge` connection, fetching/caching a JWT via `apiService.getCentrifugoToken()` and refreshing before expiry.

Everything addressed to the **user** rather than to one entity shares the personal `user:{userId}` channel: board events and `webchat_activity` (a delivered agent `answer`/`error` in any of their chats — the badge stream for when no conversation is open; best-effort, so the next listing is the real count, and the open session must be skipped since it renders that message itself). Centrifugo allows **one subscription per channel per connection**, so `src/realtime/personalChannel.ts` owns that single subscription and fans publications out — a component calling `newSubscription` on it directly would tear the others down. That also rules out server-side `tagsFilter` there; consumers (`useBoardSubscription`, `useWebchatActivitySubscription`) filter the stream themselves. `src/realtime/useWebchatSubscription.ts` is separate: per-session `webchat:{sessionId}` channels with their own tokens (`apiService.getWebchatSessionToken`), over the same connection. The `device:{deviceId}` namespace is used for push to physical devices.

## Contexts

- **`UserContext`** (`src/contexts/UserContext.tsx`): global auth state over a React Query query (`userKeys.me()`) — resolves to `null` without a stored refresh token ID instead of being disabled, so `loading` stays true until the answer is known and a protected page never bounces to `/login` on the first render. Exposes `{ user, loading, error, fetchUser, logout }`; `logout` writes `null` into the cache.
- **`BreadcrumbContext`** (`src/contexts/BreadcrumbContext.tsx`): lets pages override breadcrumb labels for dynamic route segments via `useSetBreadcrumb(segment, label)` / `useBreadcrumbOverrides()`.

```typescript
import { useUser } from '@/contexts/UserContext';
const { user, loading, error, fetchUser, logout } = useUser();
```

## Internationalization (i18n)

Routing is **locale-prefixed** (`localePrefix: 'always'`). Locales: `ru` (default) and `en` — see `src/i18n/routing.ts`. The proxy (`src/proxy.ts` — Next 16 renamed the `middleware` file convention to `proxy`; the `next-intl/middleware` import path is unchanged) is `next-intl`'s `createMiddleware(routing)`.

Translation files are split into two layers, merged at runtime in `src/i18n/request.ts` (base + dashboard):
```
messages/
├── en.json / ru.json            # Landing + auth + shared:
│                                 #   Metadata, HomePage, Login, LoginCheck, Logout,
│                                 #   Common, LocaleSwitcher, N8nPage, DesktopPage, AndroidPage
└── dashboard/
    └── en.json / ru.json         # Dashboard namespaces:
                                   #   Sidebar, TopBar, DashboardHome, ApiKeys,
                                   #   Connectors, Agents, LlmProviders,
                                   #   AgenticTeams, Connections, ConnectionDetail,
                                   #   ConnectionAuth, Board,
                                   #   Skills, SkillConnectors, SkillAgents, Settings, Channels, Chat,
                                   #   Runs, Files, Admin
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
│       │   ├── admin/users/       # ADMIN only: user directory, roles, per-user spend
│       │   ├── agents/            # list, create, [id], [id]/edit, [id]/chat, [id]/files,
│       │   │                      #   [id]/runs (same list as /dashboard/runs, agent-scoped), deliveries
│       │   ├── agentic-teams/     # list, [id], [id]/agents, [id]/board
│       │   ├── apps/              # list, [id]
│       │   ├── channels/
│       │   ├── connections/       # list, [id]
│       │   ├── connector-jobs/
│       │   ├── files/             # user files: list, delete (also the chat attachment picker
│       │   │                      #   and the agent's own /agents/[id]/files section)
│       │   ├── llm-providers/
│       │   ├── runs/              # all runs (?sessionId= scopes to one conversation),
│       │   │                      #   [id] = one run's steps + input snapshot
│       │   ├── skills/            # list, create, [id], [id]/edit
│       │   ├── tool-use-logs/     # accepts ?status= / ?access= to seed filters
│       │   ├── trigger-logs/
│       │   └── settings/       # profile, ways in (providers + password), devices,
│       │                      #   invite link; also the return address of provider linking;
│       │                      #   the one dashboard route a GUEST may open
│       ├── connections/             # public deep links: new/ (→ dashboard),
│       │                            #   oauth/callback/ (MCP OAuth return address)
│       ├── login/  login-check/  logout/
│       ├── register/  register/confirm/      # email sign-up: request, then set the password
│       ├── password/forgot/  password/reset/ # one letter, two entry points
│       └── n8n/  desktop/  android/   # landing pages
│   └── connections/oauth/client.json/ # route handler, no locale prefix (see MCP OAuth)
├── components/
│   ├── admin/  agents/  agentic-teams/  boards/  channels/  connectors/
│   ├── auth/                      # AuthCard, ProviderIcon, NewPasswordFields — shared by
│   │                              #   the out-of-app screens and the settings card
│   ├── connections/  dashboard/  files/  llm-providers/  runs/  settings/  skills/
│   ├── webchat/
│   ├── landing/  layout/
│   └── ui/                        # Alert, Button, FormField (+ Select), Modal, ConfirmDeleteModal,
│                                  #   Toggle, Tabs, Chip, RowAction, Pagination, RefreshControls,
│                                  #   SearchToolbar, FilterPill,
│                                  #   ErrorAlert, ErrorBoundary, LocaleSwitcher
├── config/constants.ts            # UI, API.ENDPOINTS
├── config/authProviders.ts        # which providers are offered, and where
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
├── utils/                         # date, error, clipboard, api-url, avatar, animateCardMove,
│                                  #   next-path (post-sign-in return path), password (byte-counted rules)
└── proxy.ts                     # next-intl locale routing (was middleware.ts)
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

Conventions: keys come only from the domain's key factory; **every page uses the `ErrorBoundary` + `Suspense` shell** with suspense queries (list and detail alike); two `useSuspenseQuery` calls in one component run **serially** — use `useSuspenseQueries` for parallel fetches. **Mutations**: create/edit/delete forms use `useAsyncForm` + `apiService.*` and invalidate via the domain's cache actions in `onSuccess`; reserve a `useMutation` hook in the query module for optimistic updates with rollback (`queryClient.setQueryData`/`setQueriesData` then restore — see `useUpdateConnectionMutation`, `useChangeTaskStatusMutation`). **Never fetch server data with `useEffect` + `apiService` in a component** — it bypasses the cache (some older `*Tab` components and nothing else should; migrate them when touched). Paged auto-refresh tabs (logs/jobs/deliveries) use `usePagedLogsQuery` from `src/queries/logs.ts` (page/pageSize state + `refetchInterval` + `keepPreviousData`), paired with `RefreshControls` and `Pagination`. **Grow-on-demand lists** (chat sessions, message history) use `useInfiniteQuery` with `nextPageParam` from `src/utils/paging.ts` and flatten through `dedupeById` — page-number paging over a list that moves under it (a new message reorders sessions) repeats and skips rows, and `size` is capped at 100 server-side, so paging maths reads `number`/`totalPages` off the response, never the request.

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

Types live in `src/types/`, one file per domain (`agents`, `skills`, `apps`, `channels`, `boards`, `agentic-teams`, `connections`, `llm-providers`, `agent-connections`, `agent-skills`, `connector-jobs`, `webhooks`, `centrifugo`, `tool-use-logs`, `files`, `admin`, …), re-exported from `index.ts`.
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

## Ветки и релизы

`main` — единственная долгая ветка. Ветка под задачу живёт часы-дни и вливается обратно; каждый мерж в `main` выкатывается в прод. Незаконченное прячется за флагом, а не за долгой веткой — ветка, живущая неделю, здесь считается проблемой, а не нормой.

Ни `develop`, ни релизных веток нет: одновременно поддерживаемых версий у дашборда не бывает, в природе живёт ровно одна — задеплоенная. Если это изменится (on-prem, поддержка `1.x` рядом с `2.x`), модель придётся пересматривать, и вот тогда появится смысл в gitflow.

### Версия

`package.json` — единственный источник номера: `next.config.ts` печёт его в бандл как `NEXT_PUBLIC_APP_VERSION`, сайдбар показывает. Отсюда следствие, которое стоит знать: **между релизами сайдбар показывает номер последнего релиза**, а образ — точную сборку (`v1.3.0-7-gabc1234`). Сайдбар отвечает на «какая версия», логи и реестр — на «какая ровно сборка».

### Релиз

Релиз — это решение, а не ветка: бамп `package.json` отдельным коммитом в `main` плюс тег.

```bash
# в main, на коммите, который решили выпустить
# бамп версии в package.json → коммит `chore: version — 1.4.0 …`
git tag v1.4.0
git push origin v1.4.0        # ТЕГ ПЕРВЫМ
git push origin main          # затем ветка — она запускает сборку
```

**Порядок пуша существенен.** Сборку запускает пуш `main`; если тег приедет вторым, `git describe` в CI его не увидит и релиз уедет как `v1.3.0-8-g…` вместо `v1.4.0`. Либо тег первым, либо `git push --atomic origin main v1.4.0`.

Про релизный коммит легко забыть — обычная работа деплоится и без него, ничего не ломается, и номер тихо застывает (так `1.2.5` простояла 263 коммита). Подпорки две, обе в job `version`: сборка **падает**, если точный тег `vX.Y.Z` разошёлся с `package.json`, и **предупреждает** в логе, когда от последнего тега накопилось ≥20 коммитов. Заставить бампнуть версию CI не может — каждый коммит в `main` выкатывается независимо от тега.

Хотфикс отдельной модели не требует: та же короткая ветка в `main`, релизный коммит с patch-версией, тег.

### Что собирается

Образы строятся только из `main` (`build-deploy.yml`). Ветки задач проходят `ci.yml` — typecheck, lint, check:i18n — и не собираются: отдельного окружения под них нет, а `update-infra.sh` пишет в ту же запись инфры, что и прод, так что сборка ветки, дошедшая до этого шага, перевыкатила бы прод. По той же причине `latest` в `build-and-push.sh` пушится безусловно: пока `main` — единственная собираемая ветка, это безопасно.

## Commits

```
<тип>: <объект> — <дельта>
```

- **Язык — английский**, и субъект, и тело. Репозиторий публичный: историю читает контрибьютор, а не только команда.
- **Тип** — один из: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`. Развилку «фича или рефакторинг» решает признак **«заметно ли снаружи»** (пользователю, API, агенту), а не объём правки. Тесты рядом с фичей входят в `feat`; `test` — только когда коммит целиком про тесты.
- **Объект** — существительное первым словом после типа: страница, компонент, хук, эндпойнт, i18n-неймспейс. То, по чему будут грепать историю. Не глагол.
- **Дельта** — результат, а не действие (`per-purpose priority lists instead of a provider default model`, не `fix provider models`). Замену писать как «A instead of B».
- Тире — не обязательная часть, а инструмент: ставится, когда объект сам себя не объясняет.
- **Scope в скобках не используем** — нужный участок называется словами в объекте (`agent wizard`, `dashboard work mode`).
- ≤72 символа, без точки в конце, строчная буква после двоеточия.
- **«+» в субъекте означает, что коммит надо разделить** — это единственная проверка на атомарность, которую можно сделать глазами.
- Фазовый маркер долгой работы — в конце субъекта: `(1a)`, `v2.1`.

Тело — опционально, 2–4 буллета, один буллет = один смысловой блок. В буллеты идёт **почему так, а не иначе** и неочевидные следствия; не идёт — список файлов, «обновил тесты» (подразумевается) и пересказ диффа.

Без трейлера `Co-Authored-By`.
