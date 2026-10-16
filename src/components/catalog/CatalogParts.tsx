import { Link } from '@/i18n/navigation';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import type { CatalogConnectorRef } from '@/types';

export function CatalogBreadcrumb({
  parentHref,
  parentLabel,
  current,
}: {
  parentHref: '/catalog/agents' | '/catalog/skills';
  parentLabel: string;
  current: string;
}) {
  return (
    <nav className="mb-8 flex min-w-0 items-center gap-1.5 text-sm text-muted">
      <Link href={parentHref} className="shrink-0 hover:text-foreground transition-colors">
        {parentLabel}
      </Link>
      <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate text-foreground">{current}</span>
    </nav>
  );
}

// The heading of a catalog list, with the switch between the two lists.
export function CatalogHero({
  active,
  title,
  subtitle,
  tabs,
}: {
  active: 'agents' | 'skills';
  title: string;
  subtitle: string;
  tabs: { label: string; agents: string; skills: string };
}) {
  const tab = (key: 'agents' | 'skills', label: string) => (
    <Link
      href={`/catalog/${key}`}
      aria-current={active === key ? 'page' : undefined}
      className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
        active === key ? 'bg-accent text-accent-foreground' : 'text-muted hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  );
  return (
    <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 text-center sm:px-6 sm:pt-16 md:pt-24">
      <nav
        aria-label={tabs.label}
        className="mb-8 inline-flex rounded-full border border-border/50 bg-surface p-1 shadow-card"
      >
        {tab('agents', tabs.agents)}
        {tab('skills', tabs.skills)}
      </nav>
      <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{title}</h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">{subtitle}</p>
    </section>
  );
}

// A titled block of an entity page.
export function CatalogSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/50 bg-surface p-6 shadow-card">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

// A connector has no page — its name and what it connects to are the whole entry.
export function ConnectorList({
  connectors,
  empty,
}: {
  connectors: CatalogConnectorRef[];
  empty: string;
}) {
  if (connectors.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {connectors.map((c) => (
        <li key={c.code}>
          <p className="font-medium">{c.name}</p>
          {c.description && <p className="mt-0.5 text-sm leading-relaxed text-muted">{c.description}</p>}
        </li>
      ))}
    </ul>
  );
}
