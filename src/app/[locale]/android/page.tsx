'use client';

import { Link } from '@/i18n/navigation';
import { useUser } from '@/contexts/UserContext';
import { useTranslations } from 'next-intl';
import LocaleSwitcher from '@/components/ui/LocaleSwitcher';
import {
  ArrowRightIcon,
  ArrowDownIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  PhoneArrowDownLeftIcon,
  DevicePhoneMobileIcon,
  BellAlertIcon,
  SpeakerWaveIcon,
  BoltIcon,
  PlayIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

export default function AndroidPage() {
  const { user, loading } = useUser();
  const t = useTranslations('AndroidPage');

  const triggers = [
    { key: 'wifi', icon: <WifiIcon className="h-6 w-6" /> },
    { key: 'battery', icon: <ExclamationTriangleIcon className="h-6 w-6" /> },
    { key: 'call', icon: <PhoneArrowDownLeftIcon className="h-6 w-6" /> },
    { key: 'notification', icon: <DevicePhoneMobileIcon className="h-6 w-6" /> },
  ] as const;

  const actions = [
    { key: 'notify', icon: <BellAlertIcon className="h-6 w-6" /> },
    { key: 'tts', icon: <SpeakerWaveIcon className="h-6 w-6" /> },
  ] as const;

  const screens = [
    { key: 'triggers', icon: <BoltIcon className="h-6 w-6" /> },
    { key: 'actions', icon: <PlayIcon className="h-6 w-6" /> },
    { key: 'settings', icon: <Cog6ToothIcon className="h-6 w-6" /> },
  ] as const;

  const howItWorksSteps = t.raw('howItWorks.steps') as Array<{
    title: string;
    description: string;
  }>;

  const installSteps = t.raw('install.steps') as Array<{
    title: string;
    description: string;
  }>;

  const devRequirements = t.raw('developers.requirements') as Array<{
    param: string;
    value: string;
  }>;

  const devPermissions = t.raw('developers.permissions') as string[];

  return (
    <div className="min-h-screen text-foreground">
      {/* Background gradient mesh */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F0EEE9] to-[#F8F7F5] dark:from-[#1a1715] dark:to-[#0f0e0d]" />
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#A47764]/30 dark:bg-[#A47764]/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#A47764]/20 dark:bg-[#A47764]/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#A47764]/10 dark:bg-[#A47764]/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-md bg-background/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight hover:text-accent transition-colors">
            AgiMate
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted">
            <a href="#features" className="hidden sm:inline hover:text-foreground transition-colors">
              {t('nav.features')}
            </a>
            <a href="#how-it-works" className="hidden sm:inline hover:text-foreground transition-colors">
              {t('nav.howItWorks')}
            </a>
            <a href="#interface" className="hidden sm:inline hover:text-foreground transition-colors">
              {t('nav.interface')}
            </a>
            <a href="#install" className="hidden sm:inline hover:text-foreground transition-colors">
              {t('nav.install')}
            </a>
            <LocaleSwitcher />
            {!loading && user ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28 text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          {t('hero.title')}{' '}
          <span className="bg-gradient-to-r from-accent to-purple-400 bg-clip-text text-transparent">
            {t('hero.titleHighlight')}
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          {t('hero.subtitle')}
        </p>
        <div className="mt-10">
          <a
            href="#download"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-7 py-3.5 font-medium text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90 transition-colors"
          >
            {t('hero.cta')}
            <ArrowRightIcon className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Two Modes: Triggers & Actions */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">{t('features.title')}</h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-muted">{t('features.subtitle')}</p>
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Triggers column */}
          <div>
            <h3 className="mb-6 text-xl font-semibold">{t('features.triggersTitle')}</h3>
            <div className="space-y-4">
              {triggers.map((trigger) => (
                <TriggerCard
                  key={trigger.key}
                  icon={trigger.icon}
                  title={t(`features.triggers.${trigger.key}.title`)}
                  description={t(`features.triggers.${trigger.key}.description`)}
                  useCase={t(`features.triggers.${trigger.key}.useCase`)}
                />
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">{t('features.triggersCaption')}</p>
          </div>

          {/* Actions column */}
          <div>
            <h3 className="mb-6 text-xl font-semibold">{t('features.actionsTitle')}</h3>
            <div className="space-y-4">
              {actions.map((action) => (
                <ActionCard
                  key={action.key}
                  icon={action.icon}
                  title={t(`features.actions.${action.key}.title`)}
                  description={t(`features.actions.${action.key}.description`)}
                  useCase={t(`features.actions.${action.key}.useCase`)}
                />
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">{t('features.actionsCaption')}</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">{t('howItWorks.title')}</h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-muted">{t('howItWorks.subtitle')}</p>

        {/* 3-box diagram */}
        <div className="grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <div className="rounded-2xl border border-border/50 bg-surface p-6 text-center">
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">{t('howItWorks.boxes.android')}</div>
            <div className="flex justify-center mb-2">
              <DevicePhoneMobileIcon className="h-8 w-8 text-success" />
            </div>
            <div className="text-sm text-muted">{t('howItWorks.boxes.androidSubtitle')}</div>
          </div>

          <div className="hidden items-center justify-center md:flex">
            <div className="flex flex-col items-center gap-1 text-accent">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted">HTTP</span>
              <div className="flex items-center gap-1">
                <div className="h-px w-8 bg-accent" />
                <ArrowRightIcon className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted">WebSocket</span>
            </div>
          </div>
          <div className="flex items-center justify-center py-2 md:hidden">
            <div className="flex flex-col items-center gap-1 text-accent">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted">HTTP &uarr; / WebSocket &darr;</span>
              <ArrowDownIcon className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl border border-accent/40 bg-accent/5 p-6 text-center shadow-lg shadow-accent/10">
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-accent">{t('howItWorks.boxes.backend')}</div>
            <div className="text-sm font-medium text-muted">{t('howItWorks.boxes.backendSubtitle')}</div>
          </div>

          <div className="hidden items-center justify-center md:flex">
            <div className="flex flex-col items-center gap-1 text-accent">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted">API</span>
              <div className="flex items-center gap-1">
                <div className="h-px w-8 bg-accent" />
                <ArrowRightIcon className="h-4 w-4" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center py-2 md:hidden">
            <ArrowDownIcon className="h-5 w-5 text-accent" />
          </div>

          <div className="rounded-2xl border border-border/50 bg-surface p-6 text-center">
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">{t('howItWorks.boxes.ai')}</div>
            <div className="text-sm text-muted">{t('howItWorks.boxes.aiSubtitle')}</div>
          </div>
        </div>

        {/* Numbered steps */}
        <div className="mt-14 mx-auto max-w-2xl space-y-6">
          {howItWorksSteps.map((step, i) => (
            <div key={i} className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-sm">
                {i + 1}
              </span>
              <div>
                <h4 className="font-semibold">{step.title}</h4>
                <p className="text-sm text-muted">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interface */}
      <section id="interface" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">{t('interface.title')}</h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-muted">{t('interface.subtitle')}</p>
        <div className="grid gap-6 md:grid-cols-3">
          {screens.map((screen) => (
            <ScreenCard
              key={screen.key}
              icon={screen.icon}
              title={t(`interface.screens.${screen.key}.title`)}
              description={t(`interface.screens.${screen.key}.description`)}
              items={t.raw(`interface.screens.${screen.key}.items`) as string[]}
            />
          ))}
        </div>
      </section>

      {/* For Developers */}
      <section id="developers" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">{t('developers.title')}</h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-muted">{t('developers.subtitle')}</p>

        <div className="mx-auto max-w-3xl space-y-4">
          {/* Trigger JSON */}
          <details className="group rounded-2xl border border-border/50 bg-surface transition-colors hover:border-accent/30">
            <summary className="flex cursor-pointer items-center justify-between p-6 text-lg font-semibold [&::-webkit-details-marker]:hidden">
              {t('developers.triggerFormat.title')}
              <span className="text-muted transition-transform group-open:rotate-180">
                <ArrowDownIcon className="h-5 w-5" />
              </span>
            </summary>
            <div className="px-6 pb-6">
              <p className="mb-4 text-sm text-muted">{t('developers.triggerFormat.description')}</p>
              <pre className="overflow-x-auto rounded-lg border border-border/50 bg-background/80 p-4 font-mono text-sm">
                <code>{t('developers.triggerFormat.json')}</code>
              </pre>
            </div>
          </details>

          {/* Action JSON */}
          <details className="group rounded-2xl border border-border/50 bg-surface transition-colors hover:border-accent/30">
            <summary className="flex cursor-pointer items-center justify-between p-6 text-lg font-semibold [&::-webkit-details-marker]:hidden">
              {t('developers.actionFormat.title')}
              <span className="text-muted transition-transform group-open:rotate-180">
                <ArrowDownIcon className="h-5 w-5" />
              </span>
            </summary>
            <div className="px-6 pb-6">
              <p className="mb-4 text-sm text-muted">{t('developers.actionFormat.description')}</p>
              <pre className="overflow-x-auto rounded-lg border border-border/50 bg-background/80 p-4 font-mono text-sm">
                <code>{t('developers.actionFormat.json')}</code>
              </pre>
            </div>
          </details>

          {/* Requirements */}
          <details className="group rounded-2xl border border-border/50 bg-surface transition-colors hover:border-accent/30">
            <summary className="flex cursor-pointer items-center justify-between p-6 text-lg font-semibold [&::-webkit-details-marker]:hidden">
              {t('developers.requirementsTitle')}
              <span className="text-muted transition-transform group-open:rotate-180">
                <ArrowDownIcon className="h-5 w-5" />
              </span>
            </summary>
            <div className="px-6 pb-6">
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full text-left text-sm">
                  <tbody>
                    {devRequirements.map((req) => (
                      <tr key={req.param} className="border-b border-border/30 last:border-0">
                        <td className="px-4 py-3 font-medium">{req.param}</td>
                        <td className="px-4 py-3 text-muted">{req.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 className="mt-6 mb-3 font-semibold">{t('developers.permissionsTitle')}</h4>
              <ul className="space-y-2 text-sm text-muted">
                {devPermissions.map((perm) => (
                  <li key={perm} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                    {perm}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </div>
      </section>

      {/* Installation */}
      <section id="install" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">{t('install.title')}</h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-muted">{t('install.subtitle')}</p>

        <div className="mx-auto max-w-2xl">
          <div className="relative">
            {installSteps.map((step, i) => (
              <TimelineStep
                key={i}
                number={i + 1}
                title={step.title}
                description={step.description}
                isLast={i === installSteps.length - 1}
              >
                {i === 0 && (
                  <a
                    href="#download"
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
                  >
                    {t('install.downloadApk')}
                    <ArrowRightIcon className="h-4 w-4" />
                  </a>
                )}
              </TimelineStep>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Download */}
      <section id="download" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight">{t('download.title')}</h2>
          <p className="mx-auto mb-10 max-w-md text-muted">{t('download.subtitle')}</p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="https://github.com/AgiMateIo/android/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-7 py-3.5 font-medium text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90 transition-colors"
            >
              {t('download.apk')}
              <ArrowRightIcon className="h-4 w-4" />
            </a>
            <a
              href="https://github.com/AgiMateIo/android"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-7 py-3.5 font-medium text-foreground hover:bg-surface-secondary transition-colors"
            >
              {t('download.github')}
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-7 py-3.5 font-medium text-foreground hover:bg-surface-secondary transition-colors"
            >
              {t('download.docs')}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <span className="text-sm text-muted">{t('footer.copyright')}</span>
          <div className="flex items-center gap-6 text-sm text-muted">
            <a href="https://github.com/AgiMateIo/android" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">{t('footer.github')}</a>
            <a href="#" className="hover:text-foreground transition-colors">{t('footer.telegram')}</a>
            <a href="#" className="hover:text-foreground transition-colors">{t('footer.docs')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Local helper components ---------- */

function TriggerCard({
  icon,
  title,
  description,
  useCase,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  useCase: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 border-l-4 border-l-success bg-surface p-6 transition-colors hover:border-accent/30 hover:border-l-success">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
          {icon}
        </div>
        <h4 className="font-semibold">{title}</h4>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-muted">{description}</p>
      <div className="rounded-lg bg-success/5 border border-success/20 px-3 py-2 text-xs text-muted">
        <span className="font-medium text-success">{useCase}</span>
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  useCase,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  useCase: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 border-l-4 border-l-accent bg-surface p-6 transition-colors hover:border-accent/30 hover:border-l-accent">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          {icon}
        </div>
        <h4 className="font-semibold">{title}</h4>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-muted">{description}</p>
      <div className="rounded-lg bg-accent/5 border border-accent/20 px-3 py-2 text-xs text-muted">
        <span className="font-medium text-accent">{useCase}</span>
      </div>
    </div>
  );
}

function ScreenCard({
  icon,
  title,
  description,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-surface p-6 transition-colors hover:border-accent/30">
      <div className="mb-6 flex h-40 items-center justify-center rounded-xl bg-background/80 border border-border/30">
        <div className="text-accent/40">{icon}</div>
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="mb-4 text-sm text-muted">{description}</p>
      <ul className="space-y-2 text-sm text-muted">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TimelineStep({
  number,
  title,
  description,
  isLast,
  children,
}: {
  number: number;
  title: string;
  description: string;
  isLast: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      {/* Line */}
      {!isLast && (
        <div className="absolute left-4 top-10 bottom-0 w-px bg-border/50" />
      )}
      {/* Number */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-sm relative z-10">
        {number}
      </div>
      {/* Content */}
      <div className="pt-0.5">
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm text-muted">{description}</p>
        {children}
      </div>
    </div>
  );
}
