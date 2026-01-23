'use client';

import { useState } from 'react';
import apiService from '@/services/api';
import { ConnectorInfo, Credential } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface AddCredentialModalProps {
  connector: ConnectorInfo;
  onClose: () => void;
  onSuccess: (credential: Credential) => void;
}

export default function AddCredentialModal({ connector, onClose, onSuccess }: AddCredentialModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [credentialData, setCredentialData] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { loading, error, handleSubmit, setError } = useAsyncForm<Credential>({
    onSuccess,
    defaultError: 'Failed to create credential',
  });

  const handleCredentialFieldChange = (fieldName: string, value: string) => {
    setCredentialData(prev => ({ ...prev, [fieldName]: value }));
  };

  const allRequiredFieldsFilled = () => {
    return connector.requiredCredentialFields.every(field => credentialData[field]?.trim());
  };

  const handleTest = async () => {
    if (!name.trim() || !allRequiredFieldsFilled()) {
      setError('Please fill all required fields before testing');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      // Create temporary credential for testing
      const tempCredential = await apiService.createCredential(connector.code, {
        name: `[TEST] ${name}`,
        description: 'Temporary credential for testing',
        data: credentialData,
      });

      // TODO: implement credentials checker
      const result = {
        success: true,
        error: null
      }

      // Delete temporary credential
      await apiService.deleteCredential(connector.code, tempCredential.id);

      setTestResult({
        success: result.success,
        message: result.success ? 'Connection successful!' : result.error || 'Connection failed',
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.createCredential(connector.code, {
        name,
        description: description || undefined,
        data: credentialData,
      })
    );

  return (
    <Modal isOpen={true} onClose={onClose} title={`Add Credential for ${connector.name}`}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Name" required>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Credential"
            required
            maxLength={100}
          />
        </FormField>

        <FormField label="Description">
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            maxLength={500}
            rows={2}
          />
        </FormField>

        {/* Dynamic Credential Fields */}
        {connector.requiredCredentialFields.map(fieldName => (
          <FormField key={fieldName} label={`${fieldName.charAt(0).toUpperCase()}${fieldName.slice(1)}`} required>
            <Input
              type="password"
              value={credentialData[fieldName] || ''}
              onChange={(e) => handleCredentialFieldChange(fieldName, e.target.value)}
              placeholder={`Enter ${fieldName}`}
              required
            />
          </FormField>
        ))}

        {testResult && (
          <Alert variant={testResult.success ? 'success' : 'error'}>
            {testResult.message}
          </Alert>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleTest}
            disabled={testing || loading || !name.trim() || !allRequiredFieldsFilled()}
            loading={testing}
            className="flex-1"
          >
            Test Connection
          </Button>
          <Button
            type="submit"
            disabled={loading || testing || !name.trim() || !allRequiredFieldsFilled()}
            loading={loading}
            className="flex-1"
          >
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
