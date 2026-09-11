---
title: Editing an agent
description: Name, prompt, key, disabling and deletion
order: 4
screen: /dashboard/agents
---

## Name

Edited straight in the heading of the agent's page: click it. The name has to be unique: if a
taken name goes to the server at creation, the agent is created under a slightly changed one
and the wizard says so.

## Description and instructions

The General tab. The description is for you and for the agent list. The instructions are the
system prompt: how the agent should behave. They are edited freely and at any time, and the
new version applies from the next message.

Instructions can be cleared: save an empty field and the prompt goes back to "not set". The
name cannot be cleared.

## The agent key

The key is shown once, at creation, and applies only to external agents — the ones whose brain
lives on your side: `CENTRIFUGO`, `WEBHOOK` and `MCP`. For them it opens calls to the
platform: an MCP client authorises with the header `Authorization: Bearer <key>`, and a
websocket or webhook runtime carries the same one.

For a `GENERIC` agent that door is shut: its brain is the platform's own worker, and there is
no legitimate caller reaching the API on its behalf from outside. The dashboard chat needs the
key even less.

> [!NOTE]
> `GENERIC` does have one use for it, and it runs the other way: an IDE connects to the agent
> over ACP with that key. The Coder role is built on this.

"Regenerate Key" issues a new one and **immediately** invalidates the previous one. Everything
that travelled with the old key stops working that same second, so update your clients first.

## Disable

The "Enabled" switch on the agent's page. A disabled agent does not work: its key stops
letting anyone in and its runs do not execute. Settings, skills, connections and the journal
stay where they are; switch it back on and everything continues.

This is what to do instead of deleting, when an agent is simply in the way.

## Delete

Deleting an agent removes its settings and its bindings. The skills and connections themselves
remain: they are yours, the agent was only using them.
