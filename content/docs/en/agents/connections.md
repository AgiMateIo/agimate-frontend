---
title: An agent's connections
description: The explicit link between an agent and a connector, and the policies on top of it
order: 2
screen: /dashboard/agents
---

An agent gets access to a connector's tools only through an explicit link between that
connector and that agent. While there is no link, the connection's tools do not exist for the
agent: the call is refused before the platform goes anywhere near the external service. Once
linked, the agent gets its own policies over the connector's tools and triggers.

The link is made on the agent's page, the Connections tab → "Add connection". It lives
separately for every agent: the same connection can be open to one and closed to another.
Built-in platform capabilities (memory, the board, sheets) exist in one instance per user and
are opened along with the skills that need them.

A link alone is not enough for the tools to reach the agent. They enter its context through
skills, so a connection no skill of the agent points at is marked "Unused", and its tools
are not handed to the agent.

## What a policy is made of

- **Kind**: tool or trigger. The two are counted separately: a rule about tools says nothing
  about triggers, and the other way round.
- **Name**: one specific tool or trigger. An empty name ("All (whole connector)") applies the
  rule to the whole connection.
- **Effect**: `ALLOW` or `DENY`.
- **Params filter**: an optional flat JSON object mapping a parameter path to an expected
  value. The rule only fires on a call with those arguments.

A rule with an exact name beats a rule on the whole connector. Both of the setups below are
built on that.

## Everything allowed except the listed

While there are no policies, a linked connection is allowed whole: all of its tools and all
of its triggers. Add a `DENY` on individual names and everything but those remains.

This is convenient when two or three dangerous operations need closing: deletion, sending
things outwards, spending money. A new tool the connector grows tomorrow will be allowed,
though: it is not what you forbade.

## Everything denied except the listed

The reverse order, for when the agent needs a narrow set:

1. Create a rule on the whole connector: name empty, kind Tool, effect `DENY`.
2. Add an `ALLOW` for every name the agent actually needs.

An exact name overrides the whole-connector rule, so what you get is a whitelist: nothing but
what was named. A new tool of the connector will not slip in on its own, which is the point.

Triggers are closed with the same pair of rules under the Trigger kind: one rule on the whole
connector does not close both kinds at once.

## When a policy is checked

Before the external service is called. A forbidden call never leaves the platform, and the
agent gets a refusal and mentions it in its answer.

## Take access away

"Remove connection" on the tab drops the link, and the agent loses access to the connector.
That link's policies are deleted with it; if you open the connection again later, the limits
have to be set up from scratch.

## What stays in the journal

Every tool call is a row in the journal: what the agent called, with which parameters, what
the service answered and whether a policy refused it. Refusals are visible on the agent's Tool
Calls tab and in the shared Tool Use Logs section.
