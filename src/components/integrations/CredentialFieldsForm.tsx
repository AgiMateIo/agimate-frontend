'use client';

import { useState } from 'react';
import { FormField } from '@/components/ui/FormField';
import { PasswordInput } from '@/components/ui/PasswordInput';

// field code → human-readable label
type CredentialFieldsMap = Record<string, string>;

/**
 * Owns the credential values entered for a set of credential fields.
 * `allFieldsFilled` is true once every field has a non-blank value.
 */
export function useCredentialFields(credentialFields: CredentialFieldsMap) {
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const handleFieldChange = (fieldName: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [fieldName]: value }));
  };

  const allFieldsFilled = Object.keys(credentialFields).every(
    (field) => credentials[field]?.trim(),
  );

  const reset = () => setCredentials({});

  return { credentials, setCredentials, handleFieldChange, allFieldsFilled, reset };
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
      {Object.entries(credentialFields).map(([fieldName, label]) => (
        <FormField
          key={fieldName}
          label={label}
          required
          error={fieldErrors[fieldName]}
        >
          <PasswordInput
            value={credentials[fieldName] || ''}
            onChange={(e) => onFieldChange(fieldName, e.target.value)}
            placeholder={`Enter ${label}`}
            required
          />
        </FormField>
      ))}
    </>
  );
}
