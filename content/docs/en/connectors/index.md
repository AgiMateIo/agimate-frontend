---
title: Connectors
description: Where an agent's tools and triggers come from
order: 3
screen: /dashboard/connections
---

A connector is the one place where the platform extends. One integration brings tools,
triggers, prompt blocks and repeatable jobs at once, and from there everything works the same
way whatever the connector is inside.

**Connection** is an instance of a connector holding your credentials. The connector describes
what the integration can do; the connection says on whose behalf it works. One connector can
have several connections: two mailboxes, three chats.

## Where connectors come from

- [Built-in](/docs/connectors/builtin): part of the platform itself, with memory, sheets, the
  board and time. They need no credentials and come one instance per user.
- **Integrations**: external services over an API or MCP. These need credentials, and these
  are what live in the dashboard's Connections section. [Telegram](/docs/connectors/telegram),
  for instance.
- [Apps](/docs/connectors/apps): programs on your devices that bring the agent the tools and
  triggers of that device.

## Two flags that get confused

`enabled` is intent: do we use this connection or not. `authStatus` is whether it can reach
the service at all. A disabled connection stays authorised, and an authorised one can be
disabled.

## Agent access

A connection you have not opened to a particular agent does not exist for it: the call is
refused before anything goes to the external service. Access is opened on the agent's
connections tab, and inside an open connection it is narrowed with policies on individual
tools and triggers; see [An agent's connections](/docs/agents/connections).
