'use client';

import { useState, useRef, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { useUser } from '@/contexts/UserContext';
import LocaleSwitcher from '@/components/ui/LocaleSwitcher';
import Logo from '@/components/ui/Logo';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

interface NavLink {
  href: string;
  label: string;
}

interface LandingHeaderProps {
  navLinks: NavLink[];
  loginLabel: string;
  dashboardLabel: string;
}

export default function LandingHeader({ navLinks, loginLabel, dashboardLabel }: LandingHeaderProps) {
  const { user, loading } = useUser();
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

  // Close menu on resize past mobile breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) setMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-md bg-background/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-4">
        <Link
          href="/"
          className="group flex items-center gap-2 text-xl font-bold tracking-tight hover:text-accent transition-colors"
        >
          <Logo className="h-6 w-auto shrink-0 text-accent transition-colors group-hover:text-foreground" />
          AgiMate
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6 text-sm text-muted">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hidden sm:inline hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
          <LocaleSwitcher />
          {!loading && user ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              {dashboardLabel}
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              {loginLabel}
            </Link>
          )}
          {/* Hamburger button — mobile only */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="sm:hidden flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors"
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
          className="sm:hidden border-t border-border/40 bg-background/95 backdrop-blur-md"
        >
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
