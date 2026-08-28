# Contributing

Thanks for taking the time to contribute. This document covers the practical
bits; the architecture and conventions are documented in
[`.claude/CLAUDE.md`](.claude/CLAUDE.md) and summarised in the
[README](README.md).

## Getting set up

```bash
corepack enable
pnpm install
cp .env.example .env.local   # point NEXT_PUBLIC_API_BASE_URL at your gateway
pnpm dev
```

The dashboard is a client for the AgiMate API gateway — you need a reachable
backend to do anything beyond the landing pages.

## Before you open a pull request

All three checks run in CI and must pass:

```bash
pnpm typecheck
pnpm lint
pnpm check:i18n
```

There is currently no automated test suite, so please describe how you verified
your change manually.

## Conventions worth knowing

- **Match the surrounding code.** Naming, comment density and file layout are
  consistent across the codebase; new code should be indistinguishable from it.
- **Server data goes through TanStack Query** (`src/queries/`), never through
  `useEffect` + `apiService` in a component.
- **New endpoints** go into the matching module under `src/services/modules/`
  and are exposed through the `apiService` facade in `src/services/api.ts`.
- **Use the locale-aware navigation helpers** from `@/i18n/navigation`.
- **Reuse the UI primitives** in `src/components/ui/` (`Modal`, `Button`,
  `FormField`, `SearchToolbar`, `ConfirmDeleteModal`, …) rather than
  hand-rolling equivalents.
- **Every user-facing string is translated.** Add the key to both `en` and `ru`
  message files — landing/auth strings in `messages/{locale}.json`, dashboard
  strings in `messages/dashboard/{locale}.json`, shared labels in the `Common`
  namespace. `pnpm check:i18n` fails on any asymmetry.

## Commits and pull requests

- Keep commit messages short and in the imperative mood, describing the
  user-visible effect (`Sort agents and connections newest first`).
- One logical change per pull request; explain the *why* in the description.
- Screenshots or a short clip are very welcome for UI changes.

## Contributor License Agreement

Contributors sign the
[CLA](https://github.com/AgiMateIo/agimate-backend/blob/master/CLA.md) once, on
their first pull request, by replying to a bot comment. One signature covers
every AgiMate repository.

## Reporting bugs

Open an issue with the steps to reproduce, the expected and actual behaviour,
your browser, and anything relevant from the browser console or network tab.
Please redact tokens and API keys.

For security issues, follow the
[AgiMate security policy](https://github.com/AgiMateIo/.github/blob/main/SECURITY.md)
instead — do not open a public issue.
