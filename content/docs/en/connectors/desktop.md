---
title: Desktop connector
description: The work machine: files, notifications, speech, plugins
order: 4
screen: /dashboard/apps
---

A cross-platform agent in the system tray for macOS, Windows and Linux. It watches events on the
computer and passes them to your agents, and takes commands back from them and carries them
out locally.

Sources and builds: [AgiMateIo/connector-desktop](https://github.com/AgiMateIo/connector-desktop).

## Out of the box

**Triggers.** Folder watching in real time: a new file, a change, a deletion, a move. Quick
buttons: a configurable panel for starting a scenario by hand.

**Tools.** Desktop notifications: ordinary ones to the tray, important ones as a modal.
Speech through the computer's speakers.

## Plugins

Desktop extends through plugins, and that is its main difference from the other apps. A plugin
is a folder with code and a config, in Python. There are two kinds:

- **Trigger plugin**: watches an event on the computer and sends the data to the agent
  (device → agent).
- **Action plugin**: receives a command from the agent and performs an action (agent →
  device).

The details of the plugin interfaces are in
[`PLUGINS.md`](https://github.com/AgiMateIo/connector-desktop/blob/main/PLUGINS.md).

## Worth knowing

While the app is not running, its tools do not exist for the agent. That goes for triggers
too: events that happened while the computer was off do not accumulate.
