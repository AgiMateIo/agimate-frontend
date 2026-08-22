'use client';

import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { CheckIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { getDetailedErrorMessage } from '@/utils/error';

// Editing in place, one field at a time, instead of a form behind an "edit"
// button: a page that already shows every value does not need a second screen
// that shows them again as inputs, and a per-field save keeps a typo in the
// prompt from blocking a rename.
//
// The pencil is always visible below `md` — a touch screen has no hover to
// reveal it with.

interface InlineEditState<T> {
  editing: boolean;
  draft: T;
  setDraft: (next: T) => void;
  saving: boolean;
  error: string;
  start: () => void;
  cancel: () => void;
  save: () => void;
}

function useInlineEdit<T>(
  value: T,
  onSave: (next: T) => Promise<unknown>,
  defaultError: string,
  canSave: (draft: T) => boolean
): InlineEditState<T> {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<T>(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const start = () => {
    setDraft(value);
    setError('');
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError('');
  };

  const save = async () => {
    if (saving || !canSave(draft)) return;
    // Opening the editor and closing it unchanged is not a request to write.
    // Structural compare rather than `===`: the type editor's draft is an
    // object rebuilt on every keystroke.
    if (JSON.stringify(draft) === JSON.stringify(value)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      setError(getDetailedErrorMessage(err, defaultError));
    } finally {
      setSaving(false);
    }
  };

  return { editing, draft, setDraft, saving, error, start, cancel, save };
}

interface EditorArgs<T> {
  draft: T;
  setDraft: (next: T) => void;
  disabled: boolean;
  /** Wire onto the editor to let Escape cancel. */
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}

interface InlineEditFieldProps<T> {
  label: string;
  value: T;
  /** Rejects on failure; the caller's mutation owns the optimistic update. */
  onSave: (next: T) => Promise<unknown>;
  /** Shown when the save call gives nothing better. */
  defaultError: string;
  children: ReactNode;
  editor: (args: EditorArgs<T>) => ReactNode;
  /** Blocks the confirm button — required fields say so by staying disabled. */
  canSave?: (draft: T) => boolean;
  /** Sits under the value, in both modes. */
  hint?: ReactNode;
}

/** A labelled block of the detail page, editable in place. */
export function InlineEditField<T>({
  label,
  value,
  onSave,
  defaultError,
  children,
  editor,
  canSave = () => true,
  hint,
}: InlineEditFieldProps<T>) {
  const tCommon = useTranslations('Common');
  const state = useInlineEdit(value, onSave, defaultError, canSave);

  // Escape only. Every editor this hosts is a textarea or a composite, where
  // Enter belongs to the field — Enter-to-save lives in InlineEditTitle instead.
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      state.cancel();
    }
  };

  return (
    <div className="group/field">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-medium text-muted">{label}</h3>
        {!state.editing && (
          <button
            type="button"
            onClick={state.start}
            aria-label={`${tCommon('edit')}: ${label}`}
            className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surface-secondary hover:text-foreground md:opacity-0 md:group-hover/field:opacity-100 md:focus-visible:opacity-100"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {state.editing ? (
        <div className="space-y-3">
          {editor({
            draft: state.draft,
            setDraft: state.setDraft,
            disabled: state.saving,
            onKeyDown,
          })}
          {state.error && <ErrorAlert>{state.error}</ErrorAlert>}
          <div className="flex gap-2">
            <Button
              onClick={state.save}
              loading={state.saving}
              disabled={state.saving || !canSave(state.draft)}
              className="!py-1.5 text-sm"
            >
              {tCommon('save')}
            </Button>
            <Button
              variant="secondary"
              onClick={state.cancel}
              disabled={state.saving}
              className="!py-1.5 text-sm"
            >
              {tCommon('cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {children}
          {hint}
        </>
      )}
    </div>
  );
}

interface InlineEditTitleProps {
  value: string;
  /** Stands in for an empty value, as placeholder and as displayed text. */
  fallback?: string;
  onSave: (next: string) => Promise<unknown>;
  defaultError: string;
  ariaLabel: string;
  maxLength?: number;
  /** Rendered left of the title in both modes — an avatar, a logo. */
  leading?: ReactNode;
  /** Rendered under the title when not editing. */
  children?: ReactNode;
  /** Placement in the caller's layout — the root element in both modes. */
  className?: string;
}

/** The page's h1, editable in place. Confirm and cancel sit inline with it. */
export function InlineEditTitle({
  value,
  fallback = '',
  onSave,
  defaultError,
  ariaLabel,
  maxLength = 100,
  leading,
  children,
  className = '',
}: InlineEditTitleProps) {
  const tCommon = useTranslations('Common');
  const state = useInlineEdit(
    value,
    // A title is a label, never a body of text: surrounding whitespace is a
    // typo, not content, and is dropped before the value leaves the screen.
    (draft) => onSave(draft.trim()),
    defaultError,
    (draft) => draft.trim().length > 0
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      state.save();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      state.cancel();
    }
  };

  if (state.editing) {
    return (
      <div className={`min-w-0 space-y-2 ${className}`}>
        <div className="flex items-center gap-2">
          {leading}
          <input
            // The field only exists because the user just asked to edit it, so
            // taking focus is the request, not a hijack.
            autoFocus
            value={state.draft}
            onChange={(e) => state.setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={state.saving}
            maxLength={maxLength}
            placeholder={fallback}
            aria-label={ariaLabel}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface-secondary px-2 py-1 text-2xl font-bold text-foreground placeholder:font-normal placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          />
          <button
            type="button"
            onClick={state.save}
            disabled={!state.draft.trim() || state.saving}
            aria-label={tCommon('save')}
            className="shrink-0 rounded-lg p-2 text-muted transition-colors hover:bg-surface-secondary hover:text-success disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
          >
            <CheckIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={state.cancel}
            disabled={state.saving}
            aria-label={tCommon('cancel')}
            className="shrink-0 rounded-lg p-2 text-muted transition-colors hover:bg-surface-secondary hover:text-foreground disabled:opacity-40"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        {state.error && <ErrorAlert>{state.error}</ErrorAlert>}
      </div>
    );
  }

  return (
    <div className={`group/title flex min-w-0 items-center gap-3 ${className}`}>
      {leading}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-2xl font-bold text-foreground">{value || fallback}</h1>
          <button
            type="button"
            onClick={state.start}
            aria-label={tCommon('edit')}
            className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surface-secondary hover:text-foreground md:opacity-0 md:group-hover/title:opacity-100 md:focus-visible:opacity-100"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
