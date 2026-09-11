---
title: Apps
description: A special kind of connector, running outside AgiMate's perimeter
order: 2
screen: /dashboard/apps
---

An app is a special kind of connector. It runs outside AgiMate's perimeter, on your own
device: in a phone, on a work machine, in a browser. From there it gives the agent access to
one particular application or device.

## How an app differs from an integration

An integration goes into somebody else's service over an API: the platform knows the address,
holds your credentials and calls the service itself. An app works the other way round. The
platform goes nowhere: it puts the call in a queue, and the app holds the connection itself,
picks the call up, executes it at its end and returns the result.

Three things follow from that:

- **The agent has no direct access to your machine.** It can do exactly what the app declared
  as a tool, and nothing beyond.
- **While the app is not running, there are no tools.** A switched-off phone means there is
  nobody to run the call.
- **The catalog is replaced whole on linking.** The app declares its list of tools and
  triggers when it links; everything declared there is something the agent may call.

## How an app is linked

An app is created in the dashboard's Apps section and receives a key. The key is entered in
the app itself: on the phone, in the desktop client, in the browser extension. After linking
the app declares its catalog and opens a connection.

The app sends tool names without prefixes; the namespace is added by the server, so the agent
sees, for example, `app_chromium.page_snapshot`.

## Which apps there are

- [Android connector](/docs/connectors/android) is the phone: calls, geofences, contacts,
  calendar, camera, speech.
- [Desktop connector](/docs/connectors/desktop) is the work machine: files, notifications,
  speech, plugins.
- [Chromium connector](/docs/connectors/chromium) is the live browser with your logins and
  tabs.
- [Reverse MCP connector](/docs/connectors/reverse-mcp) gathers local stdio MCP servers
  behind one address.
- [Remote Terminal connector](/docs/connectors/remote-terminal) is a remote terminal.
