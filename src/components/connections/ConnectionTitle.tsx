'use client';

import { useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { CheckIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { getErrorMessage } from '@/utils/error';

interface ConnectionTitleProps {
  name: string | null;
  // Stands in for a missing name — the connection's full code.
  fallback: string;
  // Rejects on failure; the caller's mutation owns the optimistic update.
  onSave: (name: string) => Promise<unknown>;
}

// The name is the only editable field a connection has, so it is edited in
// place instead of through a modal. The pencil is always visible below `md`:
// a touch screen has no hover to reveal it with.
export default function ConnectionTitle({ name, fallback, onSave }: ConnectionTitleProps) {
  const t = useTranslations('Connections');
  const tCommon = useTranslations('Common');

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const startEditing = () => {
    setDraft(name ?? '');
    setError('');
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError('');
  };

  const save = async () => {
    const value = draft.trim();
    // The API models the name as `name?: string`, so there is no way to clear
    // one — an empty field is not a save, and the confirm button says so by
    // staying disabled.
    if (!value || saving) return;
    if (value === name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(value);
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err, t('updateError')));
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            // The field only exists because the user just asked to edit it, so
            // taking focus is the request, not a hijack.
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving}
            maxLength={100}
            placeholder={fallback}
            aria-label={t('name')}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface-secondary px-2 py-1 text-2xl font-bold text-foreground placeholder:font-normal placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          />
          <button
            type="button"
            onClick={save}
            disabled={!draft.trim() || saving}
            aria-label={tCommon('save')}
            className="shrink-0 rounded-lg p-2 text-muted transition-colors hover:bg-surface-secondary hover:text-success disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
          >
            <CheckIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            aria-label={tCommon('cancel')}
            className="shrink-0 rounded-lg p-2 text-muted transition-colors hover:bg-surface-secondary hover:text-foreground disabled:opacity-40"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        {error && <ErrorAlert>{error}</ErrorAlert>}
      </div>
    );
  }

  return (
    <div className="group/title flex items-center gap-2">
      <h1 className="truncate text-2xl font-bold text-foreground">{name || fallback}</h1>
      <button
        type="button"
        onClick={startEditing}
        aria-label={tCommon('edit')}
        className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surface-secondary hover:text-foreground md:opacity-0 md:group-hover/title:opacity-100 md:focus-visible:opacity-100"
      >
        <PencilIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
