'use client';

import { useTranslations } from 'next-intl';
import { formatBytes, getFileExpiry } from '@/utils/files';
import type { UserFileType } from '@/types';

interface NameableFile {
  name: string | null;
  type: UserFileType;
  size: number;
}

// A file's name is genuinely absent for a messenger photo or a generated image.
// The fallback is type + size ("Изображение · 18 КБ") and never the id — an
// `agf_019f…` string tells the user nothing.
export function useFileLabels() {
  const t = useTranslations('Files');

  return {
    displayName: (file: NameableFile): string =>
      file.name?.trim() || `${t(`type_${file.type}`)} · ${formatBytes(file.size)}`,

    // "удалится через 4 дня" / "меньше часа". Retention is invisible otherwise,
    // and a file disappearing on schedule reads as a bug.
    expiryLabel: (expiresAt: string): string => {
      const { stage, count } = getFileExpiry(expiresAt);
      if (stage === 'expired') return t('expired');
      if (stage === 'withinHour') return t('expiresWithinHour');
      if (stage === 'hours') return t('expiresInHours', { count });
      return t('expiresInDays', { count });
    },

    // Bare remaining time ("4 дня") for a table column whose header already
    // says what the number means.
    expiryShortLabel: (expiresAt: string): string => {
      const { stage, count } = getFileExpiry(expiresAt);
      if (stage === 'expired') return t('expiredShort');
      if (stage === 'withinHour') return t('expiresWithinHourShort');
      if (stage === 'hours') return t('expiresInHoursShort', { count });
      return t('expiresInDaysShort', { count });
    },
  };
}
