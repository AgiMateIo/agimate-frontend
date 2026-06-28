'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface ConfirmDeleteModalProps {
  /** Modal heading. */
  title: string;
  /** Body content: confirmation text and any warning Alert(s). */
  children: React.ReactNode;
  /** Label for the destructive confirm button. */
  confirmLabel: string;
  /** Label for the cancel button. */
  cancelLabel: string;
  /** Async action to run on confirm. Errors are surfaced via ErrorAlert. */
  onConfirm: () => Promise<void>;
  onClose: () => void;
  /** Called after onConfirm resolves successfully. */
  onSuccess: () => void;
  /** Fallback message when the action throws a non-Error. */
  defaultError?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Render full-width split buttons (flex-1) instead of right-aligned ones. */
  fullWidthButtons?: boolean;
  /** Prevent closing (backdrop / X) while the action is in flight. */
  blockCloseWhileLoading?: boolean;
  /** Variant for the confirm button (default 'danger'). */
  confirmVariant?: 'danger' | 'warning';
}

/**
 * Shared confirmation modal for destructive actions (delete / unbind).
 *
 * Owns the Modal + form + useAsyncForm wiring + error display + cancel/confirm
 * buttons. Callers supply only the title, labels, the async action, and the
 * body (confirmation text + any warning Alert).
 */
export function ConfirmDeleteModal({
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
  onSuccess,
  defaultError = 'Failed to delete',
  size,
  fullWidthButtons = false,
  blockCloseWhileLoading = false,
  confirmVariant = 'danger',
}: ConfirmDeleteModalProps) {
  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError,
  });

  const onSubmit = (e: React.FormEvent) => handleSubmit(e, onConfirm);
  const blockClose = blockCloseWhileLoading && loading;

  return (
    <Modal
      isOpen={true}
      onClose={blockClose ? () => {} : onClose}
      title={title}
      size={size}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {children}

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className={`flex gap-3 pt-2 ${fullWidthButtons ? '' : 'justify-end'}`}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className={fullWidthButtons ? 'flex-1' : ''}
          >
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            variant={confirmVariant}
            loading={loading}
            disabled={loading}
            className={fullWidthButtons ? 'flex-1' : ''}
          >
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
