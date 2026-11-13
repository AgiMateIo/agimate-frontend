'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type {
  ConnectorPresetForm,
  ConnectorPresetResponse,
  CredentialFieldSpec,
  PresetHeaderField,
  PresetHeaderGroup,
} from '@/types';
import { FormField, Input, Select } from '@/components/ui/FormField';
import { PasswordInput } from '@/components/ui/PasswordInput';

export type PresetAuthMethod = 'OAUTH' | 'TOKEN';

const fieldByName = (form: ConnectorPresetForm, name: string) =>
  form.headerFields.find((field) => field.name === name);

// The seed only creates a secret header when the token is not a Bearer token,
// so a group made entirely of secret headers belongs to the token path too.
const isTokenOnlyGroup = (form: ConnectorPresetForm, group: PresetHeaderGroup) =>
  group.oneOf.every((name) => fieldByName(form, name)?.secret);

function initialGroupChoices(form?: ConnectorPresetForm): Record<string, string> {
  if (!form) return {};
  // A required group starts on its first alternative so its input is visible;
  // an optional one starts empty.
  return Object.fromEntries(
    form.headerGroups
      .filter((group) => group.required)
      .map((group) => [group.id, group.oneOf[0] ?? '']),
  );
}

/**
 * State and validation of the extra inputs a preset adds to the ordinary
 * connection form: the OAuth/token choice, dedicated header fields and the
 * "exactly one of" header groups. Credential fields stay with the form itself.
 */
export function usePresetFields(preset: ConnectorPresetResponse | undefined) {
  const form = preset?.form;
  const methods = form?.authMethods ?? [];
  const hasMethodChoice = methods.includes('OAUTH') && methods.includes('TOKEN');
  const [method, setMethod] = useState<PresetAuthMethod>(
    methods.includes('OAUTH') ? 'OAUTH' : 'TOKEN',
  );
  const [headerValues, setHeaderValues] = useState<Record<string, string>>({});
  const [groupChoices, setGroupChoices] = useState<Record<string, string>>(() =>
    initialGroupChoices(form),
  );

  const tokenVisible =
    !!form && methods.includes('TOKEN') && (!hasMethodChoice || method === 'TOKEN');

  const visibleCredentialFields = useMemo(() => {
    if (!form) return {};
    const fields: Record<string, CredentialFieldSpec> = {};
    for (const [code, spec] of Object.entries(form.credentialFields)) {
      // The URL is shown as text from `params`; the backend already leaves it
      // out of the map, but a later connector type may not.
      if (code === 'url') continue;
      if (code === 'auth_token' && !tokenVisible) continue;
      // Choosing the token path makes the token mandatory even though the
      // backend marks it optional while OAuth is also on offer.
      fields[code] =
        code === 'auth_token' && hasMethodChoice && method === 'TOKEN'
          ? { ...spec, required: true }
          : spec;
    }
    return fields;
  }, [form, tokenVisible, hasMethodChoice, method]);

  const groupMembers = useMemo(
    () => new Set((form?.headerGroups ?? []).flatMap((group) => group.oneOf)),
    [form],
  );

  const visibleHeaderFields = (form?.headerFields ?? []).filter(
    (field) => !groupMembers.has(field.name) && (tokenVisible || !field.secret),
  );
  const visibleGroups = form
    ? form.headerGroups.filter((group) => tokenVisible || !isTokenOnlyGroup(form, group))
    : [];

  const valueOf = (name: string) => headerValues[name] ?? '';

  const complete = (() => {
    if (!form) return true;
    const standalone = visibleHeaderFields.every(
      (field) => !field.required || valueOf(field.name).trim(),
    );
    const groups = visibleGroups.every((group) => {
      if (!group.required) return true;
      const chosen = groupChoices[group.id];
      return !!chosen && !!valueOf(chosen).trim();
    });
    return Boolean(standalone && groups);
  })();

  const setHeaderValue = (name: string, value: string) =>
    setHeaderValues((current) => ({ ...current, [name]: value }));
  const setGroupChoice = (groupId: string, name: string) =>
    setGroupChoices((current) => ({ ...current, [groupId]: name }));

  // `headers` is a JSON string, exactly what a hand-filled MCP form sends.
  // `valuePrefix` is applied here and nowhere else; `keyPrefix` stays a hint.
  const buildHeaders = (): string | null => {
    if (!form) return null;
    const headers: Record<string, string> = {};
    const add = (field: PresetHeaderField | undefined, name: string) => {
      const entered = valueOf(name).trim();
      if (!entered) return;
      headers[name] = `${field?.valuePrefix ?? ''}${entered}`;
    };
    for (const field of visibleHeaderFields) add(field, field.name);
    for (const group of visibleGroups) {
      const name = groupChoices[group.id];
      if (name) add(fieldByName(form, name), name);
    }
    return Object.keys(headers).length > 0 ? JSON.stringify(headers) : null;
  };

  return {
    form,
    method,
    setMethod,
    hasMethodChoice,
    tokenVisible,
    visibleCredentialFields,
    visibleHeaderFields,
    visibleGroups,
    headerValues,
    setHeaderValue,
    groupChoices,
    setGroupChoice,
    complete,
    buildHeaders,
  };
}

