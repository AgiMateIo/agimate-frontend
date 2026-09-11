---
title: Your own LLM provider
description: Leave the free tier and pick the model yourself
order: 1
screen: /dashboard/llm-providers
---

Until you have a provider of your own, an agent runs on the free tier's platform model. That
is enough to try things out, but the model is not yours to pick and the spend is capped. Your
own provider lifts both: tokens go at your own rate with your own provider.

## Add a provider

LLM Providers → "Add Provider". The type is OpenAI, Anthropic, Gemini or OpenAI-compatible;
the last one also needs a base URL. Then the API key.

The key is stored encrypted on the server and is never returned to the interface again —
not to you and not to anyone else. You can replace it with "Rotate Key", and the previous one
becomes invalid at once.

Right after creation the platform goes to the provider for the list of models. If the list did
not load, the provider is created all the same — fix the credentials and press refresh in its
row.

## Purposes and priorities

A model is assigned not to a whole agent but to a **purpose**: chat is the agent's main model,
the other purposes (images, vision, audio) are tool models. One model per purpose.

A provider carries priority lists per purpose. A purpose the agent has not set is resolved
through the list of the provider its chat runs on, and if that is empty too, through the
platform provider. An empty list means "the purpose is switched off": such a call will fail,
and the agent will say so in the chat.

## Pick a model for an agent

The agent's page → Models. One row per purpose: your own provider and model, or "provider's
list", meaning there is no model of its own and the purpose is resolved by priorities.

A model the provider has stopped listing is marked "Not listed". The row stays saved, but
calls through it may fail.

> [!NOTE]
> The runtime silently skips bindings to a disabled provider. If an agent suddenly stops
> answering for one purpose, check the provider's status while you are at it.

## How much was spent

Token spend is visible per run and per model. The counter counts tokens: the platform does not
store prices at call time, and the bill comes from your provider.
