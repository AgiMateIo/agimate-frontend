import { useTranslations } from 'next-intl';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingBackground from '@/components/landing/LandingBackground';
import LandingFooter from '@/components/landing/LandingFooter';
import RuStoreBadge from '@/components/landing/RuStoreBadge';
import {
  ArrowTopRightOnSquareIcon,
  BellAlertIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  PaperClipIcon,
  SparklesIcon,
  UserCircleIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

const GITHUB_URL = 'https://github.com/AgiMateIo/agimate-chat-android';
// The APK's file name carries the version, so link the release page, not the file.
const RELEASES_URL = `${GITHUB_URL}/releases/latest`;

// The phone client of the platform. Not to be confused with /android-connector, the
// connector that turns a phone into the agent's event source.
export default function AndroidChatPage() {
  const t = useTranslations('AndroidChatPage');

  const features = [
    { key: 'contacts', icon: UsersIcon },
    { key: 'conversations', icon: ChatBubbleLeftRightIcon },
    { key: 'progress', icon: SparklesIcon },
    { key: 'files', icon: PaperClipIcon },
    { key: 'push', icon: BellAlertIcon },
    { key: 'account', icon: UserCircleIcon },
  ] as const;

  const steps = t.raw('start.steps') as Array<{ title: string; description: string }>;

  return (
    <div className="min-h-screen text-foreground">
      <LandingBackground />

      <LandingHeader />

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
        <div className="mt-10 flex justify-center">
          <RuStoreBadge caption={t('badgeCaption')} />
        </div>
        <p className="mt-4 text-sm text-muted">
          {t('hero.note')} ·{' '}
          <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            {t('hero.apk')}
          </a>
        </p>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">{t('features.title')}</h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">{t('features.subtitle')}</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="rounded-2xl border border-border/50 bg-surface shadow-card p-4 sm:p-6 transition-colors hover:border-accent/30"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">{t(`features.items.${key}.title`)}</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted">{t(`features.items.${key}.description`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Getting started */}
      <section id="start" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold tracking-tight">{t('start.title')}</h2>
        <p className="mx-auto mb-8 sm:mb-10 md:mb-14 max-w-xl text-center text-muted">{t('start.subtitle')}</p>
        <div className="mx-auto max-w-2xl space-y-6">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-sm">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-12 flex max-w-2xl items-start gap-4 rounded-2xl border border-border/50 bg-surface shadow-card p-4 sm:p-6">
          <Cog6ToothIcon className="h-6 w-6 shrink-0 text-muted" />
          <div>
            <h3 className="font-semibold">{t('setup.title')}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{t('setup.description')}</p>
          </div>
        </div>
      </section>

      {/* Download */}
      <section id="download" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="text-center">
          <h2 className="mb-4 text-2xl sm:text-3xl font-bold tracking-tight">{t('download.title')}</h2>
          <p className="mx-auto mb-10 max-w-md text-muted">{t('download.subtitle')}</p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <RuStoreBadge caption={t('badgeCaption')} />
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-7 py-3.5 font-medium text-foreground hover:bg-surface-secondary transition-colors w-full sm:w-auto justify-center"
            >
              {t('download.apk')}
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-7 py-3.5 font-medium text-foreground hover:bg-surface-secondary transition-colors w-full sm:w-auto justify-center"
            >
              {t('download.source')}
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <LandingFooter githubUrl={GITHUB_URL} />
    </div>
  );
}
