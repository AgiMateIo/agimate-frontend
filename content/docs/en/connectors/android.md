---
title: Android connector
description: The phone as a source of tools and triggers
order: 3
screen: /dashboard/apps
---

The companion app for Android. It advertises the catalog of the phone's tools and triggers to
the agent, reports device events and executes incoming calls delivered over a websocket.

Sources and builds: [AgiMateIo/connector-android](https://github.com/AgiMateIo/connector-android).

## Triggers

- `call_incoming`, `call_missed` — an incoming and a missed call.
- `battery_low` — charge below a threshold.
- `wifi_connected`, `wifi_disconnected` — joining a network and leaving it.
- `shake_detected` — the phone was shaken.
- `location_entered`, `location_exited` — entering and leaving a geofence.

The caller's number is not reported: since Android 9 it is only exposed to apps holding the
phone or call-screening role.

## Tools

- `tts_speak` — speak a text.
- `notification_show`, `notification_ask` — show a notification, ask a question with options.
- `contacts_search` — search the contacts.
- `calendar_search`, `calendar_create_event` — read the calendar and create an event.
- `geofence_add`, `geofence_remove`, `geofence_list` — manage geofences.
- `camera_capture` — a shot from the camera.

## Worth knowing

The catalog is advertised whole at linking and replaced whole at every re-advertisement, so a
tool switched off in the app is not visible to the agent at all. Triggers run through
foreground services: without the permissions the app asks for at install, some events will not
reach the agent.
