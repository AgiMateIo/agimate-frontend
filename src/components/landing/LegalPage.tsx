'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingBackground from '@/components/landing/LandingBackground';
import LandingFooter from '@/components/landing/LandingFooter';
import WaitlistModal from '@/components/landing/WaitlistModal';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Shared shell for the Terms / Privacy pages. Both are placeholders on purpose:
// the copy states plainly that the binding wording is still being drafted and
// summarises how the product actually behaves today, rather than pretending to
// be a finished legal document.
export default function LegalPage({ namespace }: { namespace: 'Terms' | 'Privacy' }) {
  const t = useTranslations(namespace);
  const tHome = useTranslations('HomePage');
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  const sections = t.raw('sections') as Array<{ title: string; body: string }>;

  return (
    <div className="min-h-screen text-foreground">
      <LandingBackground />
      <WaitlistModal isOpen={isWaitlistOpen} onClose={() => setIsWaitlistOpen(false)} />

      <LandingHeader
        navLinks={[]}
        loginLabel={tHome('nav.login')}
        dashboardLabel={tHome('nav.dashboard')}
        onWaitlistClick={() => setIsWaitlistOpen(true)}
        waitlistLabel={tHome('nav.waitlist')}
      />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t('backHome')}
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t('title')}</h1>
          <span className="rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
            {t('draftBadge')}
          </span>
        </div>

        <p className="mt-4 rounded-xl border border-warning/20 bg-warning/5 p-4 text-sm leading-relaxed text-muted">
          {t('draftNotice')}
        </p>

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-2 text-lg font-semibold">{section.title}</h2>
              <p className="text-sm leading-relaxed text-muted">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-border/50 bg-surface shadow-card p-6">
          <h2 className="mb-2 text-lg font-semibold">{t('contactTitle')}</h2>
          <p className="text-sm leading-relaxed text-muted">
            {t('contactBody')}{' '}
            <a
              href="https://t.me/agimate"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {t('contactLink')}
            </a>
          </p>
        </div>
      </main>

      <LandingFooter
        copyright={tHome('footer.copyright')}
        links={[
          { label: tHome('footer.github'), href: 'https://github.com/AgiMateIo', external: true },
          { label: tHome('footer.telegram'), href: 'https://t.me/agimate', external: true },
          { label: tHome('footer.terms'), href: '/terms', localized: true },
          { label: tHome('footer.privacy'), href: '/privacy', localized: true },
        ]}
      />
    </div>
  );
}