export type PresetFieldsState = ReturnType<typeof usePresetFields>;

export function PresetAuthMethodField({ state }: { state: PresetFieldsState }) {
  const t = useTranslations('ConnectorPresets');
  if (!state.hasMethodChoice) return null;
  return (
    <FormField label={t('authMethod')}>
      <Select
        value={state.method}
        onChange={(e) => state.setMethod(e.target.value as PresetAuthMethod)}
      >
        <option value="OAUTH">{t('authMethodOAuth')}</option>
        <option value="TOKEN">{t('authMethodToken')}</option>
      </Select>
    </FormField>
  );
}

function HeaderValueField({
  field,
  value,
  onChange,
}: {
  field: PresetHeaderField;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations('ConnectorPresets');
  const hint = [
    field.valuePrefix ? t('valuePrefixHint', { prefix: field.valuePrefix }) : null,
    field.keyPrefix ? t('keyPrefixHint', { prefix: field.keyPrefix }) : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <FormField label={field.label} required={field.required} hint={hint || undefined}>
      {field.secret ? (
        <PasswordInput value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      )}
    </FormField>
  );
}

function HeaderGroupField({
  group,
  form,
  choice,
  value,
  onChoice,
  onValueChange,
}: {
  group: PresetHeaderGroup;
  form: ConnectorPresetForm;
  choice: string;
  value: string;
  onChoice: (name: string) => void;
  onValueChange: (value: string) => void;
}) {
  const t = useTranslations('ConnectorPresets');
  const field = choice ? fieldByName(form, choice) : undefined;

  return (
    <div className="space-y-2">
      <FormField label={t('headerGroup')} required={group.required}>
        <Select value={choice} onChange={(e) => onChoice(e.target.value)}>
          {!group.required && <option value="">{t('headerGroupNone')}</option>}
          {group.oneOf.map((name) => (
            <option key={name} value={name}>
              {fieldByName(form, name)?.label ?? name}
            </option>
          ))}
        </Select>
      </FormField>
      {field && <HeaderValueField field={field} value={value} onChange={onValueChange} />}
    </div>
  );
}

/** The preset's own header inputs, below the connector's credential fields. */
export function PresetHeaderFields({ state }: { state: PresetFieldsState }) {
  const { form } = state;
  if (!form) return null;
  if (state.visibleHeaderFields.length === 0 && state.visibleGroups.length === 0) return null;

  return (
    <div className="space-y-4">
      {state.visibleHeaderFields.map((field) => (
        <HeaderValueField
          key={field.name}
          field={field}
          value={state.headerValues[field.name] ?? ''}
          onChange={(value) => state.setHeaderValue(field.name, value)}
        />
      ))}
      {state.visibleGroups.map((group) => {
        const choice = state.groupChoices[group.id] ?? '';
        return (
          <HeaderGroupField
            key={group.id}
            group={group}
            form={form}
            choice={choice}
            value={choice ? (state.headerValues[choice] ?? '') : ''}
            onChoice={(name) => state.setGroupChoice(group.id, name)}
            onValueChange={(value) => state.setHeaderValue(choice, value)}
          />
        );
      })}
    </div>
  );
}
