---
title: Give a skill to an agent
description: Binding a skill, and what to do after editing one
order: 2
screen: /dashboard/agents
---

A skill does nothing on its own: it has to be bound to an agent.

## Bind

On the agent's page open Skills and pick the one you want. Contextual connectors (`board`,
`memory`, `time`) connect by themselves; for the rest you will have to name a specific
connection.

> [!WARNING]
> A change to a skill's connector list **does not reach** the agents already using it. Each
> one has to be re-synced on its own page.

## Check

Ask the agent in the chat about something the skill describes. If it did not take it on, the
cause is usually the `description`: the agent picks a skill by that, not by its name.
