---
title: Reverse MCP connector
description: Local stdio MCP servers behind one address
order: 6
screen: /dashboard/apps
---

A gateway that runs several local stdio MCP servers and exposes them at a single HTTP address.
It is needed because a stdio server lives on your machine and cannot be reached from outside,
while the platform needs an address to knock on.

Sources: [AgiMateIo/mcp-reverse-proxy](https://github.com/AgiMateIo/mcp-reverse-proxy).

## What it does

**Gathers the servers into one surface.** The tools, prompts and resources of every configured
server appear in one listing, namespaced by server: `gh__create_issue`. The separator is two
underscores, because a single one occurs inside ordinary tool names and such a name could not
be split back apart.

**Translates between protocol revisions.** The gateway speaks a modern MCP revision while most
stdio servers are still on older ones. It probes for the new handshake and falls back to the
old one, so a client reaches a server that has never heard of the new revision.

**Keeps users apart.** It is an OAuth resource server: a token is validated for signature,
expiry, issuer and audience, and each token's owner gets child processes of their own.

## Worth knowing

The process count grows as owners × servers, so the gateway has its own limits on how many
processes live and for how long, see
[`config.example.yaml`](https://github.com/AgiMateIo/mcp-reverse-proxy/blob/main/config.example.yaml).
A full install guide is being prepared.
