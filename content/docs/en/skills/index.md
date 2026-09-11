---
title: Skills
description: What an agent can do, and where it learns it from
order: 5
screen: /dashboard/skills
---

A skill is a `SKILL.md`: a YAML header with a name, a description and the list of connectors
it needs, and under it, instructions to the agent in plain text.

## What it is made of

The header is read by the platform: `name` is the skill's machine code, `description` is what
the agent decides by whether to take the skill on, `connectors` is what the skill needs in the
way of tools. The body is what the agent reads once it does take it on.

## Your own and public

Your own skills are visible only to you. A public one is visible to everyone and can be taken
for yourself. The platform's system skills are read-only.
