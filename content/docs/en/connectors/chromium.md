---
title: Chromium connector
description: The user's live browser as a source of tools
order: 5
screen: /dashboard/apps
---

> [!NOTE]
> The connector is under development. What follows is the intent and the decisions already
> taken; a proper guide will appear once the extension ships. Information is being prepared.

An extension for Chromium browsers that turns the **live browser** — with all its logins,
sessions, cookies and open tabs — into a source of tools for agents. Its domain is web pages:
navigation, reading, actions. Desktop in the same family covers the operating system, and
Android the phone.

## Two consumers, one set of tools

- **AgiMate agents** — the extension connects to the platform as an ordinary app, the same way
  desktop and Android do.
- **Local MCP clients** — Claude Code, Cursor, Claude Desktop and others, through a local
  bridge that acts as a stdio MCP server.

## Why there is no local process

Working with AgiMate needs no local process at all: the extension's service worker can do both
HTTP and websockets, which makes the extension an app connector in its own right. It installs
from the Web Store in one click — nothing to install into the system, no native messaging host
to register, and no fighting with manifest paths that differ across Chrome, Brave, Edge, Arc
and Vivaldi.

The local bridge exists only for the stdio mode and stays optional.
