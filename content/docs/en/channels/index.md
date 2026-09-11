---
title: Channels
description: What a user talks to an agent through
order: 5
screen: /dashboard/channels
---

A channel is what you talk to an agent through: the dashboard chat, the app on your phone, a
Telegram bot, an IDE. It links a connection to one particular agent, and the link goes both
ways: incoming messages go to that agent, and answers travel back the same route.

A channel always belongs to one agent. So one bot cannot be shared across several: for a
different agent to answer you need a different channel and a different connection.

## Webchat appears by itself

The channel for the dashboard chat needs no setting up. The first time you open a chat with an
agent, the platform finds or creates the `webchat` connection and a channel named "Webchat:
agent name". After that it is simply there.

That is why a freshly created agent may have nothing on its Channels tab until the first
message. That is normal, not a sign that something is unconfigured.

## Telegram is set up by hand

The order is the reverse: the connector first, the channel second.

1. Create a bot at BotFather and a Telegram connection with its token: that is
   [Connect Telegram](/docs/connectors/telegram).
2. Create a channel linking that connection to an agent: [Telegram
   channel](/docs/channels/telegram).

A connection on its own only receives messages. Without a channel there is nobody to hand them
to, and the bot stays silent.

## The same chat on a phone

The phone needs no channel of its own: the [Android app](/docs/channels/android-app) works
through the same webchat and the same conversations as the dashboard, and adds push on new
messages.

## The handlers there are

A channel's handler decides how incoming messages are parsed and how the answer is assembled.

- **`webchat`**: the dashboard chat. Appears by itself.
- **`telegram`**: the bot. Text, photos and documents on the way in, text and attachments in
  the answer.
- **`acp`**: a dialogue from an IDE over the Agent Client Protocol. Also appears by itself,
  at the first session from the editor.
- **`generic`**: the universal handler for connectors whose triggers and tools are declared
  by the app itself. The mapping is given by settings: which triggers to listen to, which path
  in the event holds the message text, and which tool sends the answer.

## Sessions

A channel's conversations sit on its Sessions tab. One session is one topic; it can be opened
and read whole, renamed or closed. A closed session stays readable, but writing to it is no
longer possible.

## Delete a channel

The channel stops receiving triggers immediately. Session history is preserved and remains
readable.
