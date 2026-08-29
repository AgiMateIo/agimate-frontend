'use client';

import { Link } from '@/i18n/navigation';
import { useUser } from '@/contexts/UserContext';
import { useTranslations } from 'next-intl';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingBackground from '@/components/landing/LandingBackground';
import LandingFooter from '@/components/landing/LandingFooter';
import HowItWorksFlow from '@/components/landing/HowItWorksFlow';
import {
  ArrowRightIcon,
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
  DocumentTextIcon,
  AcademicCapIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ChatBubbleLeftRightIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';

// Order mirrors harness.items: tools → skills → keys → rails → trail → team.
// The log card is deliberately not called "memory": agents have memory of their
// own (the notes mixed into a run's first model call), and it is the opposite of
// this — what the agent recalls versus what you can check afterwards.
// Tools and skills are two cards, not one: a tool is what the agent can do at
// all, a skill is the written know-how for handling it.
const harnessIcons = [
  WrenchScrewdriverIcon,
  AcademicCapIcon,
  KeyIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
];
// Order mirrors agents.axes: model → instructions → access → skills.
const agentAxisIcons = [SparklesIcon, DocumentTextIcon, KeyIcon, AcademicCapIcon];
// Order mirrors security.items: binding gate → pre-call rules → log.
const securityIcons = [ShieldCheckIcon, AdjustmentsHorizontalIcon, ClipboardDocumentListIcon];
const modelIcons = [KeyIcon, SparklesIcon, ChartBarIcon];

export default function HomePage() {
  const { user } = useUser();
  const t = useTranslations('HomePage');

  const harnessItems = t.raw('harness.items') as PlainItem[];
  const agentAxes = t.raw('agents.axes') as PlainItem[];
  const agentTable = t.raw('agents.table') as { columns: string[]; rows: string[][] };
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
    note?: string;
    soon: boolean;
  }>;
  const integrationItems = t.raw('connections.integrations.items') as string[];
  const upcomingIntegrations = t.raw('connections.integrations.upcoming') as string[];
  const installItems = t.raw('connections.install.items') as Array<{
    title: string;
    description?: string;
    button: string;
  }>;

  const channelIcons = [
    ChatBubbleLeftRightIcon,
    GlobeAltIcon,
    DevicePhoneMobileIcon,
    ChatBubbleLeftRightIcon,
  ];
  const installIcons = [DevicePhoneMobileIcon, ComputerDesktopIcon, BoltIcon];
  const installHrefs = ['/android', '/desktop', '/n8n'];

  return (
    <div className="min-h-screen text-foreground">
      <LandingBackground />

      {/* Header */}
      <LandingHeader
        navLinks={[
          { href: '#harness', label: t('nav.harness') },
          { href: '#agents', label: t('nav.agents') },
          { href: '#how-it-works', label: t('nav.howItWorks') },
          { href: '#use-cases', label: t('nav.useCases') },
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
        </div>
      </section>

      {/* Harness — the position itself: the model only talks, everything around it
          does the work. Every card carries the technical line and a plain-language
          one under it; the callout is the claim the rest of the page leans on —
          credentials stay in the platform, so there is nothing in the model to leak. */}
      <section id="harness" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">
          {t('harness.title')}
        </h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-2xl text-center text-muted">
          {t('harness.subtitle')}
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {harnessItems.map((item, i) => {
            const Icon = harnessIcons[i];
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-accent/20 bg-surface shadow-card p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{item.tech}</p>
                <p className="mt-3 border-t border-border/50 pt-3 text-sm leading-relaxed text-foreground/80">
                  <span className="font-medium text-accent">{t('harness.plainLabel')} </span>
                  {item.plain}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mx-auto mt-8 max-w-3xl rounded-2xl border border-accent/20 bg-accent/5 p-6 text-center text-sm leading-relaxed sm:text-base">
          {t('harness.callout')}
        </p>
      </section>

      {/* How It Works — the animated call path: trigger → policy → one agent →
          tool call through the same check → the answer out through a channel,
          with both logs filling underneath. Ported from the marketing repo. */}
      <HowItWorksFlow />

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

      {/* Agents — the multi-agent half of the position. The table is the proof:
          "every agent its own" stays a buzzword until three of them sit side by side
          with different models, rights and bills. */}
      <section id="agents" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">
          {t('agents.title')}
        </h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-2xl text-center text-muted">
          {t('agents.subtitle')}
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {agentAxes.map((item, i) => {
            const Icon = agentAxisIcons[i];
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-border/50 bg-surface shadow-card p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{item.tech}</p>
                <p className="mt-3 border-t border-border/50 pt-3 text-sm leading-relaxed text-foreground/80">
                  <span className="font-medium text-accent">{t('agents.plainLabel')} </span>
                  {item.plain}
                </p>
              </div>
            );
          })}
        </div>

        {/* Three agents side by side. Narrower than the table's min width the row
            scrolls inside its own box rather than dragging the page sideways. */}
        <div className="mt-8 overflow-x-auto rounded-2xl border border-border/50 bg-surface shadow-card">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wide text-muted">
                {agentTable.columns.map((col) => (
                  <th key={col} className="px-4 py-3 font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agentTable.rows.map((row) => (
                <tr key={row[0]} className="border-b border-border/30 last:border-0">
                  {row.map((cell, i) => (
                    <td
                      key={`${row[0]}-${i}`}
                      className={`px-4 py-3 align-top ${
                        i === 0 ? 'font-medium text-foreground' : 'text-muted'
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-muted">
          {t('agents.tableNote')}
        </p>
      </section>

      {/* Quick start — right after the flow diagram: everything it just showed
          is assembled in three steps */}
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
          <div className="mx-auto flex max-w-xl flex-wrap justify-center gap-x-8 gap-y-6">
            {channelItems.map((ch, i) => {
              const Icon = channelIcons[i];
              return (
                <div key={ch.name} className="flex w-24 flex-col items-center gap-2">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-xl ${
                      ch.soon ? 'bg-surface-secondary text-muted' : 'bg-accent/10 text-accent'
                    }`}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <span
                    className={`text-center text-sm font-medium ${ch.soon ? 'text-muted' : ''}`}
                  >
                    {ch.name}
                  </span>
                  {ch.note && (
                    <span className="text-center text-xs leading-snug text-muted">{ch.note}</span>
                  )}
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

interface PlainItem {
  title: string;
  tech: string;
  plain: string;
}
