'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useUser();

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="text-xl font-bold text-foreground">
            Agimate
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-surface border border-border rounded-xl shadow-sm p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Sign out</h1>
            <p className="text-muted text-sm">Are you sure you want to sign out?</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full bg-error text-white py-3 px-4 rounded-lg font-medium hover:bg-error/90 transition-colors"
            >
              Yes, sign out
            </button>

            <button
              onClick={() => router.back()}
              className="w-full bg-surface-secondary text-foreground border border-border py-3 px-4 rounded-lg font-medium hover:bg-border transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Go back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
