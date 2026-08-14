'use client';

import { useEffect } from 'react';
import { captureReferralCode } from '@/utils/referral';

/**
 * Remembers a `?ref=` code from whatever page the invite link landed on.
 *
 * Renders nothing and sits in the locale layout: invite links point at the site
 * root, but a shared address can be any public page, and the code has to survive
 * until the visitor actually starts signing in.
 *
 * Reads `window.location` in an effect rather than `useSearchParams` on purpose —
 * the latter would opt the statically rendered landing pages out of prerendering.
 */
export default function ReferralCapture() {
  useEffect(() => {
    captureReferralCode(window.location.search);
  }, []);

  return null;
}
