import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import Logo from '@/components/ui/Logo';
import LandingBackground from '@/components/landing/LandingBackground';

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Was a near-copy of LandingBackground; sharing it keeps the auth pages
          from drifting apart from the landing ones every time it is touched. */}
      <LandingBackground />

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Logo className="h-6 w-auto shrink-0 text-accent" />
            AgiMate
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
  );
}
