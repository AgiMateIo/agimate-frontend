---
title: Terms
description: The words you will meet in the dashboard and in this documentation
order: 2
---

The words are laid out by what rests on what. Nothing here needs learning in advance — come
back when a word starts getting in the way.

## An agent and what it is made of

**Agent** is a standing entity: its own model, its own instructions, its own access, its own
channel. It exists whether or not anyone is talking to it right now. You can write to it, and
it can start itself on an event.

**Skill** is a description of how an agent should do its work. A skill describes the work; it
does not widen access. Very often a skill needs tools, and those come from a connector.

**Model**, in our context, is an LLM — a neural network trained on a body of data; a program
that generates content. The model is what receives the user's messages and decides what to
answer or which tool to reach for. Access to models comes from LLM providers.

**Token** is the unit a model measures text in: both what it was sent and what it answered.
Spend is counted per run and per model and shows up in the journal. You pay your own LLM
provider at your own rate. The word has nothing to do with keys or session tokens.

## How an agent reaches the outside world

**Connector** is the one point where the platform extends and agents gain new abilities. One
integration brings tools, triggers, prompt blocks and repeatable jobs. The Mail connector, for
instance.

**Connection** is an instance of a connector holding your credentials. The connector describes
what the integration can do; the connection says on whose behalf. A connection to one
particular mailbox, for instance.

**Tool** is a command or an instruction on a connector that an agent can call. Send a message,
read a sheet, file a task. One connection can carry many tools.

**Trigger** is an event that starts an agent: an incoming message, a deadline that came up, a
change in a service. Triggers are what makes every agent proactive. They are what puts agents
on a par with self-directed colleagues, able to automate your routine and even do the work for
you.

**Channel** is what an agent interacts with you through. It can be the built-in chat or a
Telegram bot connected through a connector.

**App** is a companion program on your device, registered with a key: a desktop client, a
phone, a browser. Once linked, it brings the agent its own tools and triggers. The agent still
has no direct access to the machine — everything is bounded by what the app can do.

## Who is allowed what

**Credentials** of a connection are stored encrypted on the platform and never reach the
model: the agent names a tool, and the key is filled in outside the model. An LLM provider's
key is what lets the platform address the model itself and run the agent on it.

**Policy** is an allow or a deny on one tool or trigger inside a connection. It is checked
before the external service is called, or before the agent is.

A connection you have not opened to a particular agent does not exist for that agent. An open
one is allowed whole — all of its tools and triggers, until a policy forbids the excess.

## What is left behind after the work

**Run** is one handling of one event: from the trigger or the message through to the answer.
**Step** is one stage inside a run: a call to the model, or a tool call with its parameters
and its result.

**Session** is a conversation with an agent, whatever carries it: a chat tab, a messenger, an
IDE. Usually one session is one topic of conversation with the agent.

**Journal** is the runs, steps and calls you can open and read: what the agent did, with which
parameters, and what the service answered.

## When there is more than one agent

**Agentic team** is several agents over a shared task **board**, where it is visible who took
what.
