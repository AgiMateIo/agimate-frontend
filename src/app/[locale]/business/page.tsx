'use client';

import { useTranslations } from 'next-intl';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingBackground from '@/components/landing/LandingBackground';
import LandingFooter from '@/components/landing/LandingFooter';
import {
  ArrowRightIcon,
  BanknotesIcon,
  CheckCircleIcon,
  CpuChipIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  PuzzlePieceIcon,
  RectangleGroupIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  SwatchIcon,
} from '@heroicons/react/24/outline';

// The one address a partner writes to. The same one LICENSING.md names for a
// commercial licence — this page is the sales-side entrance to that conversation,
// so a second inbox would only split the thread.
const CONTACT_EMAIL = 'easmithpub@mail.ru';
const TELEGRAM_URL = 'https://t.me/agimate';
// The platform's own terms, not the dashboard's: what a partner licenses is the
// core. Both repositories carry the same FSL-1.1-ALv2 summary and name the same
// address, but the backend is the subject of this page. Branch is `master` there.
const LICENSING_URL = 'https://github.com/AgiMateIo/agimate-backend/blob/master/LICENSING.md';

// Order mirrors audience.items: inference → integrators → ISV. Ranked by how
// little has to be built before the pitch is true, not by deal size.
const audienceIcons = [ServerStackIcon, PuzzlePieceIcon, RectangleGroupIcon];
// Order mirrors whiteLabel.items: frontend → models → economics → perimeter.
const whiteLabelIcons = [SwatchIcon, CpuChipIcon, BanknotesIcon, ShieldCheckIcon];

