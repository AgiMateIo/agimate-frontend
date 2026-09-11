---
title: Android app
description: Chatting with your agents on the phone, with push on new messages
order: 2
screen: /dashboard/settings
---

A messenger for your own agents. The agent list reads as a contact list: you open the one you
want and talk. It is the same webchat as in the dashboard, on a phone, with push notifications
when an agent has answered.

Sources and builds: [AgiMateIo/agimate-chat-android](https://github.com/AgiMateIo/agimate-chat-android).

> [!NOTE]
> This is not the [Android connector](/docs/connectors/android). The connector hands the agent
> the phone's tools: calls, geofences, the camera. Here it is the other way round: the phone is
> not a source of tools but the place where you and the agent talk. The two apps are
> independent, and you can install either or both.

## The same conversations

The app works with the same sessions as the dashboard chat: one list, one history, one read
pointer. A conversation started in the browser continues on the phone from where it left off,
and what you read on the phone does not stay highlighted as unread in the browser.

Attachments are shared too: an image or a document sent to the agent from the phone shows up
in the dashboard.

## Notifications

While the app is open, answers arrive as a live feed over a websocket. While it is closed they
arrive as push, delivered over two channels, Firebase and RuStore, depending on where the app
was installed from.

A build without a push project configured still works: the live feed is unaffected, there are
simply no notifications while the app is closed.

## What the app has, and what it does not

Everything complicated stays in the dashboard: integrations, skills, access policies, model
choice and billing. What reaches the phone is the conversation, and only that.

The app speaks Russian and English, and the language is switched inside it, independently of
the phone's. From Android 13 the system remembers the choice itself, so it matches the "App
language" item in the phone settings and survives a reinstall.

## Signing in, and devices

Signing in is the same as in the dashboard: email and password, or a provider. After signing
in, the phone appears as its own row in the device list in profile settings, and the session
can be revoked from there. Notification state in that list is only meaningful for phones:
browser rows carry none, as web push does not exist yet.
