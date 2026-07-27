# Security Policy

## Supported versions

This repository tracks the deployed AgiMate dashboard. Only the latest release
on `main` receives security fixes.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Use GitHub's private vulnerability reporting instead: go to the
[Security tab](https://github.com/AgiMateIo/frontend/security/advisories/new)
and choose *Report a vulnerability*. The report stays private until a fix is
released.

Helpful things to include:

- What the issue is and how to reproduce it
- The affected page, component or endpoint
- Impact — what an attacker could read, change or take over
- A proof of concept, if you have one

We aim to acknowledge reports within a few business days and will keep you
updated on the fix. Please give us a reasonable window to ship a patch before
disclosing publicly.

## Scope

This repository is the browser client. It stores the access token in
`sessionStorage`, keeps the refresh token in an HTTP-only cookie and holds only
a refresh-token *identifier* in `localStorage` — see the OAuth2 section of
[`.claude/CLAUDE.md`](.claude/CLAUDE.md).

Issues in the API gateway, agent runtime or other backend services belong to
[AgiMateIo/backend](https://github.com/AgiMateIo/backend), not here. Findings
that require an attacker to already control the user's browser session or
machine are generally out of scope.
