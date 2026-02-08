'use client';

import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/Alert';

interface ErrorAlertProps {
  children: string;
}

export function ErrorAlert({ children }: ErrorAlertProps) {
  const t = useTranslations('Common');

  const message = t.has(`errors.${children}`)
    ? t(`errors.${children}`)
    : children;

  return <Alert variant="error">{message}</Alert>;
}
