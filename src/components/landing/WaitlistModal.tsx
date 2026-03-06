'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import apiService from '@/services/api';

const WAITLIST_EMAIL_KEY = 'waitlist_email';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WaitlistModal({ isOpen, onClose }: WaitlistModalProps) {
  const t = useTranslations('HomePage.waitlist');

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [registrationCode, setRegistrationCode] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Reset showForm when modal reopens (adjust state during render pattern)
  const [prevIsOpen, setPrevIsOpen] = useState(false);
  if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true);
    setShowForm(false);
  } else if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
  }

  const savedEmail = isOpen ? localStorage.getItem(WAITLIST_EMAIL_KEY) : null;

  const { loading, error, fieldErrors, handleSubmit, clearError } = useAsyncForm<{ registrationCode: string }>({
    onSuccess: (result) => {
      localStorage.setItem(WAITLIST_EMAIL_KEY, email.trim());
      setRegistrationCode(result.registrationCode);
    },
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      return await apiService.joinWaitlist({
        email: email.trim(),
        name: name.trim(),
        message: message.trim() || undefined,
      });
    });

  const handleClose = () => {
    if (!loading) {
      setEmail('');
      setName('');
      setMessage('');
      setRegistrationCode(null);
      setShowForm(false);
      clearError();
      onClose();
    }
  };

  const handleUseAnotherEmail = () => {
    setEmail('');
    setName('');
    setMessage('');
    setRegistrationCode(null);
    clearError();
    setShowForm(true);
  };

  const showAlreadyRegistered = savedEmail && !showForm && !registrationCode;

  const modalTitle = registrationCode
    ? t('successTitle')
    : showAlreadyRegistered
      ? t('successTitle')
      : t('title');

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle}>
      {registrationCode ? (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success text-2xl">
              &#10003;
            </div>
          </div>
          <p className="text-lg font-semibold text-foreground">{t('successMessage')}</p>
          <p className="text-muted">{t('successDescription')}</p>
          <Button variant="primary" onClick={handleClose} className="w-full">
            {t('close')}
          </Button>
        </div>
      ) : showAlreadyRegistered ? (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success text-2xl">
              &#10003;
            </div>
          </div>
          <p className="text-lg font-semibold text-foreground">{t('successMessage')}</p>
          <p className="text-muted">
            {t('alreadyRegistered')} <span className="font-medium text-foreground">{savedEmail}</span>
          </p>
          <p className="text-muted">{t('successDescription')}</p>
          <div className="space-y-2">
            <Button variant="primary" onClick={handleClose} className="w-full">
              {t('close')}
            </Button>
            <button
              onClick={handleUseAnotherEmail}
              className="w-full text-sm text-muted hover:text-accent transition-colors"
            >
              {t('useAnotherEmail')}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <Alert variant="info">
            <p className="text-sm">{t('perks')}</p>
          </Alert>

          <FormField label={t('emailLabel')} required error={fieldErrors.email}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              required
            />
          </FormField>

          <FormField label={t('nameLabel')} required error={fieldErrors.name}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              required
            />
          </FormField>

          <FormField label={t('messageLabel')} error={fieldErrors.message}>
            <TextArea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('messagePlaceholder')}
              rows={3}
            />
          </FormField>

          <Button type="submit" loading={loading} className="w-full">
            {t('submit')}
          </Button>
        </form>
      )}
    </Modal>
  );
}
