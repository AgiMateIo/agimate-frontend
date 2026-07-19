import type { LlmProviderModelResponse } from '@/types';

// "image" among input modalities means the model accepts images (vision).
export const isVisionModel = (m: LlmProviderModelResponse) => m.inputModalities?.includes('image') ?? false;

// Compact context-window size: 131072 → "131K", 2000000 → "2M".
export function formatContextWindow(tokens: number): string {
  if (tokens >= 1_000_000) return `${Math.round(tokens / 100_000) / 10}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return String(tokens);
}
