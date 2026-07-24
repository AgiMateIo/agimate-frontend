'use client';

import { useState } from 'react';
import { FormField } from '@/components/ui/FormField';
import { PasswordInput } from '@/components/ui/PasswordInput';

// field code → human-readable label
type CredentialFieldsMap = Record<string, string>;

// Optionality is carried in the label text (the backend schema has no
// `required` flag yet): `"Bearer token (optional)"`. Unmarked = required.
const OPTIONAL_LABEL_RE = /\((optional|необязательно|опционально)\)\s*$/i;

export function isOptionalCredentialField(label: string) {
  return OPTIONAL_LABEL_RE.test(label);
}

/**
 * Owns the credential values entered for a set of credential fields.
 * `allFieldsFilled` is true once every *required* field has a non-blank value.
 */
export function useCredentialFields(credentialFields: CredentialFieldsMap) {
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const handleFieldChange = (fieldName: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [fieldName]: value }));
  };

  const allFieldsFilled = Object.entries(credentialFields).every(
    ([field, label]) => isOptionalCredentialField(label) || credentials[field]?.trim(),
  );

  const reset = () => setCredentials({});

  // Blank optional fields are dropped, so the backend gets no key at all
  // rather than an empty string.
  const filledCredentials = () =>
    Object.fromEntries(
      Object.entries(credentials).filter(([, value]) => value.trim() !== ''),
    );

  return {
    credentials,
    setCredentials,
    handleFieldChange,
    allFieldsFilled,
    filledCredentials,
    reset,
  };
}

interface CredentialFieldsFormProps {
  // field code → human-readable label
  credentialFields: CredentialFieldsMap;
  credentials: Record<string, string>;
  fieldErrors: Record<string, string>;
  onFieldChange: (fieldName: string, value: string) => void;
}

export default function CredentialFieldsForm({
  credentialFields,
  credentials,
  fieldErrors,
  onFieldChange,
}: CredentialFieldsFormProps) {
  return (
    <>
      {Object.entries(credentialFields).map(([fieldName, label]) => {
        const optional = isOptionalCredentialField(label);
        return (
          <FormField
            key={fieldName}
            label={label}
            required={!optional}
            error={fieldErrors[fieldName]}
          >
            <PasswordInput
              value={credentials[fieldName] || ''}
              onChange={(e) => onFieldChange(fieldName, e.target.value)}
              placeholder={`Enter ${label}`}
              required={!optional}
            />
          </FormField>
        );
      })}
    </>
  );
}
