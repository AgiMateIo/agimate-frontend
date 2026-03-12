'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingBackground from '@/components/landing/LandingBackground';
import LandingFooter from '@/components/landing/LandingFooter';
import WaitlistModal from '@/components/landing/WaitlistModal';
import { useClipboard } from '@/hooks/useClipboard';
import {
  ArrowRightIcon,
  BoltIcon,
  CpuChipIcon,
  DevicePhoneMobileIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  CommandLineIcon,
  Cog6ToothIcon,
  PlusCircleIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

export default function N8nPage() {
  const t = useTranslations('N8nPage');
  const { copied, copy } = useClipboard();
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  const nodeCards = [
    {
      key: 'trigger',
      borderColor: 'border-t-warning',
      iconBg: 'bg-warning/10 text-warning',
      icon: <BoltIcon className="h-6 w-6" />,
    },
    {
      key: 'connectors',
      borderColor: 'border-t-accent',
      iconBg: 'bg-accent/10 text-accent',
      icon: <CpuChipIcon className="h-6 w-6" />,
    },
    {
      key: 'mobile',
      borderColor: 'border-t-success',
      iconBg: 'bg-success/10 text-success',
      icon: <DevicePhoneMobileIcon className="h-6 w-6" />,
    },
  ] as const;

  const exampleItems = t.raw('examples.items') as Array<{
    title: string;
    description: string;
    flow: string[];
  }>;

  const eventItems = t.raw('eventTypes.items') as Array<{
    event: string;
    description: string;
    source: string;
  }>;

  const setupSteps = t.raw('setup.steps') as Array<{
    title: string;
    description: string;
  }>;

  const installUiSteps = t.raw('install.ui.steps') as string[];

  const aiTools = t.raw('aiTools.tools') as string[];

  return (
    <div className="min-h-screen text-foreground">
      <LandingBackground />
      <WaitlistModal isOpen={isWaitlistOpen} onClose={() => setIsWaitlistOpen(false)} />

      <LandingHeader
        navLinks={[
          { href: '#nodes', label: t('nav.nodes') },
          { href: '#setup', label: t('nav.setup') },
          { href: '#examples', label: t('nav.examples') },
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
            href="#install"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-7 py-3.5 font-medium text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90 transition-colors w-full sm:w-auto justify-center"
          >
            {t('hero.cta')}
            <ArrowRightIcon className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Three Nodes */}
      <section id="nodes" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">{t('nodes.title')}</h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">{t('nodes.subtitle')}</p>
        <div className="grid gap-6 md:grid-cols-3">
          {nodeCards.map((card) => {
            const features = t.raw(`nodes.${card.key}.features`) as string[];
            const useCase = t.raw(`nodes.${card.key}.useCase`) as string[];
            return (
              <NodeCard
                key={card.key}
                borderColor={card.borderColor}
                icon={card.icon}
                iconBg={card.iconBg}
                title={t(`nodes.${card.key}.title`)}
                description={t(`nodes.${card.key}.description`)}
                features={features}
                useCaseLabel={t(`nodes.${card.key}.useCaseLabel`)}
                useCase={useCase}
              />
            );
          })}
        </div>
      </section>

      {/* Setup in 3 Steps */}
      <section id="setup" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">{t('setup.title')}</h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">{t('setup.subtitle')}</p>
        <div className="grid gap-6 md:grid-cols-3">
          {setupSteps.map((step, index) => (
            <SetupStep
              key={index}
              number={index + 1}
              title={step.title}
              description={step.description}
              icon={index === 0 ? <CommandLineIcon className="h-5 w-5" /> : index === 1 ? <Cog6ToothIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
            >
              {index === 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-background/80 border border-border/50 px-4 py-3">
                  <code className="flex-1 text-sm font-mono text-accent truncate">
                    {t('setup.npmCommand')}
                  </code>
                  <button
                    onClick={() => copy(t('setup.npmCommand'))}
                    className="shrink-0 text-muted hover:text-foreground transition-colors"
                    title={copied ? t('setup.copied') : t('setup.copy')}
                  >
                    {copied ? (
                      <ClipboardDocumentCheckIcon className="h-5 w-5 text-success" />
                    ) : (
                      <ClipboardDocumentIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              )}
            </SetupStep>
          ))}
        </div>
      </section>

      {/* Workflow Examples */}
      <section id="examples" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">{t('examples.title')}</h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">{t('examples.subtitle')}</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {exampleItems.map((item) => (
            <WorkflowCard
              key={item.title}
              title={item.title}
              description={item.description}
              flow={item.flow}
            />
          ))}
        </div>
      </section>

      {/* AI Tools */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">{t('aiTools.title')}</h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">{t('aiTools.subtitle')}</p>
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-border/50 bg-surface p-5 sm:p-8 shadow-card">
            <p className="mb-8 text-center text-muted leading-relaxed">{t('aiTools.description')}</p>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center">
              {/* AI Agent box */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <CpuChipIcon className="h-8 w-8" />
                </div>
                <span className="text-sm font-medium">{t('aiTools.agentLabel')}</span>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center sm:pt-5">
                <div className="hidden sm:flex items-center gap-1 text-accent">
                  <div className="h-px w-8 bg-accent" />
                  <ArrowRightIcon className="h-5 w-5" />
                </div>
                <svg className="h-6 w-6 text-accent sm:hidden" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
                </svg>
              </div>

              {/* Tools grid */}
              <div className="flex flex-col items-center gap-2">
                <div className="text-xs font-medium uppercase tracking-wider text-muted">{t('aiTools.toolsLabel')}</div>
                <div className="grid grid-cols-2 gap-2">
                  {aiTools.map((tool) => (
                    <span key={tool} className="rounded-lg bg-accent/10 px-3 py-2 text-xs font-medium text-accent text-center">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Event Types */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">{t('eventTypes.title')}</h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">{t('eventTypes.subtitle')}</p>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-border/50 bg-surface shadow-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-6 py-4 font-medium text-muted">{t('eventTypes.headers.event')}</th>
                <th className="px-6 py-4 font-medium text-muted">{t('eventTypes.headers.description')}</th>
                <th className="px-6 py-4 font-medium text-muted">{t('eventTypes.headers.source')}</th>
              </tr>
            </thead>
            <tbody>
              {eventItems.map((item) => (
                <tr key={item.event} className="border-b border-border/30 last:border-0">
                  <td className="px-6 py-3">
                    <code className="rounded bg-accent/10 px-2 py-0.5 font-mono text-xs text-accent">{item.event}</code>
                  </td>
                  <td className="px-6 py-3 text-muted">{item.description}</td>
                  <td className="px-6 py-3 text-muted">{item.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {eventItems.map((item) => (
            <div key={item.event} className="rounded-2xl border border-border/50 bg-surface p-4 shadow-card">
              <div className="mb-2">
                <code className="rounded bg-accent/10 px-2 py-0.5 font-mono text-xs text-accent">{item.event}</code>
              </div>
              <div className="text-sm text-muted mb-1">{item.description}</div>
              <div className="text-xs text-muted">{item.source}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Installation */}
      <section id="install" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">{t('install.title')}</h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">{t('install.subtitle')}</p>
        <div className="grid gap-6 md:grid-cols-2">
          {/* npm CLI */}
          <div className="rounded-2xl border border-border/50 bg-surface p-5 sm:p-8 shadow-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <CommandLineIcon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{t('install.npm.title')}</h3>
            </div>
            <p className="mb-4 text-sm text-muted">{t('install.npm.description')}</p>
            <div className="flex items-center gap-2 rounded-lg bg-background/80 border border-border/50 px-4 py-3">
              <code className="flex-1 text-sm font-mono text-accent truncate">
                {t('install.npm.command')}
              </code>
              <button
                onClick={() => copy(t('install.npm.command'))}
                className="shrink-0 text-muted hover:text-foreground transition-colors"
                title={copied ? t('setup.copied') : t('setup.copy')}
              >
                {copied ? (
                  <ClipboardDocumentCheckIcon className="h-5 w-5 text-success" />
                ) : (
                  <ClipboardDocumentIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* n8n UI */}
          <div className="rounded-2xl border border-border/50 bg-surface p-5 sm:p-8 shadow-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <PlusCircleIcon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{t('install.ui.title')}</h3>
            </div>
            <ol className="space-y-3 text-sm text-muted">
              {installUiSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-medium text-accent">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* GitHub / Docs buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="https://github.com/AgiMateIo/n8n-nodes-agimate"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-7 py-3.5 font-medium text-foreground hover:bg-surface-secondary transition-colors w-full sm:w-auto justify-center"
          >
            {t('install.github')}
          </a>
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-7 py-3.5 font-medium text-foreground hover:bg-surface-secondary transition-colors w-full sm:w-auto justify-center"
          >
            {t('install.docs')}
          </a>
        </div>
      </section>

      <LandingFooter
        copyright={t('footer.copyright')}
        links={[
          { label: t('footer.github'), href: 'https://github.com/AgiMateIo/n8n-nodes-agimate', external: true },
          { label: t('footer.telegram'), href: 'https://t.me/agimate', external: true },
          { label: t('footer.docs'), href: '#' },
        ]}
      />
    </div>
  );
}

/* ---------- Local helper components ---------- */

function NodeCard({
  borderColor,
  icon,
  iconBg,
  title,
  description,
  features,
  useCaseLabel,
  useCase,
}: {
  borderColor: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  features: string[];
  useCaseLabel: string;
  useCase: string[];
}) {
  return (
    <div className={`rounded-2xl border border-border/50 border-t-4 ${borderColor} bg-surface p-4 sm:p-6 shadow-card transition-colors hover:border-accent/30`}>
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-muted">{description}</p>
      <ul className="mb-6 space-y-2 text-sm text-muted">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
            {f}
          </li>
        ))}
      </ul>
      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{useCaseLabel}</div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-mono text-xs text-muted">
          {useCase.map((step, i) => (
            <span key={step} className="flex items-center gap-1.5 sm:gap-2">
              <span className="rounded bg-accent/10 px-2 py-1 text-accent">{step}</span>
              {i < useCase.length - 1 && <span className="text-accent/60">&rarr;</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SetupStep({
  number,
  title,
  description,
  icon,
  children,
}: {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-surface p-4 sm:p-6 shadow-card transition-colors hover:border-accent/30">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-sm">
          {number}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-accent">{icon}</span>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
      {children}
    </div>
  );
}

function WorkflowCard({
  title,
  description,
  flow,
}: {
  title: string;
  description: string;
  flow: string[];
}) {
  return (
    <div className="group rounded-2xl border border-border/50 bg-surface p-4 sm:p-6 shadow-card transition-colors hover:border-accent/30">
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
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
