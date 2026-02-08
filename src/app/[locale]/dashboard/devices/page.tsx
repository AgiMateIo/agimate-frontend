'use client';

import { useState } from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Tabs } from '@/components/ui/Tabs';
import ConnectedDevicesTab from '@/components/devices/ConnectedDevicesTab';
import DeviceKeysTab from '@/components/devices/DeviceKeysTab';

export default function DevicesPage() {
  const t = useTranslations('Devices');
  const tCommon = useTranslations('Common');
  const [activeTab, setActiveTab] = useState('devices');

  const tabs = [
    {
      id: 'devices',
      label: t('devicesTab'),
      content: <ConnectedDevicesTab />,
    },
    {
      id: 'device-keys',
      label: t('deviceKeysTab'),
      content: <DeviceKeysTab />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/dashboard" className="text-muted hover:text-foreground transition-colors">
          {tCommon('breadcrumbDashboard')}
        </Link>
        <ChevronRightIcon className="h-4 w-4 text-muted" />
        <span className="text-foreground font-medium">{t('title')}</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted mt-1">{t('subtitle')}</p>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
