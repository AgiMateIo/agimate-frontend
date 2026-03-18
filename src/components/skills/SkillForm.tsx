'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SkillType } from '@/types';
import { Button } from '@/components/ui/Button';
import { FormField, TextArea } from '@/components/ui/FormField';
import { Toggle } from '@/components/ui/Toggle';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

interface SkillFormProps {
  initialSkillMd?: string;
  initialType?: SkillType;
  initialIsPublic?: boolean;
  loading: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
  submitLabel: string;
  onSubmit: (e: React.FormEvent, data: { skillMd: string; type: SkillType; isPublic: boolean }) => void;
  onCancel: () => void;
}

export default function SkillForm({
  initialSkillMd = '',
  initialType = 'COMMON',
  initialIsPublic = false,
  loading,
  error,
  fieldErrors,
  submitLabel,
  onSubmit,
  onCancel,
}: SkillFormProps) {
  const t = useTranslations('Skills');

  const [skillMd, setSkillMd] = useState(initialSkillMd);
  const [type, setType] = useState<SkillType>(initialType);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [lastInitials, setLastInitials] = useState({ initialSkillMd, initialType, initialIsPublic });

  // Sync local state when initial values change (e.g. after async fetch completes)
  if (initialSkillMd !== lastInitials.initialSkillMd ||
      initialType !== lastInitials.initialType ||
      initialIsPublic !== lastInitials.initialIsPublic) {
    setLastInitials({ initialSkillMd, initialType, initialIsPublic });
    setSkillMd(initialSkillMd);
    setType(initialType);
    setIsPublic(initialIsPublic);
  }

  const getFieldError = (prefix: string) =>
    Object.entries(fieldErrors)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value)
      .join('; ')
    || '';

  const handleSubmit = (e: React.FormEvent) => {
    onSubmit(e, { skillMd, type, isPublic });
  };

  const typeOptions: { value: SkillType; label: string }[] = [
    { value: 'COMMON', label: t('typeCommon') },
    { value: 'TRIGGER', label: t('typeTrigger') },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label={t('type')} required error={getFieldError('type')}>
        <div className="space-y-2">
          {typeOptions.map((option) => (
            <label key={option.value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="type"
                value={option.value}
                checked={type === option.value}
                onChange={() => setType(option.value)}
                className="accent-accent"
              />
              <span className="text-sm text-foreground">{option.label}</span>
            </label>
          ))}
        </div>
      </FormField>

      <FormField label={t('isPublic')} hint={t('isPublicHint')}>
        <Toggle
          checked={isPublic}
          onChange={setIsPublic}
        />
      </FormField>

      <FormField
        label={t('skillMd')}
        required
        error={getFieldError('skillMd')}
        hint={t('skillMdHint')}
      >
        <TextArea
          value={skillMd}
          onChange={(e) => setSkillMd(e.target.value)}
          placeholder={t('skillMdPlaceholder')}
          rows={16}
          required
          className="font-mono text-sm"
        />
      </FormField>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          disabled={loading || !skillMd.trim()}
          loading={loading}
          className="flex-1"
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
