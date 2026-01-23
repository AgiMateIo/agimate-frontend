'use client';

import Link from 'next/link';
import { useUser } from '@/contexts/UserContext';
import {
  ChartBarIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

const features = [
  {
    icon: ChartBarIcon,
    title: 'Real-time Analytics',
    description: 'Track sales, orders, and revenue across all your marketplaces in one dashboard.',
  },
  {
    icon: BoltIcon,
    title: 'Smart Actions',
    description: 'AI-powered recommendations to optimize pricing, inventory, and listings.',
  },
  {
    icon: ChatBubbleLeftRightIcon,
    title: 'AI Assistant',
    description: 'Ask questions about your data and get instant insights in natural language.',
  },
];

export default function HomePage() {
  const { user, loading } = useUser();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-bold text-foreground">Agimate</div>
          <div className="flex items-center gap-4">
            {!loading && user ? (
              <Link
                href="/dashboard"
                className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            AI-Powered Analytics for
            <br />
            <span className="text-accent">Marketplace Sellers</span>
          </h1>
          <p className="text-lg text-muted max-w-2xl mx-auto mb-8">
            Unify your Ozon, Wildberries, and Yandex Market data. Get smart recommendations
            and automate your marketplace operations.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href={user ? '/dashboard' : '/login'}
              className="bg-accent text-accent-foreground px-6 py-3 rounded-lg font-medium hover:bg-accent/90 transition-colors flex items-center gap-2"
            >
              Get Started
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="#features"
              className="bg-surface-secondary text-foreground px-6 py-3 rounded-lg font-medium hover:bg-border transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Everything you need to scale
          </h2>
          <p className="text-muted max-w-xl mx-auto">
            Powerful tools to help you manage and grow your marketplace business.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-surface border border-border rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-accent rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-accent-foreground mb-4">
            Ready to optimize your marketplace?
          </h2>
          <p className="text-accent-foreground/80 mb-6 max-w-xl mx-auto">
            Join sellers who are already using Agimate to grow their business.
          </p>
          <Link
            href={user ? '/dashboard' : '/login'}
            className="inline-flex items-center gap-2 bg-white text-accent px-6 py-3 rounded-lg font-medium hover:bg-white/90 transition-colors"
          >
            Start Free Trial
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted">
              2024 Agimate. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm text-muted">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
