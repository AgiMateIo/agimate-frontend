---
title: First agent
description: Pick a role from the gallery and talk to your agent right away
order: 3
screen: /dashboard/agents/create
---

An agent does not have to be assembled from parts. In the Agent Factory you pick a ready-made
role, look at the skills that come with it, and end up with an agent you can talk to
immediately.

## Step 1. Pick a role

Open Agents and press "Create Agent". The first step is a gallery of ready-made roles; eleven
of them at the moment.

- **Personal assistant** — remembers what matters about you, answers questions, sets reminders,
  works on a schedule.
- **Platform Admin** — creates and configures other agents, writes skills for them and sets up
  integrations.
- **Coder** — works inside your project straight from the IDE: reads the code, makes changes,
  runs the build and the tests.
- **Visual designer** — draws from scratch, retouches your photos, builds collages and product
  cards, reviews mockups and screenshots.
- **Copywriter** — ideas and headlines, posts and newsletters, a content plan and reminders
  when things are due.
- **Team Lead** — takes a goal, breaks it into tasks on the board and assigns them to owners.
- **Astrologer** — natal chart, numerology, Tarot; calculations from ephemerides.
- **Home accountant** — logs spending by voice or from a photo of a receipt, totals by category
  and sends a monthly report on its own.
- **Health diary** — blood pressure, pulse, blood sugar and weight by voice or from a photo of
  the device, reminders to measure and a chart for the doctor's visit.
- **External AI** — your own AI (Claude Code, Cursor, a script of yours): it brings its own
  model and comes to the platform for tools.
- **Language tutor** — short daily practice, a vocabulary sheet, review and work on mistakes.

Next to the roles sits a "Start from scratch" card: an empty form, for when no role fits.

A role is a draft. The name, description and instructions are filled into the form and stay
yours: what goes to the server is exactly the text you see. There is one required field: the
name.

> [!NOTE]
> "External AI" opens a different wizard: instead of a prompt and a model it asks which door
> events reach the agent through. The details are in [Agent types](/docs/agents/types).

## Step 2. Check the skills

The role's skills are already selected. This is also where you can add your own skills or
public ones from the library.

Every skill has its required connectors marked. "Connection open to the agent" means
everything is in place. "Not open to the agent" means the skill will not work until you open
it on the agent's page. "Built-in capability" covers memory, the board and sheets: those open
by themselves at creation.

An uncovered connector does not stop you creating the agent; it is a to-do for later.

## Step 3. Done

The agent is created and ready to talk: the final step has a "Chat with the agent" button that
opens its chat in a new tab. The same chat is always on the agent's page, under Chat.

Until you connect your own LLM provider, the agent runs on the free tier's platform model.

> [!WARNING]
> The agent key is shown once, under "Advanced: agent key". The dashboard chat does not need
> it — API calls do. A lost key cannot be recovered; a new one is issued instead, and the old
> one stops working at once.

## What next

Everything else (your own model, access rights, skills and channels) is configured on the
agent's page. That is the [Agents](/docs/agents) section.
