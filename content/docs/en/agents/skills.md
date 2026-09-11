---
title: An agent's skills
description: Bind a skill, and work out why it is not working
order: 3
screen: /dashboard/agents
---

A skill describes how the work is done, but on its own it does nothing: it has to be bound to
an agent. How a skill is built inside and how to write your own is the [Skills](/docs/skills)
section.

## Bind

The agent's page → Skills → "Add Skill". The list holds your skills and public ones; the ones
already bound are marked.

Every skill shows which connectors it requires. It will only work once those connections are
open to the agent. If the agent has several connections of one type open, the skill gets a
specific one picked: which instance it should work with.

## Why a skill is not working

The **"Not working"** mark means one thing: the skill is short of connections. The agent then
does not receive the skill at all, neither as instructions nor as tools, so asking it is no
use either. The cure is on the [Connections](/docs/agents/connections) tab.

The **"Update available"** mark means the author changed the skill and the agent is still on
the old version. Re-bind the skill to the agent to pull the fresh one.

> [!WARNING]
> Editing a skill's connector list does not by itself reach the agents already using it. Each
> one has to be updated on its own page.

## How a skill reaches the agent

The Loading column offers two options per skill:

- **In the prompt**: the skill's text always stands in front of the agent.
- **On demand**: the agent loads the text when it decides the skill is needed. The prompt is
  shorter, but a step is added.

The choice only works for an agent with the `skill-loader` skill bound. Without it every skill
ships whole in the prompt, whatever the column says.

## Unbind

"Remove Skill" unbinds the skill from the agent; the skill itself stays in the library. The
connections it required, though, stay open to the agent; if no other skill uses them, take
them off by hand on the Connections tab.
