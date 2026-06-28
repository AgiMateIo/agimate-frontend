import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Background gradient mesh */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F0EEE9] to-[#F8F7F5] dark:from-[#1a1715] dark:to-[#0f0e0d]" />
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#A47764]/30 dark:bg-[#A47764]/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#A47764]/20 dark:bg-[#A47764]/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="text-xl font-bold text-foreground">
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
