import type { ReactNode } from 'react';

// The panel every out-of-app auth screen sits in — sign in, register, reset a
// password. One file so the six of them cannot drift apart.
export default function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surface/80 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm p-8 max-w-md w-full">
      {children}
    </div>
  );
}
