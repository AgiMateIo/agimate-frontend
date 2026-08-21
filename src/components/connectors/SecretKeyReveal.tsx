'use client';

import { useTranslations } from 'next-intl';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { useClipboard } from '@/hooks/useClipboard';

interface SecretKeyRevealProps {
  /** The one-time secret value to display and copy. */
  secret: string;
  /** Called when the user clicks the Done button. */
  onDone: () => void;
  /** Field label above the key. Defaults to the generic "App Key". */
  label?: string;
  /** Extra content rendered between the key field and the Done button. */
  children?: React.ReactNode;
}

export default function SecretKeyReveal({ secret, onDone, label, children }: SecretKeyRevealProps) {
  const t = useTranslations('Connectors');
  const tCommon = useTranslations('Common');
  const { copied, copy } = useClipboard();

  return (
    <div className="space-y-4">
      <Alert variant="warning">
        <p className="font-medium">
          {t('saveKeyWarning')}
        </p>
        <p className="text-xs mt-1">
          {t('saveKeyWarningDetail')}
        </p>
      </Alert>

      <FormField label={label ?? t('appKey')}>
        <div className="flex gap-2">
          <Input
            type="text"
            value={secret}
            readOnly
            className="flex-1 font-mono text-sm select-all"
          />
          <Button onClick={() => copy(secret)} className="flex items-center gap-2 whitespace-nowrap">
            {copied ? (
              <>
                <CheckIcon className="h-5 w-5" />
                {tCommon('copied')}
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="h-5 w-5" />
                {tCommon('copy')}
              </>
            )}
          </Button>
        </div>
      </FormField>

      {children}

      <Button onClick={onDone} className="w-full">
        {t('done')}
      </Button>
    </div>
  );
}
