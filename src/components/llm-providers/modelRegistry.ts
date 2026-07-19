import type { LlmProviderModelResponse } from '@/types';

// Capability values arrive from the provider verbatim (mixed case, open set) —
// all comparisons here are case-insensitive; display keeps the original casing.

// "image" among input modalities means the model accepts images (vision).
export const isVisionModel = (m: LlmProviderModelResponse) => hasCapability(m.inputModalities, 'image');

export const hasCapability = (values: string[] | null | undefined, value: string) =>
  values?.some((v) => v.toLowerCase() === value.toLowerCase()) ?? false;

// Compact token count: 131072 → "131K", 2000000 → "2M".
export function formatContextWindow(tokens: number): string {
  if (tokens >= 1_000_000) return `${Math.round(tokens / 100_000) / 10}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return String(tokens);
}

// --- Capability filtering (client-side; three independent AND axes) ---

export type CapabilityAxis = 'input' | 'output' | 'params';

export type CapabilityFilter = Record<CapabilityAxis, string[]>;

export const EMPTY_CAPABILITY_FILTER: CapabilityFilter = { input: [], output: [], params: [] };

export const hasActiveCapabilityFilter = (f: CapabilityFilter) =>
  f.input.length > 0 || f.output.length > 0 || f.params.length > 0;

const axisValues = (m: LlmProviderModelResponse, axis: CapabilityAxis) => {
  switch (axis) {
    case 'input':
      return m.inputModalities;
    case 'output':
      return m.outputModalities;
    case 'params':
      return m.supportedParameters;
  }
};

// Distinct values per axis across the loaded registry (never hardcoded).
// Deduped case-insensitively, keeping the first-seen casing, sorted for stable UI.
export function capabilityOptions(models: LlmProviderModelResponse[]): Record<CapabilityAxis, string[]> {
  const collect = (axis: CapabilityAxis) => {
    const seen = new Map<string, string>();
    for (const m of models) {
      for (const v of axisValues(m, axis) ?? []) {
        const key = v.toLowerCase();
        if (!seen.has(key)) seen.set(key, v);
      }
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  };
  return { input: collect('input'), output: collect('output'), params: collect('params') };
}

// 'match'    — every selected value of every axis is present (⊇, AND semantics).
// 'unknown'  — some active axis is null/absent on the model: we can't tell.
//              Callers must not silently drop these (null means unknown, not "can't").
// 'excluded' — a known axis is missing at least one selected value.
export type CapabilityMatch = 'match' | 'unknown' | 'excluded';

export function matchCapabilityFilter(m: LlmProviderModelResponse, f: CapabilityFilter): CapabilityMatch {
  let unknown = false;
  for (const axis of ['input', 'output', 'params'] as const) {
    const selected = f[axis];
    if (selected.length === 0) continue;
    const values = axisValues(m, axis);
    if (!values || values.length === 0) {
      unknown = true;
      continue;
    }
    const lower = values.map((v) => v.toLowerCase());
    if (!selected.every((s) => lower.includes(s.toLowerCase()))) return 'excluded';
  }
  return unknown ? 'unknown' : 'match';
}

// "text,image → text" pair for the model row; null when both sides are unknown.
export function formatModalityPair(m: LlmProviderModelResponse): string | null {
  const side = (values: string[] | null | undefined) =>
    values && values.length > 0 ? values.map((v) => v.toLowerCase()).join(',') : '?';
  if ((!m.inputModalities || m.inputModalities.length === 0) && (!m.outputModalities || m.outputModalities.length === 0)) {
    return null;
  }
  return `${side(m.inputModalities)} → ${side(m.outputModalities)}`;
}
