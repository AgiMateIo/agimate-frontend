'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs } from '@/components/ui/Tabs';
import ConnectedDevicesTab from '@/components/devices/ConnectedDevicesTab';
import DeviceKeysTab from '@/components/devices/DeviceKeysTab';
import TriggerLogsTab from '@/components/devices/TriggerLogsTab';

export default function DevicesPage() {
  const t = useTranslations('Devices');
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

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
