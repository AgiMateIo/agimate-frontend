import type { LlmExtraBody } from '@/types';

// Backend rejects extra_body payloads over 16 KB serialized.
export const EXTRA_BODY_MAX_BYTES = 16 * 1024;

export type ExtraBodyErrorKey = 'extraBodyInvalidJson' | 'extraBodyNotObject' | 'extraBodyTooLarge';

export type ExtraBodyParseResult =
  | { ok: true; value: LlmExtraBody | null }
  | { ok: false; errorKey: ExtraBodyErrorKey };

// Editor text → request value. Empty text means "cleared" (null).
export function parseExtraBodyInput(text: string): ExtraBodyParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true, value: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, errorKey: 'extraBodyInvalidJson' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, errorKey: 'extraBodyNotObject' };
  }
  if (new TextEncoder().encode(JSON.stringify(parsed)).length > EXTRA_BODY_MAX_BYTES) {
    return { ok: false, errorKey: 'extraBodyTooLarge' };
  }
  return { ok: true, value: parsed as LlmExtraBody };
}

export function formatExtraBody(value: LlmExtraBody | null | undefined): string {
  return value && Object.keys(value).length > 0 ? JSON.stringify(value, null, 2) : '';
}

export function hasExtraBody(value: LlmExtraBody | null | undefined): boolean {
  return !!value && Object.keys(value).length > 0;
}
