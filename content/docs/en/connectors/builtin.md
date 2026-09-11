---
title: Built-in
description: The connectors the platform brings on its own
order: 1
screen: /dashboard/connections
---

Built-in connectors are part of the platform itself. They need no credentials, never go out to
the outside world, and exist in one instance per user. They are opened to an agent along with
the skills that need them: connecting them separately is usually unnecessary.

## Talking to an agent

**`webchat`** is the chat with an agent in the dashboard. It has no tools, only a trigger on an
incoming message. The connection appears by itself, at the first conversation.

**`acp`** is a dialogue with an agent from an IDE over the Agent Client Protocol (Zed and other
ACP clients). It works both ways: the IDE sends the agent messages, and the agent calls the
IDE's own tools: read a file, write a file, run a command. The Coder role is built on it.

## Memory and the size of the prompt

**`persist-memory`** is an agent's standing memory: hot notes taken during a conversation and a
cold digest that goes into the system prompt. Folding notes into cold memory happens on its
own, on a schedule. Memory is personal: the space belongs to the agent.

**`skill-loader`** is loading a skill's text on demand instead of keeping every skill whole in
the prompt. Until an agent has this connector, the "On demand" choice in its skills changes
nothing.

**`tool-loader`** does the same for tool schemas: the agent asks for a tool's description when it
turns out to be needed, instead of receiving every schema up front.

Both matter where there are many skills and tools and the prompt stops fitting.

## Data and work

**`sheets`** is an agent's tables: columns with declared types, filters and summaries over any
column, charts, export to csv and xlsx. The schema of the tables goes into the system prompt
so the agent sees its own tables and does not start a duplicate instead of writing into the
existing one.

**`board`** is an agentic team's task board: tasks, statuses, comments. The data owner is the
calling agent's team, so a team has one board for everyone.

**`time`** is the current time and deferred jobs. An agent sets itself a reminder or a
repeatable job, and a trigger arrives when it is due. Without `time` an agent answers when
addressed but never starts anything itself.

**`media`** brings images through another model: generate, edit, read an image. Needed when the
agent's chat model cannot do it itself.

## Running the platform

**`platform`** holds the tools for managing AgiMate itself: create and configure an agent, write a
skill for it, set up a connection, look through the journals. These are the rights the
Platform Admin role works with, so handing them to an agent is worth doing deliberately.

## Calculation

**`astro`** is genuine astronomical computation: natal chart, transits, synastry. The
ephemerides come from Astronomy Engine, accurate to an arc minute.

**`divination`** is deterministic esoterica: the Destiny Matrix, numerology and Tarot with a
deck from a dataset. The spread is drawn by a tool instead of being invented by the model.