export default function BusinessPage() {
  const t = useTranslations('BusinessPage');

  const audienceItems = t.raw('audience.items') as Array<{
    title: string;
    have: string;
    missing: string;
    gain: string;
  }>;
  const whiteLabelItems = t.raw('whiteLabel.items') as Array<{
    title: string;
    description: string;
  }>;
  const includedItems = t.raw('included.items') as string[];
  const howSteps = t.raw('how.steps') as Array<{ title: string; description: string }>;

  // A subject line, so a white-label lead is distinguishable in an inbox that
  // also takes licence questions — LICENSING.md points at the same address.
  const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t('cta.mailSubject'))}`;

  return (
    <div className="min-h-screen text-foreground">
      <LandingBackground />

      <LandingHeader
        navLinks={[
          { href: '#audience', label: t('nav.audience') },
          { href: '#white-label', label: t('nav.whiteLabel') },
          { href: '#included', label: t('nav.included') },
          { href: '#how', label: t('nav.how') },
          { href: '#license', label: t('nav.license') },
        ]}
        loginLabel={t('nav.login')}
        dashboardLabel={t('nav.dashboard')}
      />

      {/* Hero — the offer in one line: not "build agents", but "hand agents to
          the customers you already have". */}
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
        <div className="mt-10 flex justify-center">
          <a
            href={mailtoHref}
            className="w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-lg bg-accent px-7 py-3.5 font-medium text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90 transition-colors"
          >
            {t('hero.cta')}
            <ArrowRightIcon className="h-4 w-4" />
          </a>
        </div>
        {/* No price anywhere on this page, so the absence is stated rather than
            left as a hole the reader fills with a guess. */}
        <p className="mt-4 text-sm text-muted">{t('hero.note')}</p>
      </section>

      {/* Audience — three cards of the same shape: what the partner already has,
          what they are missing, what the platform closes. The middle row is the
          one that has to land; without it the card reads as a feature list. */}
      <section id="audience" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">
          {t('audience.title')}
        </h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-2xl text-center text-muted">
          {t('audience.subtitle')}
        </p>
        <div className="grid gap-6 lg:grid-cols-3">
          {audienceItems.map((item, i) => {
            const Icon = audienceIcons[i];
            return (
              <div
                key={item.title}
                className="flex flex-col rounded-2xl border border-accent/20 bg-surface shadow-card p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-4 text-lg font-semibold">{item.title}</h3>
                {/* flex, not spacing alone: the three cards stand side by side and
                    the highlighted row has to line up across them whatever the
                    translation's length — mt-auto on the last block needs a flex
                    parent that fills the card. */}
                <dl className="flex flex-1 flex-col gap-3 text-sm leading-relaxed">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      {t('audience.labels.have')}
                    </dt>
                    <dd className="mt-1 text-muted">{item.have}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      {t('audience.labels.missing')}
                    </dt>
                    <dd className="mt-1 text-muted">{item.missing}</dd>
                  </div>
                  <div className="mt-auto rounded-xl border border-accent/20 bg-accent/5 p-4">
                    <dt className="text-xs font-medium uppercase tracking-wide text-accent">
                      {t('audience.labels.gain')}
                    </dt>
                    <dd className="mt-1 text-foreground/80">{item.gain}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      </section>

      {/* White label — what is actually yours and what stays shared. The first
          card is deliberately blunt: branding is a frontend built on top of this
          dashboard, not a switch in an admin panel. */}
      <section id="white-label" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">
          {t('whiteLabel.title')}
        </h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-2xl text-center text-muted">
          {t('whiteLabel.subtitle')}
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {whiteLabelItems.map((item, i) => {
            const Icon = whiteLabelIcons[i];
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

      {/* Included — the list is the argument against building it in-house, so it
          names only what is in production today. Anything on the roadmap belongs
          in the conversation, not here. */}
      <section id="included" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">
          {t('included.title')}
        </h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-2xl text-center text-muted">
          {t('included.subtitle')}
        </p>
        <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
          {includedItems.map((item) => (
            <div
              key={item}
              className="flex items-start gap-3 rounded-xl border border-border/50 bg-surface px-4 py-3"
            >
              <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <span className="text-sm leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">
          {t('how.title')}
        </h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">
          {t('how.subtitle')}
        </p>
        <div className="grid gap-6 sm:grid-cols-3">
          {howSteps.map((step, i) => (
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
        <p className="mx-auto mt-8 max-w-3xl rounded-2xl border border-accent/20 bg-accent/5 p-6 text-center text-sm leading-relaxed sm:text-base">
          {t('how.callout')}
        </p>
      </section>

      {/* Licence — the page carries no prices, and this is what stands in their
          place: where the free boundary runs and what is negotiable. It doubles
          as the qualifier, so a reader who needs a licence writes knowing why. */}
      <section id="license" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="rounded-2xl border border-accent/20 bg-surface shadow-card p-6 sm:p-8 md:p-10">
          <h2 className="mb-4 text-2xl sm:text-3xl font-bold tracking-tight">
            {t('license.title')}
          </h2>
          <p className="mb-6 max-w-3xl leading-relaxed text-muted">{t('license.description')}</p>
          <a
            href={LICENSING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
          >
            {t('license.link')}
            <ArrowRightIcon className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Final CTA — a mail link and Telegram, no form: there is no endpoint
          behind a form on this site, and a submit button that goes nowhere is
          worse than an address. */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-8 sm:p-12 text-center">
          <h2 className="mb-4 text-2xl sm:text-3xl font-bold tracking-tight">{t('cta.title')}</h2>
          <p className="mx-auto mb-8 max-w-xl text-muted">{t('cta.subtitle')}</p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={mailtoHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-8 py-4 text-lg font-medium text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90 transition-colors sm:w-auto"
            >
              <EnvelopeIcon className="h-5 w-5" />
              {t('cta.email')}
            </a>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-8 py-4 text-lg font-medium text-muted transition-colors hover:border-accent hover:text-accent sm:w-auto"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
              {t('cta.telegram')}
            </a>
          </div>
          <p className="mt-6 text-sm text-muted">{CONTACT_EMAIL}</p>
          <p className="mt-2 text-xs text-muted">{t('cta.finePrint')}</p>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
