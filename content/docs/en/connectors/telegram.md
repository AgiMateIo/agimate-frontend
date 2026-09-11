---
title: Connect Telegram
description: The bot, the channel and the first message to an agent
order: 8
screen: /dashboard/connections
---

Telegram connects in three steps: a bot from BotFather, the token in a connection, a channel
on an agent.

## 1. Create a bot

Send [@BotFather](https://t.me/BotFather) the `/newbot` command, answer two questions and get
a token of the form `1234567890:AA…`.

> [!WARNING]
> The token gives full access to the bot. It is stored encrypted on the platform and is never
> shown again. If it leaks, revoke it at BotFather.

## 2. Create a connection

On the connections screen pick Telegram and paste the token. The "Test" button makes a real
request to Telegram and answers with the bot's name, which is your confirmation.

## 3. Point the messages at an agent

A connection only receives messages. For somebody to answer them you need a channel; it links
the connection to an agent. How to create one is in
[Telegram channel](/docs/channels/telegram).

> [!TIP]
> If the bot stays silent, look at the trigger logs. They show whether the message reached the
> platform and, if it did, which agent took it.

## Common questions

One bot across several agents is not possible, because a channel links a connection to a
single agent. Group chats work, but the bot has to be added to the group with its privacy
mode turned off.
