---
title: Connections
description: How an agent gets tools and triggers
order: 2
screen: /dashboard/connections
---

A connection is an instance of a connector holding your credentials. The connector
describes what the integration can do; the connection says on whose behalf.

## Two flags people confuse

`enabled` is intent: whether we use this connection at all. `authStatus` is whether it can
reach the service. A disabled connection stays authorised, and an authorised one can be
switched off.

## Agent access

By default an agent sees every connection. Narrow that on the agent's connections tab, and
within one connection use policies for individual tools and triggers.
