'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingBackground from '@/components/landing/LandingBackground';
import LandingFooter from '@/components/landing/LandingFooter';
import WaitlistModal from '@/components/landing/WaitlistModal';
import {
  ArrowRightIcon,
  ArrowDownIcon,
  FolderIcon,
  Squares2X2Icon,
  BellAlertIcon,
  SpeakerWaveIcon,
  BoltIcon,
  PlayIcon,
  ComputerDesktopIcon,
  Cog6ToothIcon,
  PuzzlePieceIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const useCaseIcons = [
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  SpeakerWaveIcon,
  ComputerDesktopIcon,
  ChartBarIcon,
  Squares2X2Icon,
];

export default function DesktopPage() {
  const t = useTranslations('DesktopPage');
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  const triggers = [
    { key: 'fileWatcher', icon: <FolderIcon className="h-6 w-6" /> },
    { key: 'quickButtons', icon: <Squares2X2Icon className="h-6 w-6" /> },
  ] as const;

  const actions = [
    { key: 'notifications', icon: <BellAlertIcon className="h-6 w-6" /> },
    { key: 'tts', icon: <SpeakerWaveIcon className="h-6 w-6" /> },
  ] as const;

  const screens = [
    { key: 'tray', icon: <ComputerDesktopIcon className="h-6 w-6" /> },
    { key: 'settings', icon: <Cog6ToothIcon className="h-6 w-6" /> },
    { key: 'pluginsTab', icon: <PuzzlePieceIcon className="h-6 w-6" /> },
  ] as const;

  const howItWorksSteps = t.raw('howItWorks.steps') as Array<{
    title: string;
    description: string;
  }>;

  const installSteps = t.raw('install.steps') as Array<{
    title: string;
    description: string;
  }>;

  const useCaseItems = t.raw('useCases.items') as Array<{
    title: string;
    description: string;
    flow: string[];
  }>;

  const specRows = t.raw('specs.rows') as Array<{
    param: string;
    value: string;
  }>;

  const comparisonRows = t.raw('plugins.comparison.rows') as Array<{
    param: string;
    trigger: string;
    action: string;
  }>;

  return (
    <div className="min-h-screen text-foreground">
      {/* Background gradient mesh */}
      <LandingBackground />
      <WaitlistModal isOpen={isWaitlistOpen} onClose={() => setIsWaitlistOpen(false)} />

      {/* Header */}
      <LandingHeader
        navLinks={[
          { href: '#features', label: t('nav.features') },
          { href: '#plugins', label: t('nav.plugins') },
          { href: '#specs', label: t('nav.specs') },
          { href: '#install', label: t('nav.install') },
        ]}
        loginLabel={t('nav.login')}
        dashboardLabel={t('nav.dashboard')}
        onWaitlistClick={() => setIsWaitlistOpen(true)}
        waitlistLabel={t('nav.waitlist')}
      />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 pt-14 sm:pb-20 sm:pt-16 md:pt-28 md:pb-24 text-center">
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
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-7 py-3.5 font-medium text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90 transition-colors w-full sm:w-auto justify-center"
          >
            {t('hero.cta')}
            <ArrowRightIcon className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">{t('howItWorks.title')}</h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">{t('howItWorks.subtitle')}</p>

        {/* 3-box diagram */}
        <div className="grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <div className="rounded-2xl border border-border/50 bg-surface p-4 sm:p-6 text-center shadow-card">
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">{t('howItWorks.boxes.pc')}</div>
            <div className="flex justify-center mb-2">
              <ComputerDesktopIcon className="h-8 w-8 text-warning" />
            </div>
            <div className="text-sm text-muted">{t('howItWorks.boxes.pcSubtitle')}</div>
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

          <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4 sm:p-6 text-center shadow-lg shadow-accent/10">
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-accent">{t('howItWorks.boxes.desktop')}</div>
            <div className="text-sm font-medium text-muted">{t('howItWorks.boxes.desktopSubtitle')}</div>
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

          <div className="rounded-2xl border border-border/50 bg-surface p-4 sm:p-6 text-center shadow-card">
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

      {/* Built-in Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">{t('features.title')}</h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">{t('features.subtitle')}</p>
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Triggers column */}
          <div>
            <h3 className="mb-6 text-xl font-semibold">{t('features.triggersTitle')}</h3>
            <div className="space-y-4">
              {triggers.map((trigger) => (
                <FeatureCard
                  key={trigger.key}
                  variant="trigger"
                  icon={trigger.icon}
                  title={t(`features.triggers.${trigger.key}.title`)}
                  description={t(`features.triggers.${trigger.key}.description`)}
                  features={t.raw(`features.triggers.${trigger.key}.features`) as string[]}
                />
              ))}
            </div>
          </div>

          {/* Actions column */}
          <div>
            <h3 className="mb-6 text-xl font-semibold">{t('features.actionsTitle')}</h3>
            <div className="space-y-4">
              {actions.map((action) => (
                <FeatureCard
                  key={action.key}
                  variant="action"
                  icon={action.icon}
                  title={t(`features.actions.${action.key}.title`)}
                  description={t(`features.actions.${action.key}.description`)}
                  features={t.raw(`features.actions.${action.key}.features`) as string[]}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Plugin System */}
      <section id="plugins" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">{t('plugins.title')}</h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">{t('plugins.subtitle')}</p>

        {/* Two plugin type cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border/50 border-t-4 border-t-warning bg-surface p-4 sm:p-6 shadow-card transition-colors hover:border-accent/30">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <BoltIcon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{t('plugins.types.trigger.title')}</h3>
            </div>
            <p className="mb-3 text-sm leading-relaxed text-muted">{t('plugins.types.trigger.description')}</p>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="rounded bg-warning/10 px-2 py-1 font-medium text-warning">{t('plugins.types.trigger.direction')}</span>
              <span>{t('plugins.types.trigger.examples')}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 border-t-4 border-t-accent bg-surface p-4 sm:p-6 shadow-card transition-colors hover:border-accent/30">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <PlayIcon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{t('plugins.types.action.title')}</h3>
            </div>
            <p className="mb-3 text-sm leading-relaxed text-muted">{t('plugins.types.action.description')}</p>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="rounded bg-accent/10 px-2 py-1 font-medium text-accent">{t('plugins.types.action.direction')}</span>
              <span>{t('plugins.types.action.examples')}</span>
            </div>
          </div>
        </div>

        {/* Comparison table - desktop */}
        <div className="mt-10 hidden md:block overflow-x-auto rounded-2xl border border-border/50 bg-surface shadow-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-6 py-4 font-medium text-muted">{t('plugins.comparison.headers.param')}</th>
                <th className="px-6 py-4 font-medium text-warning">{t('plugins.comparison.headers.trigger')}</th>
                <th className="px-6 py-4 font-medium text-accent">{t('plugins.comparison.headers.action')}</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.param} className="border-b border-border/30 last:border-0">
                  <td className="px-6 py-3 font-medium">{row.param}</td>
                  <td className="px-6 py-3 text-muted">{row.trigger}</td>
                  <td className="px-6 py-3 text-muted">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mt-10 space-y-4 md:hidden">
          {comparisonRows.map((row) => (
            <div key={row.param} className="rounded-2xl border border-border/50 bg-surface p-4 shadow-card">
              <div className="mb-2 font-medium">{row.param}</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs font-medium text-warning mb-1">{t('plugins.comparison.headers.trigger')}</div>
                  <div className="text-muted">{row.trigger}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-accent mb-1">{t('plugins.comparison.headers.action')}</div>
                  <div className="text-muted">{row.action}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Code examples */}
        <div className="mt-10 mx-auto max-w-3xl space-y-4">
          <details className="group rounded-2xl border border-border/50 bg-surface shadow-card transition-colors hover:border-accent/30">
            <summary className="flex cursor-pointer items-center justify-between p-4 sm:p-6 text-lg font-semibold [&::-webkit-details-marker]:hidden">
              {t('plugins.triggerCode.title')}
              <span className="text-muted transition-transform group-open:rotate-180">
                <ArrowDownIcon className="h-5 w-5" />
              </span>
            </summary>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              <pre className="overflow-x-auto rounded-lg border border-border/50 bg-background/80 p-3 sm:p-4 font-mono text-xs sm:text-sm">
                <code>{t('plugins.triggerCode.code')}</code>
              </pre>
            </div>
          </details>

          <details className="group rounded-2xl border border-border/50 bg-surface shadow-card transition-colors hover:border-accent/30">
            <summary className="flex cursor-pointer items-center justify-between p-4 sm:p-6 text-lg font-semibold [&::-webkit-details-marker]:hidden">
              {t('plugins.actionCode.title')}
              <span className="text-muted transition-transform group-open:rotate-180">
                <ArrowDownIcon className="h-5 w-5" />
              </span>
            </summary>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              <pre className="overflow-x-auto rounded-lg border border-border/50 bg-background/80 p-3 sm:p-4 font-mono text-xs sm:text-sm">
                <code>{t('plugins.actionCode.code')}</code>
              </pre>
            </div>
          </details>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">{t('useCases.title')}</h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">{t('useCases.subtitle')}</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {useCaseItems.map((item, index) => {
            const Icon = useCaseIcons[index];
            return (
              <UseCaseCard
                key={item.title}
                icon={<Icon className="h-5 w-5" />}
                title={item.title}
                description={item.description}
                flow={item.flow}
              />
            );
          })}
        </div>
      </section>

      {/* Technical Specs */}
      <section id="specs" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">{t('specs.title')}</h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">{t('specs.subtitle')}</p>
        <div className="mx-auto max-w-2xl overflow-x-auto rounded-2xl border border-border/50 bg-surface shadow-card">
          <table className="w-full text-left text-sm">
            <tbody>
              {specRows.map((row) => (
                <tr key={row.param} className="border-b border-border/30 last:border-0">
                  <td className="px-4 py-2.5 sm:px-6 sm:py-3 font-medium">{row.param}</td>
                  <td className="px-4 py-2.5 sm:px-6 sm:py-3 text-muted">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Interface */}
      <section id="interface" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">{t('interface.title')}</h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">{t('interface.subtitle')}</p>
        <div className="grid gap-6 md:grid-cols-3">
          {screens.map((screen) => (
            <InterfaceCard
              key={screen.key}
              icon={screen.icon}
              title={t(`interface.screens.${screen.key}.title`)}
              description={t(`interface.screens.${screen.key}.description`)}
              items={t.raw(`interface.screens.${screen.key}.items`) as string[]}
            />
          ))}
        </div>
      </section>

      {/* Installation */}
      <section id="install" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">{t('install.title')}</h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">{t('install.subtitle')}</p>

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
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href="https://github.com/AgiMateIo/desktop/releases/latest"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors w-full sm:w-auto justify-center"
                    >
                      {t('install.platforms.macos')}
                    </a>
                    <a
                      href="https://github.com/AgiMateIo/desktop/releases/latest"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-secondary transition-colors w-full sm:w-auto justify-center"
                    >
                      {t('install.platforms.windows')}
                    </a>
                    <a
                      href="https://github.com/AgiMateIo/desktop/releases/latest"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-secondary transition-colors w-full sm:w-auto justify-center"
                    >
                      {t('install.platforms.linux')}
                    </a>
                  </div>
                )}
              </TimelineStep>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Download */}
      <section id="download" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="text-center">
          <h2 className="mb-4 text-2xl sm:text-3xl font-bold tracking-tight">{t('download.title')}</h2>
          <p className="mx-auto mb-10 max-w-md text-muted">{t('download.subtitle')}</p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="https://github.com/AgiMateIo/desktop/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-7 py-3.5 font-medium text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90 transition-colors w-full sm:w-auto justify-center"
            >
              {t('download.downloadButton')}
              <ArrowRightIcon className="h-4 w-4" />
            </a>
            <a
              href="https://github.com/AgiMateIo/desktop"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-7 py-3.5 font-medium text-foreground hover:bg-surface-secondary transition-colors w-full sm:w-auto justify-center"
            >
              {t('download.github')}
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-7 py-3.5 font-medium text-foreground hover:bg-surface-secondary transition-colors w-full sm:w-auto justify-center"
            >
              {t('download.docs')}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <LandingFooter
        copyright={t('footer.copyright')}
        links={[
          { label: t('footer.github'), href: 'https://github.com/AgiMateIo/desktop', external: true },
          { label: t('footer.telegram'), href: '#' },
          { label: t('footer.docs'), href: '#' },
        ]}
      />
    </div>
  );
}

/* ---------- Local helper components ---------- */

function FeatureCard({
  variant,
  icon,
  title,
  description,
  features,
}: {
  variant: 'trigger' | 'action';
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
}) {
  const isTrigger = variant === 'trigger';
  const borderColor = isTrigger ? 'border-l-warning' : 'border-l-accent';
  const iconBg = isTrigger ? 'bg-warning/10 text-warning' : 'bg-accent/10 text-accent';
  const hoverBorder = isTrigger ? 'hover:border-l-warning' : 'hover:border-l-accent';

  return (
    <div className={`rounded-2xl border border-border/50 border-l-4 ${borderColor} bg-surface p-4 sm:p-6 shadow-card transition-colors hover:border-accent/30 ${hoverBorder}`}>
      <div className="mb-3 flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <h4 className="font-semibold">{title}</h4>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-muted">{description}</p>
      <ul className="space-y-2 text-sm text-muted">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${isTrigger ? 'bg-warning/60' : 'bg-accent/60'}`} />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

function UseCaseCard({
  icon,
  title,
  description,
  flow,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  flow: string[];
}) {
  return (
    <div className="group rounded-2xl border border-border/50 bg-surface p-4 sm:p-6 shadow-card transition-colors hover:border-accent/30">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          {icon}
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-muted">{description}</p>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-mono text-xs text-muted">
        {flow.map((step, i) => (
          <span key={step} className="flex items-center gap-1.5 sm:gap-2">
            <span className="rounded bg-accent/10 px-2 py-1 text-accent">{step}</span>
            {i < flow.length - 1 && <span className="text-accent/60">&rarr;</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function InterfaceCard({
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
    <div className="rounded-2xl border border-border/50 bg-surface p-4 sm:p-6 shadow-card transition-colors hover:border-accent/30">
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
