'use client';

import { useTranslations } from 'next-intl';
import { InlineEditTitle } from '@/components/ui/InlineEdit';

interface ConnectionTitleProps {
  name: string | null;
  // Stands in for a missing name — the connection's full code.
  fallback: string;
  // Rejects on failure; the caller's mutation owns the optimistic update.
  onSave: (name: string) => Promise<unknown>;
}

// The name is the only editable field a connection has, so it is edited in
// place instead of through a modal. The mechanics live in InlineEditTitle,
// which the agent header uses too; what stays here is the connection's own
// copy and the one rule the shared component cannot know: the API models the
// name as `name?: string`, so there is no way to clear one, and an empty field
// is not a save — the confirm button says so by staying disabled.
export default function ConnectionTitle({ name, fallback, onSave }: ConnectionTitleProps) {
  const t = useTranslations('Connections');

  return (
    <InlineEditTitle
      value={name ?? ''}
      fallback={fallback}
      onSave={onSave}
      defaultError={t('updateError')}
      ariaLabel={t('name')}
    />
  );
}
