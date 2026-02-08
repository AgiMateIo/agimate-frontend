'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';

const locales = [
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
] as const;

export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const switchLocale = (newLocale: string) => {
    if (newLocale !== locale) {
      router.replace(pathname, { locale: newLocale as 'ru' | 'en' });
    }
    setOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-2 py-1 rounded-lg bg-surface-secondary text-xs font-medium text-muted hover:text-foreground transition-colors"
      >
        {locale.toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 rounded-lg bg-surface-secondary shadow-lg border border-border py-1 z-50 min-w-[48px]">
          {locales.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => switchLocale(code)}
              className={`block w-full px-3 py-1 text-xs font-medium transition-colors ${
                code === locale
                  ? 'text-accent'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
