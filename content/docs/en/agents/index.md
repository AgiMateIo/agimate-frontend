---
title: Agents
description: What you configure on an agent after it is created
order: 2
screen: /dashboard/agents
---

An agent's model, access and abilities change at any time and independently of each other. All
of it lives on the agent's page, laid out across tabs.

## The tabs of an agent's page

- **General** — name, description, instructions, type, key, the "Enabled" switch.
- **Chat** — a conversation with the agent right in the dashboard.
- **Models** — which model answers for which purpose.
- **Channels** — what the agent is talked to through from outside: Telegram and others.
- **Skills** — what the agent can do and how it learns it.
- **Connections** — what it can reach.
- **Files**, **Tool Calls**, **Runs** — what is left behind after the work.

An "External AI" agent has fewer tabs: no chat, no channels, no runs and no models — it comes
for the tools itself.

## The order

1. [Your own LLM provider](/docs/agents/llm-provider) — to leave the free tier's limits behind
   and pick the model yourself.
2. [An agent's connections](/docs/agents/connections) — what the agent is allowed to touch
   outside.
3. [An agent's skills](/docs/agents/skills) — how it should do the work.
4. [Editing an agent](/docs/agents/edit) — name, prompt, key, disabling, deletion.

[Agent types](/docs/agents/types) only matter if the agent's brain lives on your side.
