'use client';

import { useTranslations } from 'next-intl';
import { LlmMediaTransport } from '@/types';
import { FormField, Select } from '@/components/ui/FormField';

// '' = leave the field out of the request and let the backend default apply
// (CHAT_MODALITIES). Kept distinct from an explicit CHAT_MODALITIES so an untouched
// form never rewrites a value the user did not choose.
export type MediaTransportChoice = LlmMediaTransport | '';

interface MediaTransportFieldProps {
  value: MediaTransportChoice;
  onChange: (value: MediaTransportChoice) => void;
  disabled?: boolean;
}

// Sits next to the base URL: which request shape this provider wants for image
// generation. Deliberately visible rather than inferred — see LlmMediaTransport.
export function MediaTransportField({ value, onChange, disabled }: MediaTransportFieldProps) {
  const t = useTranslations('LlmProviders');

  return (
    <FormField label={t('mediaTransport')} hint={t('mediaTransportHint')}>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as MediaTransportChoice)}
        disabled={disabled}
      >
        <option value="">{t('mediaTransportDefault')}</option>
        <option value="CHAT_MODALITIES">{t('mediaTransportChat')}</option>
        <option value="MEDIA_ENDPOINT">{t('mediaTransportMedia')}</option>
      </Select>
    </FormField>
  );
}
