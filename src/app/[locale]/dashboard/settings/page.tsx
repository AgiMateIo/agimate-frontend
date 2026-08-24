'use client';

import { useLocale, useTranslations } from 'next-intl';
import { localeMap } from '@/i18n/routing';
import { useUser } from '@/contexts/UserContext';
import { UserIcon } from '@heroicons/react/24/outline';
import ReferralCard from '@/components/referral/ReferralCard';
import AuthMethodsCard from '@/components/settings/AuthMethodsCard';
import SessionsCard from '@/components/settings/SessionsCard';

export default function SettingsPage() {
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];
  const { user } = useUser();
  const t = useTranslations('Settings');

  const settingsSections = [
    {
      id: 'profile',
      title: t('profile.title'),
      description: t('profile.description'),
      icon: UserIcon,
      items: [
        { label: t('profile.displayName'), value: user?.displayName || t('profile.notSet') },
        { label: t('profile.email'), value: user?.email || t('profile.notSet') },
        {
          label: t('profile.memberSince'),
          value: user?.createdAt
            ? new Date(user.createdAt).toLocaleDateString(bcp47Locale)
            : t('profile.unknown'),
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted mt-1">{t('subtitle')}</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {settingsSections.map((section) => (
          <div key={section.id} className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-surface-secondary">
                  <section.icon className="h-5 w-5 text-muted" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{section.title}</h2>
                  <p className="text-sm text-muted">{section.description}</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-border">
              {section.items.map((item, index) => (
                <div key={index} className="px-5 py-4 flex items-center justify-between">
                  <span className="text-sm text-muted">{item.label}</span>
                  <span className="text-sm font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Also the return address of the provider linking round trip — it
            reads `link_proof` out of the query on mount. */}
        <AuthMethodsCard />

        <SessionsCard />

        <ReferralCard />
      </div>
    </div>
  );
}
