import type { Metadata } from 'next';

// A private host page for one view: never indexed, and reachable only with a
// session — the client guard sends everyone else to /login with the return path.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AgentViewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
