import { Suspense } from 'react';
import AgentViewClient from './AgentViewClient';

export default function AgentViewPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AgentViewClient />
    </Suspense>
  );
}

function FullScreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <span
        className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent"
        aria-hidden="true"
      />
    </div>
  );
}
