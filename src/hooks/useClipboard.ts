import { useState, useCallback } from 'react';
import { copyToClipboard } from '@/utils/clipboard';

interface UseClipboardOptions {
  timeout?: number; // How long to show "Copied!" state
}

export function useClipboard(options: UseClipboardOptions = {}) {
  const { timeout = 2000 } = options;
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      const success = await copyToClipboard(text);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), timeout);
      }
      return success;
    },
    [timeout]
  );

  return { copied, copy };
}
