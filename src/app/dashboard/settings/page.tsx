'use client';

import { useUser } from '@/contexts/UserContext';
import { BellIcon, ShieldCheckIcon, CreditCardIcon, UserIcon } from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const { user } = useUser();

  const settingsSections = [
    {
      id: 'profile',
      title: 'Profile',
      description: 'Manage your account information',
      icon: UserIcon,
      items: [
        { label: 'Display Name', value: user?.displayName || 'Not set' },
        { label: 'Email', value: user?.email || 'Not set' },
        { label: 'Member since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : 'Unknown' },
      ],
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Configure how you receive alerts',
      icon: BellIcon,
      items: [
        { label: 'Email notifications', value: 'Enabled', toggle: true },
        { label: 'Smart Actions alerts', value: 'Critical & High', toggle: true },
        { label: 'Weekly reports', value: 'Enabled', toggle: true },
      ],
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Keep your account secure',
      icon: ShieldCheckIcon,
      items: [
        { label: 'Two-factor authentication', value: 'Disabled', toggle: true },
        { label: 'Active sessions', value: '2 devices' },
        { label: 'Last login', value: user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('ru-RU') : 'Unknown' },
      ],
    },
    {
      id: 'billing',
      title: 'Billing',
      description: 'Manage your subscription',
      icon: CreditCardIcon,
      items: [
        { label: 'Current plan', value: 'Pro' },
        { label: 'Next billing date', value: 'January 15, 2025' },
        { label: 'Payment method', value: '**** 4242' },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted mt-1">Manage your account and preferences</p>
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
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{item.value}</span>
                    {item.toggle && (
                      <button className="text-xs text-accent hover:text-accent/80 font-medium">
                        Change
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="bg-surface rounded-xl border border-error/30 overflow-hidden">
        <div className="p-5 border-b border-error/30 bg-error/5">
          <h2 className="font-semibold text-error">Danger Zone</h2>
          <p className="text-sm text-muted mt-1">Irreversible and destructive actions</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-foreground text-sm">Delete all data</div>
              <div className="text-xs text-muted">Permanently delete all your analytics data</div>
            </div>
            <button className="px-4 py-2 bg-error/10 text-error rounded-lg text-sm font-medium hover:bg-error/20 transition-colors">
              Delete data
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-foreground text-sm">Delete account</div>
              <div className="text-xs text-muted">Permanently delete your account and all data</div>
            </div>
            <button className="px-4 py-2 bg-error text-white rounded-lg text-sm font-medium hover:bg-error/90 transition-colors">
              Delete account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
