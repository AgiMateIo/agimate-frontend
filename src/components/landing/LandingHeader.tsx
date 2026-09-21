'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useUser } from '@/contexts/UserContext';
import { usePrimaryHref } from '@/contexts/PrimaryOriginContext';
import { ProviderIcon } from '@/components/auth/ProviderIcon';
import LocaleSwitcher from '@/components/ui/LocaleSwitcher';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';
import Logo from '@/components/ui/Logo';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

// The organisation, not one repository: the header is shared by every landing
// page, and their per-product repos are already linked from each page's footer.
const GITHUB_URL = 'https://github.com/AgiMateIo';

interface NavLink {
  href: string;
  label: string;
  // An anchor on the current page by default. `internal` marks a link to
  // another page of the site, which has to go through the locale-aware `Link`
  // — a bare `<a href="/business">` drops the prefix and sends an English
  // visitor to the Russian page via the proxy's redirect.
  internal?: boolean;
  // Last to leave the row. The section anchors are a convenience — the reader
  // can scroll — so they fold into the menu as soon as the row is tight (xl).
  // A link marked `priority` leads somewhere else and is the reason the header
  // has a nav at all, so it stays visible down to `md` and gives up only where
  // the wordmark and the login button would have to fight it for the row.
  priority?: boolean;
}

// Two widths, one rule: keep the priority link while it fits, drop the anchors
// first. Below `md` everything is in the dropdown, which is where a phone
// expects it anyway.
const ROW_LINK_CLASS = 'hidden xl:inline hover:text-foreground transition-colors';
const ROW_PRIORITY_LINK_CLASS = 'hidden md:inline hover:text-foreground transition-colors';

interface LandingHeaderProps {
  navLinks: NavLink[];
  loginLabel: string;
  dashboardLabel: string;
}

export default function LandingHeader({ navLinks, loginLabel, dashboardLabel }: LandingHeaderProps) {
  const t = useTranslations('Common');
  const { user, loading } = useUser();
  const loginHref = usePrimaryHref('/login');
  const dashboardHref = usePrimaryHref('/dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Close menu on resize past the breakpoint where the links are in the row (xl)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) setMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-md bg-background/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:gap-6">
        {/* Nothing in this row could shrink, so on a narrow phone its parts add
            up past the viewport and the page picks up a horizontal scroll — with
            the sticky header ending mid-scroll, which is how it shows up. The
            wordmark is the one part that may yield: min-w-0 lets it, the nav
            keeps its buttons intact. The gap on the row is the floor under that:
            a wordmark truncating to nothing still cannot end up against the nav.
            No overflow-hidden here — the theme and locale menus drop out of this
            box and would be clipped by it. */}
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2 text-xl font-bold tracking-tight hover:text-accent transition-colors"
        >
          <Logo className="h-6 w-auto shrink-0 text-accent transition-colors group-hover:text-foreground" />
          <span className="truncate">AgiMate</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-3 sm:gap-6 text-sm text-muted">
          {navLinks.map((link) => {
            const className = link.priority ? ROW_PRIORITY_LINK_CLASS : ROW_LINK_CLASS;
            return link.internal ? (
              <Link key={link.href} href={link.href} className={className}>
                {link.label}
              </Link>
            ) : (
              <a key={link.href} href={link.href} className={className}>
                {link.label}
              </a>
            );
          })}
          {/* The section anchors are hidden below xl, where the dropdown carries
              them instead. The row is a wordmark, every nav label, four controls
              and the login button, and only the wordmark may shrink: seven
              labels plus the controls overrun a 1024px laptop, let alone the
              tablet width these used to appear at, and the truncated wordmark
              then ran into them. One priority link and the controls do fit that
              row, which is why it leaves later. */}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('providers.github')}
            title={t('providers.github')}
            className="hidden xl:flex items-center rounded-lg bg-surface-secondary px-2 py-1 text-muted transition-colors hover:text-foreground"
          >
            <ProviderIcon provider="github" className="h-4 w-4" />
          </a>
          <ThemeSwitcher />
          <LocaleSwitcher />
          {!loading && user ? (
            <Link
              href={dashboardHref}
              className="whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              {dashboardLabel}
            </Link>
          ) : (
            <Link
              href={loginHref}
              className="whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              {loginLabel}
            </Link>
          )}
          {/* Hamburger button — mobile only */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="xl:hidden flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors"
            aria-label="Menu"
          >
            {menuOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
          </button>
        </nav>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="xl:hidden border-t border-border/40 bg-background/95 backdrop-blur-md"
        >
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-1">
            {navLinks.map((link) => {
              // A priority link is already in the row from `md` up, so the menu
              // stops listing it there rather than showing it twice.
              const className = `block rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-secondary transition-colors${
                link.priority ? ' md:hidden' : ''
              }`;
              return link.internal ? (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={className}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={className}
                >
                  {link.label}
                </a>
              );
            })}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
            >
              <ProviderIcon provider="github" className="h-4 w-4 shrink-0" />
              {t('providers.github')}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
