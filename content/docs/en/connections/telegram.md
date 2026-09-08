---
title: Connect Telegram
description: A bot, a channel and the first message to an agent
order: 2
screen: /dashboard/connections
---

Telegram takes three steps: a bot from BotFather, the token in a connection, a channel
pointing at an agent.

## 1. Create the bot

Send [@BotFather](https://t.me/BotFather) the `/newbot` command, answer two questions and
get a token that looks like `1234567890:AA…`.

> [!WARNING]
> The token is full access to the bot. It is stored encrypted and never shown again — if it
> leaks, revoke it in BotFather.

## 2. Create the connection

On the connections screen pick Telegram and paste the token. "Test" makes a real call to
Telegram and answers with the bot's name — that is your confirmation.

## 3. Route messages to an agent

A connection only receives messages. For someone to answer them you need a channel: it ties
the connection to an agent.

> [!TIP]
> If the bot stays silent, look at the trigger logs. They show whether the message reached
> the platform at all, and if it did, which agent picked it up.

## Common questions

One bot for several agents — no, a channel ties a connection to a single agent. Group chats
work, but the bot has to be added to the group with privacy mode turned off.
