'use client';

import { Link } from '@/i18n/navigation';
import {
  ArrowLeftIcon,
  ChevronUpDownIcon,
  CheckIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

export type ContextSection = {
  key: string;
  href: string;
  label: string;
  icon: IconComponent;
};

export type ContextSwitcherItem = {
  id: string;
  name: string;
  avatarUrl?: string;
};

// Entity avatar: image when the entity has one, otherwise the section's fallback icon.
function EntityAvatar({
  avatarUrl,
  fallbackIcon: FallbackIcon,
  name,
  sizeClass,
  roundedClass,
}: {
  avatarUrl?: string;
  fallbackIcon: IconComponent;
  name: string;
  sizeClass: string;
  roundedClass: string;
}) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${sizeClass} shrink-0 ${roundedClass}`} />;
  }
  return (
    <span
      className={`grid ${sizeClass} shrink-0 place-items-center ${roundedClass} bg-accent/10 text-accent`}
    >
      <FallbackIcon className="h-[65%] w-[65%]" />
    </span>
  );
}

// Contextual sidebar shell shared by entity sections (agents, agentic teams): a back
// link with an optional inline create action, an entity switcher, and section links.
// Purely presentational — wrappers own route config and data fetching (the entity and
// the lazily-fetched switcher list).
export default function ContextNav({
  collapsed,
  backHref,
  backLabel,
  createHref,
  createLabel,
  name,
  avatarUrl,
  fallbackIcon,
  status,
  sections,
  currentSection,
  switcher,
}: {
  collapsed: boolean;
  backHref: string;
  backLabel: string;
  createHref?: string;
  createLabel?: string;
  name?: string; // undefined while the entity loads
  avatarUrl?: string;
  fallbackIcon: IconComponent;
  status?: { on: boolean; label: string };
  sections: ContextSection[];
  currentSection: string;
  switcher: {
    label: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: ContextSwitcherItem[];
    currentId: string;
    onSelect: (id: string) => void;
  };
}) {
  const backLink = (
    <div className="group/item relative flex items-center">
      <Link
        href={backHref}
        title={collapsed ? backLabel : undefined}
        className={`relative flex flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-secondary hover:text-foreground ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        <ArrowLeftIcon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{backLabel}</span>}
        {collapsed && (
          <span className="pointer-events-none absolute left-full z-20 ml-2 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-lg group-hover/item:block">
            {backLabel}
          </span>
        )}
      </Link>
      {!collapsed && createHref && (
        <Link
          href={createHref}
          title={createLabel}
          aria-label={createLabel}
          className="absolute right-1.5 grid h-6 w-6 place-items-center rounded-md text-muted transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <PlusIcon className="h-4 w-4" />
        </Link>
      )}
    </div>
  );

  const sectionLinks = (
    <div className="space-y-0.5">
      {sections.map(({ key, href, label, icon: Icon }) => {
        const isActive = currentSection === key;
        return (
          <Link
            key={key}
            href={href}
            title={collapsed ? label : undefined}
            className={`group/item relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors
              ${collapsed ? 'justify-center' : ''}
              ${isActive ? 'bg-accent text-accent-foreground' : 'text-muted hover:bg-surface-secondary hover:text-foreground'}`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
            {collapsed && (
              <span className="pointer-events-none absolute left-full z-20 ml-2 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-lg group-hover/item:block">
                {label}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );

  if (collapsed) {
    return (
      <div className="space-y-2">
        {backLink}
        {name && (
          <div className="group/item relative flex justify-center py-1">
            <EntityAvatar
              avatarUrl={avatarUrl}
              fallbackIcon={fallbackIcon}
              name={name}
              sizeClass="h-8 w-8"
              roundedClass="rounded-lg"
            />
            <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-lg group-hover/item:block">
              {name}
            </span>
          </div>
        )}
        <div className="mx-2 h-px bg-border" />
        {sectionLinks}
      </div>
    );
  }

  return (
    <div>
      {backLink}

      {/* Entity switcher */}
      <div className="relative mt-2 mb-3">
        <button
          type="button"
          onClick={() => switcher.onOpenChange(!switcher.open)}
          aria-label={switcher.label}
          aria-expanded={switcher.open}
          className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface-secondary px-2.5 py-2 text-left transition-colors hover:border-accent"
        >
          {name ? (
            <EntityAvatar
              avatarUrl={avatarUrl}
              fallbackIcon={fallbackIcon}
              name={name}
              sizeClass="h-7 w-7"
              roundedClass="rounded-md"
            />
          ) : (
            <span className="h-7 w-7 shrink-0 animate-pulse rounded-md bg-border" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold text-foreground">
              {name ?? '…'}
            </span>
            {status && (
              <span className="flex items-center gap-1 text-[11px] text-muted">
                <span className={`h-1.5 w-1.5 rounded-full ${status.on ? 'bg-success' : 'bg-muted'}`} />
                {status.label}
              </span>
            )}
          </span>
          <ChevronUpDownIcon className="h-4 w-4 shrink-0 text-muted" />
        </button>

        {switcher.open && (
          <>
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={() => switcher.onOpenChange(false)}
              className="fixed inset-0 z-20 cursor-default"
            />
            <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg">
              {switcher.items.map((item) => {
                const isCurrent = item.id === switcher.currentId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => switcher.onSelect(item.id)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-surface-secondary ${
                      isCurrent ? 'text-muted' : 'text-foreground'
                    }`}
                  >
                    <EntityAvatar
                      avatarUrl={item.avatarUrl}
                      fallbackIcon={fallbackIcon}
                      name={item.name}
                      sizeClass="h-6 w-6"
                      roundedClass="rounded"
                    />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    {isCurrent && <CheckIcon className="h-4 w-4 shrink-0 text-accent" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {sectionLinks}
    </div>
  );
}
