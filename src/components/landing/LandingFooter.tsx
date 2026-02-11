interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface LandingFooterProps {
  copyright: string;
  links: FooterLink[];
}

export default function LandingFooter({ copyright, links }: LandingFooterProps) {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:px-6 py-8 sm:flex-row">
        <span className="text-sm text-muted">{copyright}</span>
        <div className="flex items-center gap-6 text-sm text-muted">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
