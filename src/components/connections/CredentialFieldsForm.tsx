'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import type { CredentialFieldSpec } from '@/types';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { PasswordInput } from '@/components/ui/PasswordInput';

// field code → its declaration
type CredentialFieldsMap = Record<string, CredentialFieldSpec>;

// Anything the backend hasn't taught us about is rendered masked: showing a
// server address behind dots is an annoyance, showing a token isn't.
const isSecret = (spec: CredentialFieldSpec) =>
  spec.type !== 'URL' && spec.type !== 'JSON' && spec.type !== 'TEXT';

const isBrokenJson = (spec: CredentialFieldSpec, value: string) => {
  if (spec.type !== 'JSON' || value.trim() === '') return false;
  try {
    JSON.parse(value);
    return false;
  } catch {
    return true;
  }
};

/**
 * Owns the credential values entered for a set of credential fields.
 * `canSubmit` is true once every *required* field has a non-blank value and no
 * JSON field holds something unparseable. `initial` seeds the values (a skill's
 * pre-fills for the instance it wants) — read once, on mount.
 */
export function useCredentialFields(
  credentialFields: CredentialFieldsMap,
  initial?: Record<string, string> | null,
) {
  const [credentials, setCredentials] = useState<Record<string, string>>(() => ({ ...initial }));

  const handleFieldChange = (fieldName: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [fieldName]: value }));
  };

  const entries = Object.entries(credentialFields);

  const allRequiredFilled = entries.every(
    ([field, spec]) => !spec.required || credentials[field]?.trim(),
  );

  // Caught here rather than as a backend 400: the user is looking at the field.
  const brokenJsonFields = entries
    .filter(([field, spec]) => isBrokenJson(spec, credentials[field] ?? ''))
    .map(([field]) => field);

  const reset = () => setCredentials({});

  // Blank fields are dropped, so the backend gets no key at all rather than an
  // empty string for an optional value the user left alone.
  const filledCredentials = () =>
    Object.fromEntries(
      Object.entries(credentials).filter(([, value]) => value.trim() !== ''),
    );

  return {
    credentials,
    setCredentials,
    handleFieldChange,
    canSubmit: allRequiredFilled && brokenJsonFields.length === 0,
    brokenJsonFields,
    filledCredentials,
    reset,
  };
}

interface CredentialFieldsFormProps {
  credentialFields: CredentialFieldsMap;
  credentials: Record<string, string>;
  // server-side validation errors, keyed by field code
  fieldErrors: Record<string, string>;
  onFieldChange: (fieldName: string, value: string) => void;
  // Rendered between the required fields and the collapsed optional ones.
  afterRequired?: ReactNode;
}

/**
 * Required fields up front, optional ones under "advanced settings" — what
 * the user must enter stays the whole visible form (an MCP server's URL, with
 * its token and headers tucked away). The fold opens by itself when it holds
 * a value or an error, so nothing that matters is hidden.
 */
export default function CredentialFieldsForm({
  credentialFields,
  credentials,
  fieldErrors,
  onFieldChange,
  afterRequired,
}: CredentialFieldsFormProps) {
  const t = useTranslations('Connections');

  const entries = Object.entries(credentialFields);
  const required = entries.filter(([, spec]) => spec.required);
  const optional = entries.filter(([, spec]) => !spec.required);
  // Nothing required (or nothing optional) — no point folding anything.
  const fold = required.length > 0 && optional.length > 0;

  const errorOf = (fieldName: string, spec: CredentialFieldSpec) =>
    isBrokenJson(spec, credentials[fieldName] || '') ? t('invalidJson') : fieldErrors[fieldName];

  const [expanded, setExpanded] = useState(() =>
    optional.some(([field]) => credentials[field]?.trim()),
  );
  const optionalHasError = optional.some(([field, spec]) => errorOf(field, spec));

  const renderField = ([fieldName, spec]: [string, CredentialFieldSpec]) => {
    const value = credentials[fieldName] || '';
    const error = errorOf(fieldName, spec);

    return (
      <FormField key={fieldName} label={spec.label} required={spec.required} error={error}>
        {isSecret(spec) ? (
          <PasswordInput
            value={value}
            onChange={(e) => onFieldChange(fieldName, e.target.value)}
            required={spec.required}
          />
        ) : spec.type === 'JSON' ? (
          <TextArea
            value={value}
            onChange={(e) => onFieldChange(fieldName, e.target.value)}
            required={spec.required}
            rows={4}
            spellCheck={false}
            placeholder='{"X-Api-Key": "…"}'
            className="font-mono text-sm"
          />
        ) : (
          <Input
            // `inputMode` rather than `type="url"`: it gets the right
            // mobile keyboard without letting the browser reject a value
            // the backend would have accepted — what counts as a reachable
            // server is decided by the connection test, not by a scheme.
            type="text"
            inputMode={spec.type === 'URL' ? 'url' : undefined}
            value={value}
            onChange={(e) => onFieldChange(fieldName, e.target.value)}
            required={spec.required}
            autoComplete="off"
            spellCheck={false}
            placeholder={spec.type === 'URL' ? 'https://…' : undefined}
          />
        )}
      </FormField>
    );
  };

  if (!fold) {
    return (
      <>
        {entries.map(renderField)}
        {afterRequired}
      </>
    );
  }

  return (
    <>
      {required.map(renderField)}
      {afterRequired}
      <details
        open={expanded || optionalHasError}
        onToggle={(e) => setExpanded(e.currentTarget.open)}
      >
        <summary className="cursor-pointer text-sm font-medium text-muted hover:text-foreground">
          {t('advancedSettings')}
        </summary>
        <div className="mt-3 space-y-4">{optional.map(renderField)}</div>
      </details>
    </>
  );
}
