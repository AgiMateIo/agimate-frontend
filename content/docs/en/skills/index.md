---
title: Skills
description: What an agent can do, and where it learns it from
order: 3
screen: /dashboard/skills
---

A skill is a `SKILL.md`: a YAML header with a name, a description and the connectors it
needs, and below that the instructions for the agent in plain text.

## What it is made of

The platform reads the header: `name` is the skill's machine code, `description` is what the
agent uses to decide whether to reach for it, `connectors` is the tooling it needs. The body
is what the agent reads once it does.

## Yours and public

Your own skills are visible only to you. A public skill is visible to everyone and can be
taken. Platform skills are read-only.
