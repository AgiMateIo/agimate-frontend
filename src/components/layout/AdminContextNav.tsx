'use client';

import { useTranslations } from 'next-intl';
import { ShieldCheckIcon, UsersIcon } from '@heroicons/react/24/outline';
import ContextNav, { type ContextSection } from './ContextNav';

type Section = { key: string; labelKey: 'users'; href: string; icon: ContextSection['icon'] };

const SECTIONS: Section[] = [
  { key: 'users', labelKey: 'users', href: '/dashboard/admin/users', icon: UsersIcon },
];

// Administration has no entity to switch between and nothing to fetch — the same
// contextual shell as agents/teams, with a static header and one section.
export default function AdminContextNav({
  currentSection,
  collapsed,
}: {
  currentSection: string;
  collapsed: boolean;
}) {
  const t = useTranslations('Sidebar');

  const sections: ContextSection[] = SECTIONS.map(({ key, labelKey, href, icon }) => ({
    key,
    href,
    label: t(labelKey),
    icon,
  }));

  return (
    <ContextNav
      collapsed={collapsed}
      backHref="/dashboard"
      backLabel={t('dashboard')}
      name={t('administration')}
      fallbackIcon={ShieldCheckIcon}
      sections={sections}
      currentSection={currentSection}
    />
  );
}
