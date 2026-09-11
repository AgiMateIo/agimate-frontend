import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

const ORG_GITHUB_URL = 'https://github.com/AgiMateIo';
const TELEGRAM_URL = 'https://t.me/agimate';

interface LandingFooterProps {
  // A product page points GitHub at its own repository; everything else
  // links the organisation. The rest of the row is the same on every page.
  githubUrl?: string;
}

export default function LandingFooter({ githubUrl = ORG_GITHUB_URL }: LandingFooterProps) {
  const t = useTranslations('Common');
  // Current year at render time: a fixed year in the messages went stale
  // every January. Around midnight on New Year's Eve the server and the
  // client may disagree by one — not worth a mismatch warning.
  const year = new Date().getFullYear();
  const external = [
    { label: t('footer.github'), href: githubUrl },
    { label: t('footer.telegram'), href: TELEGRAM_URL },
  ];
  const internal = [
    { label: t('footer.docs'), href: '/docs' },
    { label: t('footer.terms'), href: '/terms' },
    { label: t('footer.privacy'), href: '/privacy' },
  ];
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:px-6 py-8 sm:flex-row">
        <span className="text-sm text-muted" suppressHydrationWarning>
          {t('copyright', { year })}
        </span>
        {/* Wraps, and that is the whole point: six labels in a row that cannot
            break add up to ~600px of min-content, which no phone has. Without
            the wrap the row pushed the page wider than the viewport, and the
            sticky header — sized to the viewport — ended mid-scroll. */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
          {external.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
          {internal.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground transition-colors">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
