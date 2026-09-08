---
title: Give a skill to an agent
description: Binding a skill, and what to do after editing one
order: 2
screen: /dashboard/agents
---

A skill on its own does nothing — it has to be bound to an agent.

## Bind it

On the agent's page open its skills and pick one. Context connectors (`board`, `memory`,
`time`) attach themselves; for the rest you have to name a specific connection.

> [!WARNING]
> Changing a skill's connector list does **not** reach agents already using it. Each of them
> has to be re-synced on its own page.

## Check it

Ask the agent in chat about something the skill covers. If it doesn't pick the skill up, the
`description` is usually why — that is what the agent chooses by, not the name.

