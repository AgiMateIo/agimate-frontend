'use client';

import { Link } from '@/i18n/navigation';
import { useUser } from '@/contexts/UserContext';
import { useTranslations } from 'next-intl';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingBackground from '@/components/landing/LandingBackground';
import LandingFooter from '@/components/landing/LandingFooter';
import {
  EyeIcon,
  HandRaisedIcon,
  ArrowRightIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  DocumentTextIcon,
  BellAlertIcon,
  ShoppingCartIcon,
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  MegaphoneIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';

const useCaseIcons = [
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  BellAlertIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  CpuChipIcon,
  SpeakerWaveIcon,
  MegaphoneIcon,
];

export default function HomePage() {
  const { user } = useUser();
  const t = useTranslations('HomePage');

  const useCaseItems = t.raw('useCases.items') as Array<{
    title: string;
    description: string;
    flow: string[];
  }>;

  return (
    <div className="min-h-screen text-foreground">
      {/* Background gradient mesh */}
      <LandingBackground />

      {/* Header */}
      <LandingHeader
        navLinks={[
          { href: '#how-it-works', label: t('nav.howItWorks') },
          { href: '#use-cases', label: t('nav.useCases') },
          { href: '#download', label: t('nav.download') },
        ]}
        loginLabel={t('nav.login')}
        dashboardLabel={t('nav.dashboard')}
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
          <br className="hidden sm:block" />
          {t('hero.subtitleSecond')}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={user ? '/dashboard' : '/login'}
            className="w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-lg bg-accent px-7 py-3.5 font-medium text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90 transition-colors"
          >
            {t('hero.cta')}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-lg border border-border px-7 py-3.5 font-medium text-foreground hover:bg-surface-secondary transition-colors"
          >
            {t('hero.secondaryCta')}
          </a>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-border/50 bg-surface shadow-card p-5 sm:p-8">
            <div className="mb-4 inline-block rounded-full bg-error/10 px-3 py-1 text-xs font-medium text-error">
              {t('problem.badge')}
            </div>
            <p className="text-lg leading-relaxed text-muted">{t('problem.text')}</p>
          </div>
          <div className="rounded-2xl border border-accent/30 bg-surface shadow-card p-5 sm:p-8 shadow-lg shadow-accent/5">
            <div className="mb-4 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              {t('solution.badge')}
            </div>
            <p className="text-lg leading-relaxed text-muted">{t('solution.text')}</p>
          </div>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <CapabilityCard icon={<EyeIcon className="h-7 w-7" />} title={t('capabilities.see.title')} description={t('capabilities.see.description')} />
          <CapabilityCard
            icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>}
            title={t('capabilities.hear.title')} description={t('capabilities.hear.description')}
          />
          <CapabilityCard icon={<HandRaisedIcon className="h-7 w-7" />} title={t('capabilities.act.title')} description={t('capabilities.act.description')} />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">{t('howItWorks.title')}</h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">{t('howItWorks.subtitle')}</p>
        <div className="grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <div className="rounded-2xl border border-border/50 bg-surface shadow-card p-6 text-center">
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">{t('howItWorks.aiBox.title')}</div>
            <div className="space-y-1 text-sm text-muted">
              {(t.raw('howItWorks.aiBox.items') as string[]).map((item: string) => (<div key={item}>{item}</div>))}
            </div>
          </div>
          <div className="hidden items-center justify-center md:flex"><div className="flex items-center gap-1 text-accent"><div className="h-px w-8 bg-accent" /><ArrowRightIcon className="h-5 w-5" /></div></div>
          <div className="flex items-center justify-center py-2 md:hidden"><svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" /></svg></div>
          <div className="rounded-2xl border border-accent/40 bg-accent/5 p-6 text-center shadow-lg shadow-accent/10">
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-accent">{t('howItWorks.platformBox.title')}</div>
            <div className="text-sm font-medium text-muted">{t('howItWorks.platformBox.subtitle')}</div>
          </div>
          <div className="hidden items-center justify-center md:flex"><div className="flex items-center gap-1 text-accent"><div className="h-px w-8 bg-accent" /><ArrowRightIcon className="h-5 w-5" /></div></div>
          <div className="flex items-center justify-center py-2 md:hidden"><svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" /></svg></div>
          <div className="rounded-2xl border border-border/50 bg-surface shadow-card p-6 text-center">
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">{t('howItWorks.devicesBox.title')}</div>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted">
              <span className="flex items-center justify-center gap-1.5"><DevicePhoneMobileIcon className="h-4 w-4 text-accent" />{t('howItWorks.devicesBox.phone')}</span>
              <span className="flex items-center justify-center gap-1.5"><ComputerDesktopIcon className="h-4 w-4 text-accent" />{t('howItWorks.devicesBox.computer')}</span>
              <span className="flex items-center justify-center gap-1.5"><ShoppingCartIcon className="h-4 w-4 text-accent" />{t('howItWorks.devicesBox.marketplace')}</span>
              <span className="flex items-center justify-center gap-1.5"><ChatBubbleLeftRightIcon className="h-4 w-4 text-accent" />{t('howItWorks.devicesBox.messenger')}</span>
            </div>
          </div>
        </div>
        <p className="mt-10 text-center text-muted">
          {t('howItWorks.caption')}
          <br className="hidden sm:block" />
          {t('howItWorks.captionSecond')}
        </p>
      </section>

      {/* Use-cases */}
      <section id="use-cases" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">{t('useCases.title')}</h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">{t('useCases.subtitle')}</p>
        <div className="grid gap-6 md:grid-cols-2">
          {useCaseItems.map((uc, index) => {
            const Icon = useCaseIcons[index];
            return (
              <div key={uc.title} className="group rounded-2xl border border-border/50 bg-surface shadow-card p-6 transition-colors hover:border-accent/30">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent"><Icon className="h-5 w-5" /></div>
                  <h3 className="text-lg font-semibold">{uc.title}</h3>
                </div>
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
            );
          })}
        </div>
      </section>

      {/* Download */}
      <section id="download" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="text-center">
          <h2 className="mb-4 text-2xl sm:text-3xl font-bold tracking-tight">{t('download.title')}</h2>
          <p className="mx-auto mb-6 max-w-md text-muted">{t('download.subtitle')}</p>
          <Link
            href={user ? '/dashboard' : '/login'}
            className="mb-8 sm:mb-10 md:mb-14 inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-4 text-lg font-medium text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90 transition-colors"
          >
            {t('download.cta')}
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>
        <div className="mt-8 sm:mt-10 md:mt-14 grid gap-6 sm:grid-cols-3">
          <DownloadCard icon={<DevicePhoneMobileIcon className="h-8 w-8" />} title={t('download.android.title')} description={t('download.android.description')} buttonLabel={t('download.android.button')} href="/android" />
          <DownloadCard icon={<ComputerDesktopIcon className="h-8 w-8" />} title={t('download.desktop.title')} description={t('download.desktop.description')} buttonLabel={t('download.desktop.button')} href="/desktop" />
          <DownloadCard icon={<svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>} title={t('download.n8n.title')} description={t('download.n8n.description')} buttonLabel={t('download.n8n.button')} href="/n8n" />
        </div>
      </section>

      {/* Footer */}
      <LandingFooter
        copyright={t('footer.copyright')}
        links={[
          { label: t('footer.github'), href: 'https://github.com/AgiMateIo', external: true },
          { label: t('footer.telegram'), href: '#' },
          { label: t('footer.docs'), href: '#' },
        ]}
      />
    </div>
  );
}

function CapabilityCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-surface shadow-card p-6 text-center transition-colors hover:border-accent/30">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 text-accent">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </div>
  );
}

function DownloadCard({ icon, title, description, buttonLabel, buttons, disabled, href }: { icon: React.ReactNode; title: string; description: string; buttonLabel?: string; buttons?: string[]; disabled?: boolean; href?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border/50 bg-surface shadow-card p-5 sm:p-8 text-center">
      <div className="mb-4 text-accent">{icon}</div>
      <h3 className="mb-1 text-lg font-semibold">{title}</h3>
      <p className="mb-6 text-sm text-muted">{description}</p>
      {buttons ? (
        <div className="flex flex-wrap justify-center gap-2">
          {buttons.map((label) => (<button key={label} disabled={disabled} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted">{label}</button>))}
        </div>
      ) : href ? (
        <Link href={href} className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent">{buttonLabel}</Link>
      ) : (
        <button disabled={disabled} className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted">{buttonLabel}</button>
      )}
    </div>
  );
}
