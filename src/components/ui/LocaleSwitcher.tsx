'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';

export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: 'ru' | 'en') => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-1 bg-surface-secondary rounded-lg p-0.5">
      <button
        onClick={() => switchLocale('ru')}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
          locale === 'ru'
            ? 'bg-accent text-accent-foreground'
            : 'text-muted hover:text-foreground'
        }`}
      >
        RU
      </button>
      <button
        onClick={() => switchLocale('en')}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
          locale === 'en'
            ? 'bg-accent text-accent-foreground'
            : 'text-muted hover:text-foreground'
        }`}
      >
        EN
      </button>
    </div>
  );
}
