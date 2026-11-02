'use client';

import { useTranslations } from 'next-intl';
import { CpuChipIcon, RectangleStackIcon, ShieldCheckIcon, SparklesIcon, UsersIcon } from '@heroicons/react/24/outline';
import ContextNav, { type ContextSection } from './ContextNav';

type Section = {
  key: string;
  labelKey: 'users' | 'presets' | 'platformProviders' | 'platformLlms';
  href: string;
  icon: ContextSection['icon'];
};

const SECTIONS: Section[] = [
  { key: 'users', labelKey: 'users', href: '/dashboard/admin/users', icon: UsersIcon },
  { key: 'presets', labelKey: 'presets', href: '/dashboard/admin/presets', icon: RectangleStackIcon },
  { key: 'platform-providers', labelKey: 'platformProviders', href: '/dashboard/admin/platform-providers', icon: SparklesIcon },
  { key: 'platform-llms', labelKey: 'platformLlms', href: '/dashboard/admin/platform-llms', icon: CpuChipIcon },
];

// Administration has no entity to switch between and nothing to fetch — the same
// contextual shell as agents/teams, with a static header and static sections.
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
