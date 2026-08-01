'use client';

import { useState } from 'react';
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
 * JSON field holds something unparseable.
 */
export function useCredentialFields(credentialFields: CredentialFieldsMap) {
  const [credentials, setCredentials] = useState<Record<string, string>>({});

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
}

export default function CredentialFieldsForm({
  credentialFields,
  credentials,
  fieldErrors,
  onFieldChange,
}: CredentialFieldsFormProps) {
  const t = useTranslations('Connections');

  return (
    <>
      {Object.entries(credentialFields).map(([fieldName, spec]) => {
        const value = credentials[fieldName] || '';
        const error = isBrokenJson(spec, value) ? t('invalidJson') : fieldErrors[fieldName];

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
      })}
    </>
  );
}
