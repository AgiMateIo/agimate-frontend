import { Link } from '@/i18n/navigation';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
  // Internal route that needs the locale prefix (/terms → /ru/terms).
  localized?: boolean;
}

interface LandingFooterProps {
  copyright: string;
  links: FooterLink[];
}

export default function LandingFooter({ copyright, links }: LandingFooterProps) {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:px-6 py-8 sm:flex-row">
        <span className="text-sm text-muted">{copyright}</span>
        {/* Wraps, and that is the whole point: six labels in a row that cannot
            break add up to ~600px of min-content, which no phone has. Without
            the wrap the row pushed the page wider than the viewport, and the
            sticky header — sized to the viewport — ended mid-scroll. */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
          {links.map((link) =>
            link.localized ? (
              <Link
                key={link.label}
                href={link.href}
                className="hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            )
          )}
        </div>
      </div>
    </footer>
  );
}
