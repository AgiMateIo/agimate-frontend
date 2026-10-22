'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useUser } from '@/contexts/UserContext';
import { usePrimaryHref } from '@/contexts/PrimaryOriginContext';
import LocaleSwitcher from '@/components/ui/LocaleSwitcher';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';
import Logo from '@/components/ui/Logo';
import { Bars3Icon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

// Site navigation, the same on every public page. Deliberately no section
// anchors: they made the header a table of contents of whichever page it was
// on, eight items long on the home page, and those pages read by scrolling.
const APPS = [
  { href: '/android-chat', label: 'androidChat', hint: 'androidChatHint' },
  { href: '/android-connector', label: 'android', hint: 'androidHint' },
  { href: '/desktop-connector', label: 'desktop', hint: 'desktopHint' },
  { href: '/n8n', label: 'n8n', hint: 'n8nHint' },
] as const;

const LINKS = [
  { href: '/catalog/agents', section: '/catalog', label: 'catalog' },
  { href: '/business', section: '/business', label: 'business' },
  { href: '/docs', section: '/docs', label: 'docs' },
] as const;

const inSection = (pathname: string, section: string) =>
  pathname === section || pathname.startsWith(`${section}/`);

const ROW_LINK_CLASS = 'transition-colors hover:text-foreground';
const MENU_LINK_CLASS =
  'block rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-secondary hover:text-foreground';

// Closes a dropdown on a click anywhere outside `ref`.
function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, close]);
  return ref;
}

export default function LandingHeader() {
  const t = useTranslations('Common.nav');
  const pathname = usePathname();
  const { user, loading } = useUser();
  const loginHref = usePrimaryHref('/login');
  const dashboardHref = usePrimaryHref('/dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const menuRef = useOutsideClose(menuOpen, () => setMenuOpen(false));
  const appsRef = useOutsideClose(appsOpen, () => setAppsOpen(false));

  // The row carries the links from `md` up; past it the dropdown has no business.
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const appsActive = APPS.some((app) => inSection(pathname, app.href));
  const current = (active: boolean) => (active ? 'text-foreground' : '');

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-md bg-background/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:gap-6">
        {/* The wordmark is the one part of the row that may shrink (min-w-0):
            everything else keeps its size, and a row that cannot yield pushes
            the page into a horizontal scroll on a narrow phone. No
            overflow-hidden — the dropdowns hang out of this box. */}
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2 text-xl font-bold tracking-tight hover:text-accent transition-colors"
        >
          <Logo className="h-6 w-auto shrink-0 text-accent transition-colors group-hover:text-foreground" />
          <span className="truncate">AgiMate</span>
        </Link>

        <nav className="hidden items-center gap-4 text-sm text-muted md:flex lg:gap-6">
          <Link
            href={LINKS[0].href}
            aria-current={inSection(pathname, LINKS[0].section) ? 'page' : undefined}
            className={`${ROW_LINK_CLASS} ${current(inSection(pathname, LINKS[0].section))}`}
          >
            {t(LINKS[0].label)}
          </Link>
          <div ref={appsRef} className="relative">
            <button
              type="button"
              onClick={() => setAppsOpen((v) => !v)}
              aria-expanded={appsOpen}
              className={`flex items-center gap-1 ${ROW_LINK_CLASS} ${current(appsActive)}`}
            >
              {t('apps')}
              <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${appsOpen ? 'rotate-180' : ''}`} />
            </button>
            {appsOpen && (
              <div className="absolute left-1/2 z-50 mt-3 w-72 -translate-x-1/2 rounded-xl border border-border bg-surface p-2 shadow-lg">
                {APPS.map((app) => (
                  <Link
                    key={app.href}
                    href={app.href}
                    onClick={() => setAppsOpen(false)}
                    aria-current={inSection(pathname, app.href) ? 'page' : undefined}
                    className="block rounded-lg px-3 py-2 transition-colors hover:bg-surface-secondary"
                  >
                    <span className="block text-sm font-medium text-foreground">{t(app.label)}</span>
                    <span className="block text-xs text-muted">{t(app.hint)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          {LINKS.slice(1).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={inSection(pathname, link.section) ? 'page' : undefined}
              className={`${ROW_LINK_CLASS} ${current(inSection(pathname, link.section))}`}
            >
              {t(link.label)}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3 text-sm sm:gap-4">
          <ThemeSwitcher />
          <LocaleSwitcher />
          {!loading && user ? (
            <Link
              href={dashboardHref}
              className="whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              {t('dashboard')}
            </Link>
          ) : (
            <Link
              href={loginHref}
              className="whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              {t('login')}
            </Link>
          )}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors"
            aria-label={t('menu')}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Phone menu: the same links, apps listed under their heading. Right-
          aligned, under the button that opened it. */}
      {menuOpen && (
        <div ref={menuRef} className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-col items-end gap-1 px-4 py-3 text-right sm:px-6">
            <Link href={LINKS[0].href} onClick={() => setMenuOpen(false)} className={MENU_LINK_CLASS}>
              {t(LINKS[0].label)}
            </Link>
            <span className="px-3 pt-2 text-xs uppercase tracking-wide text-muted/70">{t('apps')}</span>
            {APPS.map((app) => (
              <Link key={app.href} href={app.href} onClick={() => setMenuOpen(false)} className={MENU_LINK_CLASS}>
                {t(app.label)}
              </Link>
            ))}
            <span className="my-1 h-px w-24 bg-border/60" />
            {LINKS.slice(1).map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={MENU_LINK_CLASS}>
                {t(link.label)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
