import { useTranslations } from 'next-intl';
import { ToolJsonSchema } from '@/types';
import { getErrorMessage } from '@/utils/error';

export type ParsedConfigResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string };

export function tryParseJsonObject(text: string): ParsedConfigResult {
  if (!text.trim()) return { ok: true, value: {} };
  try {
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Must be a JSON object' };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch (err) {
    return { ok: false, error: getErrorMessage(err, 'Invalid JSON') };
  }
}

// Seed editable form state for each config property from an existing config value (edit)
// or from empty defaults (create). Object-typed properties are edited as JSON text and
// kept in `jsonText`; everything else lives in `values`.
export function seedConfigState(
  schema: ToolJsonSchema | undefined,
  config: Record<string, unknown>,
): { values: Record<string, unknown>; jsonText: Record<string, string> } {
  const values: Record<string, unknown> = {};
  const jsonText: Record<string, string> = {};
  const props = schema?.properties ?? {};
  for (const [name, prop] of Object.entries(props)) {
    const existing = config[name];
    switch (prop.type) {
      case 'boolean':
        values[name] = typeof existing === 'boolean' ? existing : false;
        break;
      case 'array':
        values[name] = Array.isArray(existing) ? existing.map((v) => String(v)) : [];
        break;
      case 'object':
        jsonText[name] = existing != null ? JSON.stringify(existing, null, 2) : '';
        break;
      case 'integer':
      case 'number':
        values[name] = existing == null ? '' : String(existing);
        break;
      default:
        values[name] = existing == null ? '' : String(existing);
    }
  }
  return { values, jsonText };
}

// Assemble the typed `config` object from the per-property editable state.
export function buildConfig(
  configSchema: ToolJsonSchema | undefined,
  configValues: Record<string, unknown>,
  configJsonText: Record<string, string>,
  rawConfigText: string,
  t: ReturnType<typeof useTranslations>,
): ParsedConfigResult {
  if (!configSchema) {
    return tryParseJsonObject(rawConfigText);
  }
  const required = new Set(configSchema.required ?? []);
  const out: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(configSchema.properties ?? {})) {
    const isRequired = required.has(key);
    switch (prop.type) {
      case 'boolean':
        out[key] = Boolean(configValues[key]);
        break;
      case 'array': {
        const items = (configValues[key] as string[] | undefined) ?? [];
        const trimmed = items.map((s) => s.trim()).filter((s) => s !== '');
        if (prop.items?.type === 'integer' || prop.items?.type === 'number') {
          const nums = trimmed.map(Number);
          if (nums.some((n) => Number.isNaN(n))) {
            return { ok: false, error: `${key}: ${t('invalidNumberList')}` };
          }
          if (nums.length > 0 || isRequired) out[key] = nums;
        } else if (trimmed.length > 0 || isRequired) {
          out[key] = trimmed;
        }
        break;
      }
      case 'integer':
      case 'number': {
        const raw = String(configValues[key] ?? '').trim();
        if (raw === '') {
          if (isRequired) return { ok: false, error: `${key}: ${t('fieldRequired')}` };
          break;
        }
        const n = Number(raw);
        if (Number.isNaN(n)) return { ok: false, error: `${key}: ${t('invalidNumber')}` };
        out[key] = n;
        break;
      }
      case 'object': {
        const parsed = tryParseJsonObject(configJsonText[key] ?? '');
        if (!parsed.ok) return { ok: false, error: `${key}: ${parsed.error}` };
        if (Object.keys(parsed.value).length > 0 || isRequired) out[key] = parsed.value;
        break;
      }
      default: {
        const raw = String(configValues[key] ?? '');
        if (raw.trim() === '' && !isRequired) break;
        out[key] = raw;
      }
    }
  }
  return { ok: true, value: out };
}
