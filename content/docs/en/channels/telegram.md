---
title: Telegram channel
description: Link a Telegram connection to an agent
order: 1
screen: /dashboard/channels
---

A channel points the bot's messages at a particular agent. By this point you should already
have a Telegram connection holding the bot's token. If you do not, start with
[Connect Telegram](/docs/connectors/telegram).

## Create

Channels → "New Channel".

- **Name**: for you; it plays no part in the work.
- **Agent**: who will be answering.
- **Handler**: `telegram`.
- **Connector and connection**: that same bot.

Message parsing needs no separate setup: the `telegram` handler knows the format itself. Text,
photos and documents are reduced to one incoming message, and the answer goes out through the
connection's tools.

## Build from a message

If you are unsure which connection to pick, press "Build from a message". The platform issues
a marker code, you send a message carrying it to the bot, and the connector and connection are
filled in from the caught trigger. The test event is logged but is not delivered to any agent.

## Input filter

An optional field. A JSON object of paths and expected values, with all conditions ANDed
together. It matters when one bot is written to from several places and should not answer all
of it: only a particular group, say, or only messages carrying a particular field.

## Check

Write to the bot. If it stays silent, look at the trigger logs: they show whether the message
reached the platform and which agent took it. An empty log means it never reached the
platform, so the problem is the bot or the token, not the channel.

> [!TIP]
> In groups a bot does not see every message by default. Add it to the group and turn its
> privacy mode off at BotFather.
