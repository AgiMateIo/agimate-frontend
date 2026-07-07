'use client';

import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/Alert';
import type messages from '../../../messages/en.json';

type BackendErrorCode = Extract<keyof (typeof messages)['Common']['errors'], string>;

interface ErrorAlertProps {
  children: string;
}

export function ErrorAlert({ children }: ErrorAlertProps) {
  const t = useTranslations('Common');

  // Error codes arrive as arbitrary backend strings; t.has guards the cast.
  const code = children as BackendErrorCode;
  const message = t.has(`errors.${code}`) ? t(`errors.${code}`) : children;

  return <Alert variant="error">{message}</Alert>;
}
