'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Tabs } from '@/components/ui/Tabs';
import ConnectedDevicesTab from '@/components/devices/ConnectedDevicesTab';
import DeviceKeysTab from '@/components/devices/DeviceKeysTab';
import TriggerLogsTab from '@/components/devices/TriggerLogsTab';

export default function DevicesPage() {
  const t = useTranslations('Devices');
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState('device-keys');

  const tabs = [
    {
      id: 'device-keys',
      label: t('deviceKeysTab'),
      content: <DeviceKeysTab />,
    },
    {
      id: 'devices',
      label: t('devicesTab'),
      content: <ConnectedDevicesTab />,
    },
    {
      id: 'trigger-logs',
      label: t('triggerLogsTab'),
      content: <TriggerLogsTab />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted mt-1">{t('subtitle')}</p>
      </div>

      {/* Getting Started */}
      <div className="bg-surface rounded-xl border border-border p-6 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t('gettingStartedTitle')}</h2>
        <ol className="list-decimal list-inside text-sm text-muted space-y-1.5">
          <li>{t('gettingStartedStep1')}</li>
          <li>
            {t('gettingStartedStep2')}{' '}
            <Link href={`/${locale}/desktop`} target="_blank" className="text-accent hover:underline">{t('desktopApp')}</Link>
            {' / '}
            <Link href={`/${locale}/android`} target="_blank" className="text-accent hover:underline">{t('androidApp')}</Link>
          </li>
        </ol>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
