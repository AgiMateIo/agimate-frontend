---
title: Agent types
description: Where an agent's brain lives and which door events reach it through
order: 5
screen: /dashboard/agents
---

The type decides exactly one thing: where the agent runs and which door events reach it
through. It has no effect on access, skills or the journal.

## Generic

The agent runs inside AgiMate's own infrastructure: the platform calls the model itself,
executes the tools itself and writes the journal itself. No external URL and no worker of your
own are needed. This is the default type, and the one almost everyone wants.

## External AI: three doors

The other three types are one and the same case: the agent's brain is on your side, running on
your model in your runtime. The platform does not pick a model for it and hands no keys of its
own outwards. They differ only in the door for incoming events.

- **MCP** — no door at all: the client comes for the tools itself. Claude Code, Cursor or a
  script of your own connect to the agent's MCP address and authorise with the header
  `Authorization: Bearer <agent key>`.
- **Centrifugo** — your runtime holds a websocket connection and receives events over it.
- **Webhook** — events leave as a POST to your HTTPS address. A public URL is required, and an
  authorization header can be set.

An MCP agent has no chat, no channels, no triggers and no models — the platform simply has
nowhere to deliver to. The client sees tools prefixed by connection; characters outside
`[a-zA-Z0-9_-]` are replaced with an underscore.

> [!NOTE]
> An MCP agent's instructions are saved but do not reach the client yet — it receives tools
> only. Once MCP prompts arrive the prompt will start working, with no need to recreate the
> agent.

## Change the type

The type is changed on the General tab. Moving off Webhook drops the address and the header
secret by itself — there is nothing to clear by hand.
