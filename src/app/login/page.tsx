'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import apiService from '@/services/api';
import { useUser } from '@/contexts/UserContext';

const getApiBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://api.agimate.lc:8000/';
};

export default function LoginPage() {
  const router = useRouter();
  const { fetchUser } = useUser();
  const hasRun = useRef(false);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (hasRun.current) return;
      hasRun.current = true;

      if (typeof window !== 'undefined') {
        const hash = window.location.hash.substring(1);

        if (hash) {
          try {
            const success = await apiService.refreshAuthTokens(hash);

            if (success) {
              await fetchUser();
              router.replace('/dashboard');
            }
          } catch (error) {
            console.error('OAuth callback error:', error);
          }
        }
      }
    };

    handleOAuthCallback();
  }, [router, fetchUser]);

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
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome back</h1>
            <p className="text-muted text-sm">Sign in to access your dashboard</p>
          </div>

          <div className="space-y-3">
            <a
              href={`${getApiBaseUrl()}user-api/oauth2/authorization/google`}
              className="w-full bg-surface-secondary hover:bg-border text-foreground border border-border py-3 px-4 rounded-lg flex items-center justify-center font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </a>

            <a
              href={`${getApiBaseUrl()}user-api/oauth2/authorization/yandex`}
              className="w-full bg-surface-secondary hover:bg-border text-foreground border border-border py-3 px-4 rounded-lg flex items-center justify-center font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#FF0000" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 15.563h-2.788V8.375h-2.063c-2.625 0-4.313-1.5-4.313-3.938 0-2.438 1.688-3.875 4.313-3.875h4.851v2.25h-4.5c-1.313 0-2.063.75-2.063 1.625 0 .875.75 1.688 2.063 1.688h1.5c.563 0 .938.375.938.938v9.5z"/>
              </svg>
              Continue with Yandex
            </a>
          </div>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-muted text-xs">
              By continuing, you agree to our{' '}
              <a href="#" className="text-accent hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-accent hover:underline">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
