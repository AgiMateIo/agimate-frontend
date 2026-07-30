'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useUser } from '@/contexts/UserContext';
import { useTranslations } from 'next-intl';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingBackground from '@/components/landing/LandingBackground';
import LandingFooter from '@/components/landing/LandingFooter';
import {
  ArrowRightIcon,
  ShieldExclamationIcon,
  EyeSlashIcon,
  BanknotesIcon,
  Squares2X2Icon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  BoltIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  AdjustmentsHorizontalIcon,
  GlobeAltIcon,
  KeyIcon,
  SparklesIcon,
  ChartBarIcon,
  UserGroupIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ChatBubbleLeftRightIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';

const problemIcons = [ShieldExclamationIcon, EyeSlashIcon, BanknotesIcon];
const solutionIcons = [Squares2X2Icon, ShieldCheckIcon, ClipboardDocumentListIcon];
const tabIcons = [BoltIcon, WrenchScrewdriverIcon, CheckCircleIcon];
// Order mirrors security.items: binding gate → pre-call rules → log.
const securityIcons = [ShieldCheckIcon, AdjustmentsHorizontalIcon, ClipboardDocumentListIcon];
const modelIcons = [KeyIcon, SparklesIcon, ChartBarIcon];

export default function HomePage() {
  const { user } = useUser();
  const t = useTranslations('HomePage');
  const [activeTab, setActiveTab] = useState(0);

  const problemItems = t.raw('problems.items') as Array<{ title: string; description: string }>;
  const solutionColumns = t.raw('solution.columns') as Array<{ title: string; description: string }>;
  const howItWorksTabs = t.raw('howItWorks.tabs') as Array<{
    label: string;
    title: string;
    description: string;
    sources?: string[];
    toolbox?: string[];
  }>;
  const useCaseItems = t.raw('useCases.items') as Array<{
    title: string;
    description: string;
    flow: string[];
  }>;
  const quickStartSteps = t.raw('quickStart.steps') as Array<{
    title: string;
    description: string;
  }>;
  const quickStartTuneItems = t.raw('quickStart.tuneItems') as string[];
  const securityItems = t.raw('security.items') as Array<{ title: string; description: string }>;
  const modelItems = t.raw('models.items') as Array<{ title: string; description: string }>;
  const channelItems = t.raw('connections.channels.items') as Array<{
    name: string;
    soon: boolean;
  }>;
  const integrationItems = t.raw('connections.integrations.items') as string[];
  const upcomingIntegrations = t.raw('connections.integrations.upcoming') as string[];
  const installItems = t.raw('connections.install.items') as Array<{
    title: string;
    description?: string;
    button: string;
  }>;

  const channelIcons = [ChatBubbleLeftRightIcon, GlobeAltIcon, ChatBubbleLeftRightIcon];
  const installIcons = [DevicePhoneMobileIcon, ComputerDesktopIcon, BoltIcon];
  const installHrefs = ['/android', '/desktop', '/n8n'];

  return (
    <div className="min-h-screen text-foreground">
      <LandingBackground />

      {/* Header */}
      <LandingHeader
        navLinks={[
          { href: '#how-it-works', label: t('nav.howItWorks') },
          { href: '#use-cases', label: t('nav.useCases') },
          { href: '#security', label: t('nav.security') },
          { href: '#models', label: t('nav.models') },
          { href: '#connections', label: t('nav.connections') },
        ]}
        loginLabel={t('nav.login')}
        dashboardLabel={t('nav.dashboard')}
      />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-12 pt-14 sm:pb-16 sm:pt-16 md:pt-28 md:pb-20 text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          {t('hero.title')}{' '}
          <span className="bg-gradient-to-r from-accent to-purple-400 bg-clip-text text-transparent">
            {t('hero.titleHighlight')}
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          {t('hero.subtitle')}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {user ? (
            <Link
              href="/dashboard"
              className="w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-lg bg-accent px-7 py-3.5 font-medium text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90 transition-colors"
            >
              {t('nav.dashboard')}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-lg bg-accent px-7 py-3.5 font-medium text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90 transition-colors"
            >
              {t('hero.cta')}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          )}
          <a
            href="#how-it-works"
            className="w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-lg border border-border px-7 py-3.5 font-medium text-foreground hover:bg-surface-secondary transition-colors"
          >
            {t('hero.secondaryCta')}
          </a>
        </div>

        {/* Hero Scheme */}
        <div className="mt-12 sm:mt-16">
          <HeroScheme
            steps={t.raw('heroScheme.steps') as HeroStep[]}
          />
        </div>
      </section>

      {/* Quick start — backs the hero's promise before the page argues anything else */}
      <section id="quick-start" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">
          {t('quickStart.title')}
        </h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">
          {t('quickStart.subtitle')}
        </p>
        <div className="grid gap-6 sm:grid-cols-3">
          {quickStartSteps.map((step, i) => (
            <div
              key={step.title}
              className="rounded-2xl border border-accent/20 bg-surface shadow-card p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">
                {i + 1}
              </div>
              <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Nothing is a one-way door — what stays open after creation */}
        <div className="mt-8 rounded-2xl border border-border/50 bg-surface-secondary/50 p-6">
          <h3 className="mb-4 text-center text-base font-semibold">{t('quickStart.tuneTitle')}</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {quickStartTuneItems.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-surface px-3 py-1.5 text-sm text-muted"
              >
                <CheckCircleIcon className="h-4 w-4 shrink-0 text-accent" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Problems */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-8 sm:mb-10 md:mb-14 text-center text-2xl sm:text-3xl font-bold tracking-tight">
          {t('problems.title')}
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {problemItems.map((item, i) => {
            const Icon = problemIcons[i];
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-error/20 bg-surface shadow-card p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-error/10 text-error">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Solution */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-8 sm:mb-10 md:mb-14 text-center text-2xl sm:text-3xl font-bold tracking-tight">
          {t('solution.title')}
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {solutionColumns.map((col, i) => {
            const Icon = solutionIcons[i];
            return (
              <div
                key={col.title}
                className="rounded-2xl border border-accent/20 bg-surface shadow-card p-6 text-center"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{col.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{col.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-8 sm:mb-10 md:mb-14 text-center text-2xl sm:text-3xl font-bold tracking-tight">
          {t('howItWorks.title')}
        </h2>

        {/* Tab buttons */}
        <div className="mx-auto mb-8 flex max-w-xl justify-center gap-2">
          {howItWorksTabs.map((tab, i) => {
            const Icon = tabIcons[i];
            return (
              <button
                key={tab.label}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === i
                    ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/25'
                    : 'border border-border text-muted hover:text-foreground hover:bg-surface-secondary'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="rounded-2xl border border-border/50 bg-surface shadow-card p-6 sm:p-8 md:p-10">
          <h3 className="mb-3 text-xl font-semibold">{howItWorksTabs[activeTab].title}</h3>
          <p className="mb-8 max-w-2xl text-muted">{howItWorksTabs[activeTab].description}</p>

          {activeTab === 0 && <HowItWorksStep1 sources={howItWorksTabs[0].sources || []} />}
          {activeTab === 1 && <HowItWorksStep2 toolbox={howItWorksTabs[1].toolbox || []} />}
          {activeTab === 2 && <HowItWorksStep3 />}
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">
          {t('useCases.title')}
        </h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">
          {t('useCases.subtitle')}
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {useCaseItems.map((uc, index) => (
            <div
              key={uc.title}
              className={`group rounded-2xl border border-border/50 bg-surface shadow-card p-6 transition-colors hover:border-accent/30${
                index === useCaseItems.length - 1 && useCaseItems.length % 2 === 1
                  ? ' last:md:col-span-2'
                  : ''
              }`}
            >
              <h3 className="mb-2 text-lg font-semibold">{uc.title}</h3>
              <p className="mb-4 text-sm leading-relaxed text-muted">{uc.description}</p>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-mono text-xs text-muted">
                {uc.flow.map((step: string, i: number) => (
                  <span key={step} className="flex items-center gap-1.5 sm:gap-2">
                    <span className="rounded bg-accent/10 px-2 py-1 text-accent">{step}</span>
                    {i < uc.flow.length - 1 && <span className="text-accent/60">&rarr;</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section id="security" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-8 sm:mb-10 md:mb-14 text-center text-2xl sm:text-3xl font-bold tracking-tight">
          {t('security.title')}
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {securityItems.map((item, i) => {
            const Icon = securityIcons[i];
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-accent/20 bg-surface shadow-card p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Models — bring your own key */}
      <section id="models" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">
          {t('models.title')}
        </h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">
          {t('models.subtitle')}
        </p>
        <div className="grid gap-6 sm:grid-cols-3">
          {modelItems.map((item, i) => {
            const Icon = modelIcons[i];
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-border/50 bg-surface shadow-card p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Connections */}
      <section id="connections" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        {/* Channels */}
        <div className="mb-12 sm:mb-16 text-center">
          <h2 className="mb-2 text-2xl sm:text-3xl font-bold tracking-tight">
            {t('connections.channels.title')}
          </h2>
          <p className="mx-auto mb-8 max-w-md text-muted">{t('connections.channels.subtitle')}</p>
          <div className="mx-auto flex max-w-sm justify-center gap-8">
            {channelItems.map((ch, i) => {
              const Icon = channelIcons[i];
              return (
                <div key={ch.name} className="flex flex-col items-center gap-2">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-xl ${
                      ch.soon ? 'bg-surface-secondary text-muted' : 'bg-accent/10 text-accent'
                    }`}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className={`text-sm font-medium ${ch.soon ? 'text-muted' : ''}`}>
                    {ch.name}
                  </span>
                  {ch.soon && (
                    <span className="rounded-full border border-border/50 px-2 py-0.5 text-[11px] font-medium text-muted">
                      {t('connections.channels.soonLabel')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Integrations — available now, then the catalog in progress */}
        <div className="mb-12 sm:mb-16 text-center">
          <h3 className="mb-2 text-xl sm:text-2xl font-bold tracking-tight">
            {t('connections.integrations.title')}
          </h3>
          <p className="mx-auto mb-8 max-w-lg text-muted">{t('connections.integrations.subtitle')}</p>
          <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2">
            {integrationItems.map((svc) => (
              <span
                key={svc}
                className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-1.5 text-sm font-medium text-foreground"
              >
                {svc}
              </span>
            ))}
          </div>
          <div className="mx-auto mt-6 max-w-2xl">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              {t('connections.integrations.upcomingLabel')}
            </span>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {upcomingIntegrations.map((svc) => (
                <span
                  key={svc}
                  className="rounded-lg border border-dashed border-border/60 px-3 py-1.5 text-sm text-muted"
                >
                  {svc}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Install */}
        <div className="text-center">
          <h3 className="mb-2 text-xl sm:text-2xl font-bold tracking-tight">
            {t('connections.install.title')}
          </h3>
          <p className="mx-auto mb-6 max-w-lg text-muted">{t('connections.install.subtitle')}</p>
          <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
            {installItems.map((item, i) => {
              const Icon = installIcons[i];
              const href = installHrefs[i];
              return (
                <div
                  key={item.title}
                  className="flex flex-col items-center rounded-2xl border border-border/50 bg-surface shadow-card p-5"
                >
                  <div className="mb-3 text-accent">
                    <Icon className="h-8 w-8" />
                  </div>
                  <h4 className="mb-3 font-semibold">{item.title}</h4>
                  {item.description && (
                    <p className="mb-3 text-xs leading-relaxed text-muted text-center">{item.description}</p>
                  )}
                  {href !== '#' ? (
                    <Link
                      href={href}
                      className="mt-auto rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      {item.button}
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="mt-auto rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted cursor-not-allowed opacity-40"
                    >
                      {item.button}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Open Source & Self-hosted */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="rounded-2xl border border-accent/20 bg-surface shadow-card p-6 sm:p-8 md:p-10">
          <h2 className="mb-4 text-2xl sm:text-3xl font-bold tracking-tight">
            {t('openSource.title')}
          </h2>
          <p className="mb-8 max-w-2xl text-muted leading-relaxed">
            {t('openSource.description')}
          </p>
          <ul className="space-y-4">
            <li className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <ServerIcon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{t('openSource.selfHosted')}</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <ShieldCheckIcon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{t('openSource.audit')}</span>
            </li>
            <li className="flex items-center gap-3">
              <a
                href="https://github.com/AgiMateIo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              >
                <ArrowRightIcon className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/AgiMateIo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-accent hover:underline"
              >
                {t('openSource.github')}
              </a>
            </li>
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-8 sm:p-12 text-center">
          <h2 className="mb-4 text-2xl sm:text-3xl font-bold tracking-tight">{t('cta.title')}</h2>
          <p className="mx-auto mb-8 max-w-md text-muted">{t('cta.subtitle')}</p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-4 text-lg font-medium text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90 transition-colors"
              >
                {t('nav.dashboard')}
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-4 text-lg font-medium text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90 transition-colors"
              >
                {t('cta.button')}
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
            )}
            <a
              href="https://github.com/AgiMateIo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted hover:text-accent transition-colors"
            >
              {t('cta.docsLink')}
            </a>
          </div>
          <p className="mt-6 text-xs text-muted">{t('cta.finePrint')}</p>
        </div>
      </section>

      {/* Footer */}
      <LandingFooter
        copyright={t('footer.copyright')}
        links={[
          { label: t('footer.github'), href: 'https://github.com/AgiMateIo', external: true },
          { label: t('footer.telegram'), href: 'https://t.me/agimate', external: true },
          { label: t('footer.telegramChat'), href: 'https://t.me/agimate', external: true },
          { label: t('footer.docs'), href: 'https://github.com/AgiMateIo', external: true },
          { label: t('footer.terms'), href: '/terms', localized: true },
          { label: t('footer.privacy'), href: '/privacy', localized: true },
        ]}
      />
    </div>
  );
}

/* ── Hero Scheme ──
   The creation path the hero promises: a ready-made role → skills already ticked →
   the agent answering. The three `agent-activate` delays (0s/2s/4s of one 6s cycle)
   light the steps in order, so the animation reads as "three taps" rather than
   decoration. The section below the fold carries the same three steps in prose. */
interface HeroStep {
  label: string;
  sub: string;
}

function HeroScheme({ steps }: { steps: HeroStep[] }) {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Horizontal layout (sm+) */}
      <div className="hidden sm:flex items-start justify-center gap-3">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-start gap-3">
            {i > 0 && (
              <div className="pt-5">
                <SchemeArrow direction="right" />
              </div>
            )}
            <SchemeStep step={step} index={i} isLast={i === steps.length - 1} />
          </div>
        ))}
      </div>

      {/* Vertical layout (mobile) */}
      <div className="flex sm:hidden flex-col items-center gap-2">
        {steps.map((step, i) => (
          <div key={step.label} className="flex flex-col items-center gap-2">
            {i > 0 && <SchemeArrow direction="down" />}
            <SchemeStep step={step} index={i} isLast={i === steps.length - 1} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SchemeStep({
  step,
  index,
  isLast,
}: {
  step: HeroStep;
  index: number;
  isLast: boolean;
}) {
  const activation = [
    'animate-agent-activate',
    'animate-agent-activate-delay-1',
    'animate-agent-activate-delay-2',
  ][index] ?? 'animate-agent-activate';

  return (
    <div className="flex w-36 flex-col items-center gap-1.5 text-center sm:w-40">
      <div
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium ${activation} ${
          isLast
            ? 'border-2 border-accent bg-accent/10 text-accent'
            : 'border border-border/50 bg-surface-secondary text-foreground'
        }`}
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
            isLast ? 'bg-accent text-accent-foreground' : 'bg-accent/10 text-accent'
          }`}
        >
          {index + 1}
        </span>
        {step.label}
      </div>
      <span className="text-[11px] leading-snug text-muted">{step.sub}</span>
    </div>
  );
}

function SchemeArrow({ direction }: { direction: 'right' | 'down' }) {
  if (direction === 'right') {
    return (
      <div className="flex items-center text-accent animate-flow-right">
        <div className="h-px w-4 bg-accent" />
        <ArrowRightIcon className="h-3 w-3" />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center text-accent animate-flow-down">
      <div className="w-px h-4 bg-accent" />
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
      </svg>
    </div>
  );
}

/* ── How It Works Steps ── */
function HowItWorksStep1({ sources }: { sources: string[] }) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
      <div className="flex flex-col gap-3">
        {sources.map((src) => (
          <div key={src} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <BoltIcon className="h-5 w-5 animate-pulse-dot" />
            </div>
            <span className="text-sm font-medium">{src}</span>
          </div>
        ))}
      </div>
      <div className="text-accent animate-flow-right hidden sm:block">
        <div className="flex items-center gap-1">
          <div className="h-px w-12 bg-accent" />
          <ArrowRightIcon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-accent animate-flow-down sm:hidden">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
        </svg>
      </div>
      <div className="flex h-16 items-center justify-center rounded-xl border-2 border-accent bg-accent/10 px-6 text-accent font-semibold">
        AgiMate
      </div>
    </div>
  );
}

function HowItWorksStep2({ toolbox }: { toolbox: string[] }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <AgentGlyph />
      {/* What the agent draws on when it picks a tool */}
      <div className="flex flex-wrap justify-center gap-4">
        {toolbox.map((item, i) => {
          const delays = ['animate-agent-activate', 'animate-agent-activate-delay-1', 'animate-agent-activate-delay-2', 'animate-agent-activate'];
          return (
            <div
              key={item}
              className={`flex h-12 items-center justify-center rounded-full border border-accent/40 bg-accent/5 px-4 text-xs font-medium text-accent ${delays[i % delays.length]}`}
            >
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentGlyph() {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent bg-accent/10 text-accent animate-pulse-dot">
      <SparklesIcon className="h-6 w-6" />
    </div>
  );
}

function HowItWorksStep3() {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
      <AgentGlyph />
      <div className="text-accent animate-flow-right hidden sm:block">
        <div className="flex items-center gap-1">
          <div className="h-px w-12 bg-accent" />
          <ArrowRightIcon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-accent animate-flow-down sm:hidden">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
        </svg>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex h-12 items-center justify-center rounded-lg border border-border/50 bg-surface-secondary px-4 text-sm font-medium text-muted">
          <UserGroupIcon className="mr-2 h-5 w-5 text-accent" />
          User
        </div>
        <div className="flex h-12 items-center justify-center rounded-lg border border-border/50 bg-surface-secondary px-4 text-sm font-medium text-muted">
          <ClipboardDocumentListIcon className="mr-2 h-5 w-5 text-accent" />
          Log
        </div>
      </div>
    </div>
  );
}
